import {floorPlane}  from '../custom_modules/FloorPlan.js';
import * as THREE from './node_modules/three/build/three.module.js';

function floorTest(){
var hullLoader = new THREE.FileLoader();
hullLoader.setResponseType("json");
var chull_file = "model_fastPLY_chull.json";
var floor_plan = "floor_plan.jpeg";
var convex = [];

//load a JSON file and output the result to the console
hullLoader.load(
  // resource URL
  chull_file,

  // onLoad callback
  function ( data ) {
      if(data.length < 4){
        console.error("Test failed: Less than 4 vertices given in convex hull file");
      }
    for(var i = 0; i<data.length; i++){
      convex.push(data[i]["x"]);
      convex.push(data[i]["y"]);
    }
    var floor = floorPlane(floor_plan, renderer, convex);
    if(floor.vertices.length == 4){
        console.log("Success: FloorPlan Plane has 4 Vertices");
    }
    else{
       console.error("Test Failed: Floor Plan Vertices Are Not Equal to 4"); 
    }
},

// onProgress callback
function ( xhr ) {
  console.log( (xhr.loaded / xhr.total * 100) + '% loaded of HULL' );
},

// onError callback
function ( err ) {
  console.error( 'Test failed with error:' );
  console.error(err);
}
);
}
