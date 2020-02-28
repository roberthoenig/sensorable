#include <iostream>
#include <algorithm>

#include <json/json.h>

#include <pcl/ModelCoefficients.h>

#include <pcl/common/common_headers.h>
#include <pcl/common/transforms.h>
#include <pcl/console/parse.h>
#include <pcl/features/normal_3d.h>
#include <pcl/filters/extract_indices.h>
#include <pcl/filters/radius_outlier_removal.h>
#include <pcl/filters/project_inliers.h>
#include <pcl/filters/voxel_grid.h>
#include <pcl/io/pcd_io.h>
#include <pcl/io/ply_io.h>
#include <pcl/point_types.h>
#include <pcl/sample_consensus/method_types.h>
#include <pcl/sample_consensus/model_types.h>
#include <pcl/segmentation/sac_segmentation.h>
#include <pcl/surface/convex_hull.h>

// Establish the vector basis
const Eigen::Vector3f Xaxis = Eigen::Vector3f(1.0, 0.0, 0.0);
const Eigen::Vector3f Yaxis = Eigen::Vector3f(0.0, 1.0, 0.0);
const Eigen::Vector3f Zaxis = Eigen::Vector3f(0.0, 0.0, 1.0);

// Constants read from a config.json file
// Initialized to default values
float rectangleDistThreshold = 0.3,
      angleModelThreshold = 1.0, // in degrees
      modelDistThreshold = 0.5,
      rectangleSizeFraction = 0.1,
      pointsModelThreshold = 0.001,
      filterRadius = 5.0;
int modelIterations = 5000,
    filterNeighbours = 50;

class Model
{
protected:
  std::vector<float> coefficients;

public:
  Model()
  {
  }
  Model(pcl::ModelCoefficients coeff)
  {
    coefficients = coeff.values;
  }
  virtual Json::Value toJson()
  {
    return nullptr;
  };
};

class Rectangle : public Model
{
private:
  std::vector<pcl::PointXYZ> corners;

public:
  Rectangle(pcl::PointXYZ a, pcl::PointXYZ b, pcl::PointXYZ c, pcl::PointXYZ d)
  {
    corners.push_back(a);
    corners.push_back(b);
    corners.push_back(c);
    corners.push_back(d);
  }
  Json::Value toJson()
  {
    Json::Value obj;
    obj["type"] = "rect";

    Json::Value corners_data(Json::arrayValue);
    for (int i = 0; i < corners.size(); i++)
    {
      Json::Value point_coord;
      point_coord["x"] = corners[i].x;
      point_coord["y"] = corners[i].y;
      point_coord["z"] = corners[i].z;
      corners_data.append(point_coord);
    }
    obj["points"] = corners_data;

    return obj;
  }
};

