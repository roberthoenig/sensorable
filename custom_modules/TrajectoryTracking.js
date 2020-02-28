// Module for displaying and interacting with planar representation of the point cloud
import * as THREE from '../node_modules/three/build/three.module.js';


function TrajectoryTracking(_trajectoryFile, gui, onChange) {

    THREE.Object3D.call(this);
    var scope = this;

    var _objects =[];
    var _start;
    var _finish;

    var _geometry = new THREE.SphereBufferGeometry( 0.2, 10, 10 );
    var _material = new THREE.MeshBasicMaterial( {color: 0x0000ff} );
    var _sphere = new THREE.Mesh( _geometry, _material );
    this.add( _sphere );

    var params = {
        trajectory: 0,
    };

    var _loader = new THREE.FileLoader();
    _loader.load(
        // resource URL
        _trajectoryFile,
    
        // onLoad callback
        function ( data ) {
            var pieces = data.split("\n");
            _start = parseFloat(pieces[1].split(" ")[0]);

            _finish = parseFloat(pieces[pieces.length-2].split(" ")[0]);
            var currentController = gui.add( params, 'trajectory', 0, Math.round(_finish - _start)).name('Trajectory').step( 1);
            currentController.onChange ( function ( value ) {
                var origin = new THREE.Vector3();
                for(var i = 1; i<_objects.length; i++) {
                    if(_objects[i].time > value) {
                        break;
                    } else {
                        origin = _objects[i].origin;
                    }
                }
                _sphere.position.set(origin.x, origin.y, origin.z);
            } );

            currentController.onFinishChange( function ( value ) {
                onChange(value);
            } );
            for(var i = 1500; i<pieces.length; i+=2) {
                var numbers = pieces[i].split(" ");
                var t = parseFloat(numbers[0]);
                var o = new THREE.Vector3(parseFloat(numbers[1]),parseFloat(numbers[2]),parseFloat(numbers[3]));

                var object = {origin: o, time: t - _start};
                _objects.push(object);
            }
            var points = [];
            for(var i = 1; i<_objects.length; i++) {
                object = _objects[i]; 
                object.ray = new THREE.Vector3().copy(object.origin).addScaledVector(_objects[i-1].origin, -1).normalize();
                points.push(object.origin);
                
            }
            var material = new THREE.LineBasicMaterial( {
                depthTest: false,
                depthWrite: false,
                transparent: true,
                linewidth: 1,
                fog: false,
                color: 0x0000ff
            } );
            var geometry = new THREE.BufferGeometry().setFromPoints( points );
            scope.add(new THREE.Line( geometry, material ));
        },
    
        // onProgress callback
        function ( xhr ) {
            console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
        },
    
        // onError callback
        function ( err ) {
            console.error( err );
        }
    );

    this.getTime = function (intersect) {
        if(intersect == null) {
            return -1;
        }
        var point = intersect.point;
        var origin = new THREE.Vector3();
        var max = 0;
        var time = -1;
        var distance = 1000;
        for(var i = 1; i<_objects.length; i++) {
            var OP = new THREE.Vector3().copy(point).addScaledVector(_objects[i].origin, -1);
            var d = OP.length();
            var c = OP.normalize().dot(_objects[i].ray);
            if(c>max || c>max-0.01) {
                if(d < distance) {
                    max = c;
                    distance = d;
                    time = _objects[i].time;
                    origin = _objects[i].origin;
                }
            }
        }
        _sphere.position.set(origin.x, origin.y, origin.z);
        return time;
    };

    this.updateBallSize = function(_camera) {
        //make it undoable
        var scaleVector = new THREE.Vector3();
        var scaleFactor = 9;
        var scale = scaleVector.subVectors(_sphere.position, _camera.position).length() / scaleFactor;
        if(scale > 1 && scale < 10) {
            _sphere.scale.set(scale, scale, scale);
        }
    }

}

TrajectoryTracking.prototype = Object.create(THREE.Object3D.prototype);
TrajectoryTracking.prototype.constructor = TrajectoryTracking;

export{TrajectoryTracking};