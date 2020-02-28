import * as THREE from '../node_modules/three/build/three.module.js';
import {TransformControls} from '../node_modules/three/examples/jsm/controls/TransformControls.js';
import * as GLOBALS from './Globals.js'

function InspectPlane(_plane_size, _plane_fragments, _altitude, _camera, _renderer, _orbit) {

    THREE.Object3D.call(this);

    var _getColor;

    var _planeGeometry = new THREE.PlaneBufferGeometry( _plane_size, _plane_size, _plane_fragments, _plane_fragments);
    _planeGeometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array( _planeGeometry.attributes.position.count * 3 ), 3 ) );

    var _x = 0;
    var _y = 0;

    var _colorPlane = function(planeGeometry) {
        // GLOBALS.LOG("_altitude, _x, _y", _altitude, _x, _y);
        var count = planeGeometry.attributes.position.count;
    
        var color = new THREE.Color();
        var positions1 = planeGeometry.attributes.position;
        var colors1 = planeGeometry.attributes.color;
        const start_time = performance.now();
        for (;_colorPlane.ctr % 100 != 0 || performance.now() - start_time < 20; ++_colorPlane.ctr ) {
            var i = _colorPlane.ctr % count;
            var point = new THREE.Vector3(positions1.getX(i), positions1.getY(i), positions1.getZ(i));
            if(_plane != undefined) {
                _plane.updateMatrixWorld();
                point.applyMatrix4( _plane.matrixWorld );
            }
            color = _getColor(point);
            colors1.setXYZ( i, color.r, color.g, color.b );
        }
        _colorPlane.ctr += 1;
        GLOBALS.LOG.enabled = _colorPlane.ctr < count;
        colors1.needsUpdate = true;
    }
    _colorPlane.ctr = 0;

    var _material = new THREE.MeshPhongMaterial( {
        color: 0xffffff,
        flatShading: true,
        vertexColors: THREE.VertexColors,
        shininess: 0
    } );

    var _plane = new THREE.Mesh(_planeGeometry, _material);
    _plane.position.z = _altitude;
    _plane.cumulative_scale = new THREE.Vector3(1,1,1);
    _plane.name = "plane";
    this.add(_plane);

    var _tc = new TransformControls(_camera, _renderer.domElement);
    _tc.mode = "scale";
    _tc.attach(_plane);
    _tc.showZ = false;
    this.add(_tc);

    _tc.addEventListener( 'mouseDown', function ( event ) {
            _orbit.enabled = false;
    });

    _tc.addEventListener( 'mouseUp', function ( event ) {
        //for best results this can be done on any change, but sice this 
        //computation is expensive I do it only once.
        
        _orbit.enabled = true;
        updateClrs(this);
    });

    //Call this whenever the sensor or plane positions have changed.
    this.updateColors = function (_getColorLatest) {
        _getColor = _getColorLatest;
        updateClrs(this);
    }

    function updateClrs(it) {
        _altitude = _plane.position.z;
        _x = _plane.position.x;
        _y = _plane.position.y;
        _colorPlane(_plane.geometry)
    }

    this.setModeRotate = function() {
        if(_tc.mode == "rotate") {
            if(_tc.object == null) {
                _tc.attach(_plane);
            } else {
                _tc.detach();
            }
        } else {
            _tc.mode = "rotate";
            _tc.showZ = true;
            _tc.showY = false;
            _tc.showX = false;
            if(_tc.object == null) {
                _tc.attach(_plane);
            }
        }
    }

    this.setModeTranslate = function() {
        if(_tc.mode == "translate") {
            if(_tc.object == null) {
                _tc.attach(_plane);
            } else {
                _tc.detach();
            }
        } else {
            _tc.mode = "translate";
            _tc.showZ = true;
            _tc.showY = true;
            _tc.showX = true;
            if(_tc.object == null) {
                _tc.attach(_plane);
            }
        }
    }

    this.setModeScale = function() {
        if(_tc.mode == "scale") {
            if(_tc.object == null) {
                _tc.attach(_plane);
            } else {
                _tc.detach();
            }
            return;
        } else {
            _tc.mode = "scale";
            _tc.showZ = false;
            _tc.showY = true;
            _tc.showX = true;
            if(_tc.object == null) {
                _tc.attach(_plane);
            }
        }
    }

    this.removeGizmos = function () {
        _tc.detach();
    }

    this.addGizmos = function() {
        _tc.attach(_plane);
    }
}

InspectPlane.prototype = Object.create(THREE.Object3D.prototype);
InspectPlane.prototype.constructor = InspectPlane;

export{InspectPlane};