float distXY(pcl::PointXYZ a, pcl::PointXYZ b)
{
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

float orientation(pcl::PointXYZ a, pcl::PointXYZ b, pcl::PointXYZ c, Eigen::Vector3f normal)
{

  Eigen::Vector3f vec1(b.x - a.x, b.y - a.y, b.z - a.z);
  Eigen::Vector3f vec2(c.x - a.x, c.y - a.y, c.z - a.z);
  Eigen::Vector3f curr_normal = vec1.cross(vec2);

  return normal.dot(vec1.cross(vec2));
}

float height = 0.0;
std::vector<Model *> extraction;
Json::Value chullModel(Json::arrayValue);
bool extract_plane(pcl::PointCloud<pcl::PointXYZ>::Ptr &cloud, pcl::SACSegmentation<pcl::PointXYZ> seg, std::string model_id, int type, int cloud_size)
{
  pcl::ExtractIndices<pcl::PointXYZ> extract;
  pcl::ModelCoefficients::Ptr coefficients(new pcl::ModelCoefficients);
  pcl::PointIndices::Ptr inliers(new pcl::PointIndices);
  pcl::PointCloud<pcl::PointXYZ>::Ptr cloud_backup(new pcl::PointCloud<pcl::PointXYZ>);

  // Segment the largest model component from the remaining cloud
  seg.setInputCloud(cloud);
  seg.segment(*inliers, *coefficients);
  if (inliers->indices.size() < cloud_size * pointsModelThreshold)
  {
    std::cerr << "No more models can be fit in the remaining dataset." << std::endl;
    return false;
  }

  size_t modelPointSize = inliers->indices.size();
  std::cerr << "Model inliers: " << inliers->indices.size() << " out of " << cloud->size() << std::endl;

  pcl::PointCloud<pcl::PointXYZ>::Ptr cloud_inliers(new pcl::PointCloud<pcl::PointXYZ>(*cloud, inliers->indices));
  pcl::PointCloud<pcl::PointXYZ>::Ptr cloud_inliers_proj(new pcl::PointCloud<pcl::PointXYZ>);
  pcl::ProjectInliers<pcl::PointXYZ> proj;
  proj.setModelType(pcl::SACMODEL_PLANE);
  proj.setInputCloud(cloud_inliers);
  proj.setModelCoefficients(coefficients);
  proj.filter(*cloud_inliers_proj);

  float maxZ = cloud_inliers_proj->points[0].z,
        minZ = cloud_inliers_proj->points[0].z;

  std::vector<pcl::PointXYZ> planePoints;
  for (int i = 0; i < cloud_inliers_proj->points.size(); i++)
  {
    planePoints.push_back(cloud_inliers_proj->at(i));
    minZ = std::min(minZ, planePoints.back().z);
    maxZ = std::max(maxZ, planePoints.back().z);
  }

  if (type == 0) // horizontal plane
  {
    pcl::PointCloud<pcl::PointXYZ>::Ptr floor_hull(new pcl::PointCloud<pcl::PointXYZ>);
    pcl::ConvexHull<pcl::PointXYZ> chull;
    chull.setInputCloud(cloud_inliers_proj);
    chull.reconstruct(*floor_hull);

    std::cerr << "Convex hull has: " << floor_hull->points.size() << " data points." << std::endl;
    for (int i = 0; i < floor_hull->points.size(); i++)
    {
      Json::Value point_coord;
      point_coord["x"] = floor_hull->points[i].x;
      point_coord["y"] = floor_hull->points[i].y;
      point_coord["z"] = floor_hull->points[i].z;
      chullModel.append(point_coord);
    }
  }
  else
  {
    pcl::PointXYZ topmost(planePoints[0].x, planePoints[0].y, maxZ);
    pcl::PointXYZ downmost(planePoints[0].x, planePoints[0].y, minZ);
    pcl::PointXYZ thirdpoint = planePoints[1];

    Eigen::Vector3f vec1(topmost.x - downmost.x, topmost.y - downmost.y, topmost.z - downmost.z);
    Eigen::Vector3f vec2(thirdpoint.x - downmost.x, thirdpoint.y - downmost.y, thirdpoint.z - downmost.z);
    Eigen::Vector3f planeNormal = vec1.cross(vec2).normalized();

    if (maxZ - minZ > 0.1 * height)
    {
      height = std::max(height, maxZ - minZ);
      std::sort(planePoints.begin(), planePoints.end(), [topmost, downmost, planeNormal](pcl::PointXYZ a, pcl::PointXYZ b) {
        return orientation(topmost, a, downmost, planeNormal) < orientation(topmost, b, downmost, planeNormal);
      });
      int startInterval = 0;
      for (int i = 1; i <= planePoints.size(); i++)
      {
        if (i == planePoints.size() || distXY(planePoints[i], planePoints[i - 1]) > rectangleDistThreshold)
        {
          if (i == planePoints.size() || (i - startInterval) > planePoints.size() * rectangleSizeFraction)
          {
            std::vector<pcl::PointXYZ> verticalRange;
            for (int j = startInterval; j < i; j++)
            {
              verticalRange.push_back(planePoints[j]);
            }
            std::sort(verticalRange.begin(), verticalRange.end(), [](pcl::PointXYZ a, pcl::PointXYZ b) {
              return a.z < b.z;
            });

            int startZInterval = 0;
            for (int j = 1; j <= verticalRange.size(); j++)
            {
              if (j == verticalRange.size() || (verticalRange[j].z - verticalRange[j - 1].z) * (verticalRange[j].z - verticalRange[j - 1].z) > rectangleDistThreshold)
              {
                if (j == verticalRange.size() || (j - startZInterval) > verticalRange.size() * rectangleSizeFraction)
                {
                  extraction.push_back(new Rectangle(pcl::PointXYZ(planePoints[startInterval].x, planePoints[startInterval].y, verticalRange[j - 1].z),
                                                     pcl::PointXYZ(planePoints[i - 1].x, planePoints[i - 1].y, verticalRange[j - 1].z),
                                                     pcl::PointXYZ(planePoints[i - 1].x, planePoints[i - 1].y, verticalRange[startZInterval].z),
                                                     pcl::PointXYZ(planePoints[startInterval].x, planePoints[startInterval].y, verticalRange[startZInterval].z)));
                }
                else
                {
                  for (int k = startZInterval; k < j; k++)
                  {
                    cloud->push_back(planePoints[k]);
                  }
                }
                startZInterval = j;
              }
            }
          }
          else
          {
            for (int j = startInterval; j < i; j++)
            {
              cloud->push_back(planePoints[j]);
            }
          }
          startInterval = i;
        }
      }
    }
  }

  // Extract the inliers
  extract.setInputCloud(cloud);
  extract.setIndices(inliers);
  extract.setNegative(true);
  extract.filter(*cloud_backup);
  cloud.swap(cloud_backup);

  return true;
}

void showHelp(char *filename)
{
  std::cout << std::endl;
  std::cout << "***************************************************************************" << std::endl;
  std::cout << "*                                                                         *" << std::endl;
  std::cout << "*             Point Cloud Wall and Floor Exclusion - Usage Guide          *" << std::endl;
  std::cout << "*                                                                         *" << std::endl;
  std::cout << "***************************************************************************" << std::endl
            << std::endl;
  std::cout << "Usage: " << filename << " cloud_filename.[ply/pcd] output_name.json [Options]" << std::endl
            << std::endl;
  std::cout << "Options:" << std::endl;
  std::cout << "     -h:                     Show this help." << std::endl;
  std::cout << "     --save_filter:          Save the filtered point cloud." << std::endl;
  std::cout << "     --no_filter:            Not use noise filtering." << std::endl;
  std::cout << std::endl
            << "The extraction tool can also be configured by a separate config file in the run directory, config.json." << std::endl;
  // std::cout << "     -k:                     Show used keypoints." << std::endl;
}

std::string outputModel, outputCHullModel;
std::string filterSave, inputName;
bool saveFilter, noFilter, convASCII;
void parseCommandLine(int argc, char *argv[], pcl::PointCloud<pcl::PointXYZ>::Ptr cloud)
{
  //Show help
  if (pcl::console::find_switch(argc, argv, "-h"))
  {
    showHelp(argv[0]);
    exit(0);
  }

  //Model & scene filenames
  std::vector<int> filenames;
  filenames = pcl::console::parse_file_extension_argument(argc, argv, ".pcd");
  if (filenames.size() != 1)
  {
    filenames = pcl::console::parse_file_extension_argument(argc, argv, ".ply");
    if (filenames.size() != 1)
    {
      std::cout << "Point cloud filename missing.\n";
      showHelp(argv[0]);
      exit(-1);
    }
    else
    {
      std::cerr << "Recognized a PLY file, processing ...\n";
      if (pcl::io::loadPLYFile<pcl::PointXYZ>(argv[filenames[0]], *cloud) == -1) // load the file
      {
        PCL_ERROR(std::string("Couldn't read file " + std::string(argv[filenames[-0]]) + "\n").c_str());
        exit(-1);
      }
      filterSave = std::string(argv[filenames[0]]);
      inputName = std::string(argv[filenames[0]]);
    }
  }
  else
  {
    std::cerr << "Recognized a PCD file, processing ...\n";
    if (pcl::io::loadPCDFile<pcl::PointXYZ>(argv[filenames[0]], *cloud) == -1) // load the file
    {
      PCL_ERROR(std::string("Couldn't read file " + std::string(argv[filenames[0]]) + "\n").c_str());
      exit(-1);
    }
    filterSave = std::string(argv[filenames[0]]);
    inputName = std::string(argv[filenames[0]]);
  }
  filterSave = filterSave.substr(0, filterSave.size() - 4);
  filterSave += "_filt.pcd";
  inputName = inputName.substr(0, inputName.size() - 4) + "_ascii.pcd";

  std::cerr << "Cloud size of " << cloud->size() << " imported.\n";

  std::ifstream file_input("config.json");
  Json::Value root;
  Json::CharReaderBuilder rbuilder;
  std::string errs;
  bool ok = Json::parseFromStream(rbuilder, file_input, &root, &errs);
  if (!root["rectangleDistThreshold"].empty())
    rectangleDistThreshold = root["rectangleDistThreshold"].asFloat();
  if (!root["angleModelThreshold"].empty())
    angleModelThreshold = root["angleModelThreshold"].asFloat();
  if (!root["modelDistThreshold"].empty())
    modelDistThreshold = root["modelDistThreshold"].asFloat();
  if (!root["rectangleSizeFraction"].empty())
    rectangleSizeFraction = root["rectangleSizeFraction"].asFloat();
  if (!root["pointsModelThreshold"].empty())
    pointsModelThreshold = root["pointsModelThreshold"].asFloat();
  if (!root["modelIterations"].empty())
    modelIterations = root["modelIterations"].asInt();
  if (!root["filterNeightbours"].empty())
    filterNeighbours = root["fitlerNeighbours"].asInt();
  if (!root["filterRadius"].empty())
    filterRadius = root["filterRadius"].asFloat();

  //Program behavior
  if (pcl::console::find_switch(argc, argv, "--save_filter"))
  {
    saveFilter = true;
  }
  if (pcl::console::find_switch(argc, argv, "--no_filter"))
  {
    noFilter = true;
  }
  if (pcl::console::find_switch(argc, argv, "--conv_ascii"))
  {
    convASCII = true;
  }

  filenames = pcl::console::parse_file_extension_argument(argc, argv, ".json");
  if (filenames.size() != 1)
  {
    std::cout << "Model filename missing.\n";
    showHelp(argv[0]);
    exit(-1);
  }
  outputModel = argv[filenames[0]];
  outputCHullModel = outputModel.substr(0, outputModel.size() - 5) + "_chull.json";

  //General parameters
  // pcl::console::parse_argument(argc, argv, "--model_ss", model_ss_);
}

int main(int argc, char **argv)
{

  // Declare the clouds
  pcl::PointCloud<pcl::PointXYZ>::Ptr cloud(new pcl::PointCloud<pcl::PointXYZ>);
  pcl::PointCloud<pcl::PointXYZ>::Ptr cloud_filtered(new pcl::PointCloud<pcl::PointXYZ>);

  parseCommandLine(argc, argv, cloud);
  if (convASCII)
  {
    std::cerr << "Converting input to ASCII: ";
    pcl::io::savePCDFileASCII(inputName, *cloud);
    std::cerr << "done!\n";
  }

  if (!noFilter)
  {
    std::cerr << "Starting filtering:";
    pcl::RadiusOutlierRemoval<pcl::PointXYZ> outrem;
    outrem.setInputCloud(cloud);
    outrem.setRadiusSearch(filterRadius);
    outrem.setMinNeighborsInRadius(filterNeighbours);
    outrem.filter(*cloud_filtered);
    std::cerr << " finished\n";

    if (saveFilter)
    {
      std::cerr << filterSave << std::endl;
      pcl::io::savePCDFileASCII(filterSave, *cloud_filtered);
      std::cerr << "Saved " << cloud_filtered->points.size() << " data points to " << filterSave << "." << std::endl;
    }
    *cloud = *cloud_filtered;
  }
  int cloudSize = cloud->points.size();
  std::cerr << "Cloud left with " << cloudSize << " points\n";

  // Create the segmentation object
  pcl::SACSegmentation<pcl::PointXYZ> seg;
  seg.setMethodType(pcl::SAC_RANSAC);    // Using the RANSAC matching algorithm
  seg.setMaxIterations(modelIterations); // Limit iterations for performance
  // seg.setNumberOfThreads(4);                // Enable multi-threading (supported with PCL >=1.10)
  seg.setAxis(Zaxis);                                     // Use the z-axis as a base
  seg.setEpsAngle(angleModelThreshold * (M_PI / 180.0f)); // With variation of degrees
  seg.setDistanceThreshold(modelDistThreshold);           // Distance variance

  // Looking for planes parallel to x,y (floor and ceiling)
  std::cerr << "\nExtracting horizontal planes: " << std::endl;
  seg.setModelType(pcl::SACMODEL_PERPENDICULAR_PLANE); // Searching for perpendicular planes
  extract_plane(cloud, seg, "floor", 0, cloudSize);    // looking for a horizontal plane

  // Looking for walls, planes parallel to the Z-axis
  std::cerr << "\nExtracting vertical planes: " << std::endl;
  seg.setModelType(pcl::SACMODEL_PARALLEL_PLANE); // Searching for perpendicular planes

  int wallCnt = 0;
  do
  {
    wallCnt++;
  } while (extract_plane(cloud, seg, "wall" + std::to_string(wallCnt), 1, cloudSize)); // looking for a vertical plane

  std::cerr << "Printing the found models to JSON:";

  Json::Value models(Json::arrayValue);
  for (int i = 0; i < extraction.size(); i++)
  {
    models.append(extraction[i]->toJson());
  }

  Json::StreamWriterBuilder builder;
  std::unique_ptr<Json::StreamWriter> writer(builder.newStreamWriter());

  std::ofstream outputCHullFileStream(outputCHullModel);
  writer->write(chullModel, &outputCHullFileStream);
  std::ofstream outputFileStream(outputModel);
  writer->write(models, &outputFileStream);

  std::cerr << "Successfully filled!\n";

  return (0);
}
