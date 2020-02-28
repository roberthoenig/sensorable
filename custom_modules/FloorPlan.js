import * as THREE from '../node_modules/three/build/three.module.js';


function floorPlane(image_file, renderer, convex){
    //load a text file and output the result to the console
//    console.log("CREATING FLOOR PLANE WITH HULL")
//    console.log(convex);
    var cleanedConvex = [];

    var plane;

//    console.log("Before Loop");
//    console.log(convex.length);
    for(var k = convex.length - 1; k>=0; k-= 2){
        var y = convex[k];
        var x = convex[k - 1];		
//        console.log("POINT");
        var close = false;
        for(var j = 0; j<cleanedConvex.length; j += 2){
            var x_2 = cleanedConvex[j];
            var y_2 = cleanedConvex[j + 1];
            var dx = x_2 - x;
            var dy = y_2 - y;
//            console.log("DIST");
//            console.log(dx*dx + dy*dy);
            if(dx*dx + dy*dy < 2000){
                var close = true;
                break;	
            }
        }
        if(!close){
            cleanedConvex.push(x);
            cleanedConvex.push(y);
        }
    }
//    console.log("After Loop");
//    console.log("CLeaned");
//    console.log(cleanedConvex);
//    console.log("Cleaned len")
//    console.log(cleanedConvex.length);


    //Create plane
    var planeGeometry = new THREE.PlaneGeometry(89.85, 40, 1, 1);
    var texture = new THREE.TextureLoader().load(image_file);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    var planeMaterial = new THREE.MeshLambertMaterial( { map: texture } );
    planeMaterial.side = THREE.DoubleSide;
    var v1 = new THREE.Vector3(cleanedConvex[0], cleanedConvex[1], 0);
    var v2 = new THREE.Vector3(cleanedConvex[2], cleanedConvex[3], 0);
    var v3 = new THREE.Vector3(cleanedConvex[4], cleanedConvex[5], 0);
    var v4 = new THREE.Vector3(cleanedConvex[6], cleanedConvex[7], 0);
    var vertices = [v1, v2, v3, v4];
    vertices.sort(function(a,b){
        var da = v1.distanceTo(a);
        var db = v1.distanceTo(b);
        if(da < db){
            return -1;
        }
        if(db < da){
            return 1;
        }
        else{
            return 0;
        }
        });
        //red blue yellow white
    var side = (new THREE.Vector3(0,0,0));
    side.subVectors(vertices[0], vertices[2]);
    var yellow1 = (new THREE.Vector3(0,0,0));
    yellow1.addVectors(vertices[3], side);
    var yellow2 = new THREE.Vector3(0,0,0);
    yellow2.subVectors(vertices[3], vertices[2]);
    yellow2.add(vertices[0]);
    var yellow = (new THREE.Vector3(0,0,0)).addVectors(yellow1,yellow2);
    yellow.multiplyScalar(0.5);
    //make rectangular by projection
    var project = (new THREE.Vector3(0,0,0)).subVectors(yellow, vertices[0]);
    var sideNormal = (new THREE.Vector3(side.x, side.y, side.z)).normalize();
    project.projectOnVector(sideNormal);
    yellow1.sub(project);

    planeGeometry.vertices = [vertices[0], vertices[2], yellow1, vertices[3]];
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.name = "plane"
    console.log("Plane created");
    return plane;
}

export{floorPlane};

