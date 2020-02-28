#!/bin/bash

cd ../build && make && cd ../integration_tests
mkdir temp
cd temp && cp ../data/config.json .
../../bin/planar_segmentation ../data/cloud_sample.pcd model_sample.json

diff model_sample.json ../data/model_sample.json > /dev/null
if [ $? -ne 0 ]; then
    echo "Plane file does not match!"
else
    diff model_sample_chull.json ../data/model_sample_chull.json > /dev/null
    if [ $? -ne 0 ]; then
        echo "Convex hull does not match!"
    else
        cd .. && rm -rf temp && echo "Test successfull!"
    fi
fi
