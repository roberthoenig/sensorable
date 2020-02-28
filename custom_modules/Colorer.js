import * as THREE from '../node_modules/three/build/three.module.js';
import {WASM} from './WASM.js';
import * as GLOBALS from './Globals.js'

function Colorer(_sensorControls, _plane) {

        var _probability = [];
        var _loader = new THREE.FileLoader();

        function _getProbability(distance, angle) {
            if(angle > Math.PI/2) {
                return 0;
            }
            var y = distance * Math.sin(angle);
            var x = distance * Math.cos(angle);
            var i = 55 - Math.floor(56*y/34);
            var j = Math.floor(94*x/57);
            if(i<0 || j>93) {
                return 0;
            }
            return _probability[i][j];
        }

        function isPointReachableFromSensor(sensor, point) {
            // GLOBALS.LOG("isPointReachableFromSensor point", point);
            if (WASM.is_loaded == false) {
                console.error("Calling isPointReachableFromSensor when WASM is not yet loaded!");
            }
            var point_position = point;
            var ray_orig = sensor.position;
            var ray_dir = (new THREE.Vector3()).subVectors(point_position, ray_orig);
            var dist_to_point = ray_orig.distanceTo(point_position);
            var dist_to_intersect = WASM.get_distance_to_first_intersection(
                ray_orig.x, ray_orig.y, ray_orig.z,
                ray_dir.x, ray_dir.y, ray_dir.z)
            var is_reachable = dist_to_intersect + 0.1 >= dist_to_point;
            // GLOBALS.LOG("sensor", sensor, "point", point);
            if (is_reachable) {
                if (dist_to_intersect == 100000000) { // ray never intersects with pointcloud.
                    // GLOBALS.LOG("no intersection");
                    return true;
                }
                else { // ray intersects with pointcloud and intersection is close to point
                    // GLOBALS.LOG("close intersection");
                    return true;
                }
            } else { // ray intersects with pointcloud well before it reaches point.
                // GLOBALS.LOG("collision");
                return false;
            }
        }
    
        var _getColor = function(point) {
            // GLOBALS.LOG("_getColor point", point);
            var sensors = _sensorControls.getSensors();
            //do binomial here
            var sensor_probs = []
            var index = 0;
            for(var s = 0; s < sensors.length; s++) {
                var data = _sensorControls.getPositionData(sensors[s], new THREE.Vector3().copy(point));
                var p = isPointReachableFromSensor(sensors[s], point) ? _getProbability(data.distance, data.azimuth) : 0; 
                if(p > 0) {
                    sensor_probs[index] = p;
                    index++;
                }
            }    
            
            var cum_p = 0;

            for(var i = 0; i < index; i++) {
                for (var j = i + 1; j < index; j++) {
                    for(var k = j + 1; k < index; k++) {
                        cum_p += (sensor_probs[i]*sensor_probs[j]*sensor_probs[k]);
                    }
                }
            }

            if(cum_p > 1) {
                cum_p = 1;
            } 
        
            var color = new THREE.Color();
            color.setHSL(0.5, 0, _lerp(0.3, 0.65, 1-cum_p));
            return color;
        };

        // Exported Coloring function to pass to the plane.
        this.getColor = _getColor;

        _loader.load(
            // resource URL
            './custom_modules/Sensors94x56.ppm',
        
            // onLoad callback
            function ( data ) {
                // output the text to the console
                var pieces = data.split('\n');
                var y=-1;
                var x=93;
                for(var i=1; i<pieces.length/3; i++){
                    if(x==93){
                        y += 1;
                        _probability[y] = [];
                        x = -1;
                    }
                    var r = pieces[i*3];
                    var g = pieces[i*3 + 1];
                    var b = pieces[i*3 + 2];
                    var p = 0;
                    if (r == "255") {
                        if (g == "255") { //yellow
                            p = 0.5;
                        } else if ( b == "255") { //magenta
                            p = 0.75;
                        } else { //red
                            p = 0;
                        }
                    } else if (g == "255") {
                        if(b == "255") { //cyan
                            p = 1;
                        } else { //green
                            p = 0; //not a bug - probably
                        }
                    } else if (b == "255") { //blue
                        p = 0.25;
                    }
    
                    x += 1;
                    _probability[y][x] = p;
                }
                _plane.updateColors(_getColor);
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
}


function _lerp(a, b, n) {
    return (1 - n) * a + n * b;
}

Colorer.prototype.constructor = Colorer;

export{Colorer};