// Module for displaying and interacting with planar representation of the point cloud
import * as THREE from '../node_modules/three/build/three.module.js';


function PlaneModel(_modelJSON, _sensorControls) {

    THREE.Object3D.call(this);
    var scope = this;

    var _objects =[];

    var _selectedPlane;

    var _raycaster = new THREE.Raycaster();

    var _loader = new THREE.FileLoader();
    _loader.load(
        // resource URL
        _modelJSON,
    
        // onLoad callback
        function ( data ) {
            var obj = JSON.parse(data);
            var len = Object.keys(obj).length;
            for (var i = 0; i < len; i++) {
                if(obj[i].type == "rect") {
                    var p = obj[i].points;
                    var A = new THREE.Vector3(p[0].x, p[0].y, p[0].z);
                    var B = new THREE.Vector3(p[1].x, p[1].y, p[1].z);
                    var C = new THREE.Vector3(p[2].x, p[2].y, p[2].z);
                    C.addScaledVector(B, -1).multiplyScalar(-1);
                    B.addScaledVector(A, -1);
                    var width = B.length(); 
                    var height = C.length();
                    var geometry = new THREE.BoxBufferGeometry(width, height, 0.05);
                    var material = new THREE.MeshLambertMaterial( {color: 0x505050, side: THREE.DoubleSide} );

                    var outlineMaterial = new THREE.MeshBasicMaterial( { color: 0x1f1f1f, side: THREE.BackSide } );
                    var outlineMesh = new THREE.Mesh( geometry, outlineMaterial );
                    var scale = new THREE.Vector3().copy(outlineMesh.scale);
                    outlineMesh.scale.set(1.02, 1.02, 1.05)
                    var plane = new THREE.Mesh( geometry, material );
                    plane.outline = outlineMesh;
                    plane.add(outlineMesh);
                    A.addScaledVector(B, 0.5).addScaledVector(C, -0.5);
                    plane.vAxis = new THREE.Vector3().copy(C.normalize());
                    plane.hAxis = new THREE.Vector3().copy(B.normalize());
                    plane.up = new THREE.Vector3(0,0,1);
                    var normal = new THREE.Vector3().crossVectors(C, B);
                    plane.lookAt(normal);
                    plane.position.set(A.x, A.y, A.z);
                    plane.normal = normal;
                    plane.width = width;
                    plane.height = height;
                    
                    _objects.push(plane);
                    scope.add(plane);
                }
            }
        },
    
        // onProgress callback
        function ( xhr ) {
            console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
        },
    
        // onError callback
        function ( err ) {
            console.error( 'An error happened' );
        }
    );

    this.createSensor = function(mouse, camera) {

        _raycaster.setFromCamera( mouse, camera );
        var intersects = _raycaster.intersectObjects(_objects);
        if ( intersects.length > 0 ) {
            var point = intersects[0].point;
            var plane = intersects[0].object;
            var side = plane.normal.dot(_raycaster.ray.direction);
            
            var scale = (side < 0) ? 1 : -1;
            var s = _sensorControls.createSensor(new THREE.Vector3().copy(plane.position), new THREE.Vector3().addScaledVector(plane.hAxis, -scale), plane.vAxis, plane.height/2, plane.width/2, false);

            s.position.set(point.x, point.y, point.z);
            return s;
        } 
        return null;
    }

    this.intersect = function(mouse, camera) {

        _raycaster.setFromCamera( mouse, camera );
        var intersects = _raycaster.intersectObjects(_objects);
        if ( intersects.length > 0 ) {
            if(_selectedPlane == intersects[0].object) {
                _selectedPlane.material.color.setHex( 0x505050);
                _selectedPlane = null;
                return null;
            }
            if(_selectedPlane != null) {
                _selectedPlane.material.color.setHex( 0x505050);
            }
            _selectedPlane = intersects[0].object;
            _selectedPlane.material.color.setHex( 0xffaa00);
            return _selectedPlane;
        }
        if(_selectedPlane != null) {
            _selectedPlane.material.color.setHex( 0x505050);
        }
        _selectedPlane = null;
        return null;
    }

    this.deleteSelected = function() {
        if(_selectedPlane != null) {
            scope.remove(_selectedPlane);
            _objects = _objects.filter(function(ele){
                return ele != _selectedPlane;
            });
            _selectedPlane.outline.material.dispose();
            _selectedPlane.outline.geometry.dispose();
            _selectedPlane.material.dispose();
            _selectedPlane.geometry.dispose();
        }
    }
}

PlaneModel.prototype = Object.create(THREE.Object3D.prototype);
PlaneModel.prototype.constructor = PlaneModel;

export{PlaneModel};