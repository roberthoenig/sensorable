# extrusion

The walls, floor and poles extrusion tool. This is a supplementary tool for the project that processes the point cloud of the site and extracts certain features such as the walls, the floor and looks for some cylindrical poles as well and exports them in a JSON file which is later used by the visualizer. The operations of this tool are meant to be done as preprocessing for the real application and does not require to be run multiple times at each start of the main project.

## Dependencies

The tool requires the following libraries:
1. Point Cloud Library (PCL) [Install from here](http://pointclouds.org/downloads/)
2. JSONCPP library [Install from here](https://github.com/open-source-parsers/jsoncpp)
3. CMake build tool

## Installation
Here are the simple installation steps for the tool:
```
git clone https://github.com/roberthoenig/sensorable/
cd extrusion
mkdir build && cd build
cmake ..
make
```
The resulting binary file will be located under `extrusion/bin`.

## Usage
The binary comes with a simplified help option which gives its basic usage.
```
user@machine$ bin/planar_segmentation -h

***************************************************************************
*                                                                         *
*             Point Cloud Wall and Floor Exclusion - Usage Guide          *
*                                                                         *
***************************************************************************

Usage: bin/planar_segmentation cloud_filename.[ply/pcd] output_name.json [Options]

Options:
     -h:                     Show this help.
     --save_filter:          Save the filtered point cloud.
     --no_filter:            Not use noise filtering.

```
In addition to the `model.json` file with all extracted wall rectangles, the tool produces an additional file `model_chull.json` with the points from the convex hull of the floor used later for floor plan fitting.

## Sample model files
The tool comes with some precomputed model files for the point clouds we have been given. They are named as follows:

Point Cloud | Model file
--- | ---
2019-11-05_15-49-30fast postprocessed_99pct_time_normals_smoothing_scan.ply | model_fastPLY.json
... | ...

Also, there is a `model_sample.json` file with a single plane which describes the format of the `model.json` files

## Integration tests
To check the basic capability file of tool, an integration test with a sample sketch with 10 planes has been extracted from the sample data set and is used for base tool verification when major changes are performed.
The test can be run by executing the `run.sh` testing script which automatically compiles your source and runs the test.
