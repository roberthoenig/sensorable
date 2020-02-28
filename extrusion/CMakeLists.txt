cmake_minimum_required(VERSION 2.8 FATAL_ERROR)

project(planar_segmentation)

find_package(Threads)
find_package(PCL 1.2 REQUIRED)
find_package(jsoncpp CONFIG REQUIRED)


include_directories(${PCL_INCLUDE_DIRS})
include_directories(${JSONCPP_INCLUDE_DIRS})
link_directories(${PCL_LIBRARY_DIRS})
add_definitions(${PCL_DEFINITIONS})

set(EXECUTABLE_OUTPUT_PATH ${PROJECT_SOURCE_DIR}/bin)
add_executable (planar_segmentation planar_segmentation.cpp)
target_link_libraries(jsoncpp_lib)
target_link_libraries (planar_segmentation ${PCL_LIBRARIES})
