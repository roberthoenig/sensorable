import * as THREE from '../node_modules/three/build/three.module.js';
import {DragControls} from '../node_modules/three/examples/jsm/controls/DragControls.js';
import {TransformControls} from '../node_modules/three/examples/jsm/controls/TransformControls.js';
import {updateList} from './gui.js';

function _lerp(a, b, n) {
    return (1 - n) * a + n * b;
}

function SensorControls(_camera, _domElement, _orbit, gui) {

    THREE.Object3D.call(this);

    var scope = this;

    var SensObject = new THREE.Object3D();
    this.add(SensObject);

    var _selectedSensor = null;
    var _translation = new THREE.Object3D();
    _translation.visible = false;
    this.add(_translation);

    var _sensor_height = 0.1;

    var params = {
        azimuth: 0,
    };
    var currentController = null;
    var scope = this;

    function _createMesh(position, hAxis, vAxis) {
        var geometry1 = new THREE.SphereBufferGeometry( _sensor_height, 64, 32);

        var count = geometry1.attributes.position.count;
        geometry1.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array( count * 3 ), 3 ) );

        var color = new THREE.Color();
        var positions1 = geometry1.attributes.position;
        var colors1 = geometry1.attributes.color;

        //Add funky colors
        for ( var i = 0; i < count; i ++ ) {

            var k = Math.abs( positions1.getX( i )/_sensor_height);
            var l = Math.abs( positions1.getZ( i )/_sensor_height);
            var y = positions1.getZ( i );
            var m = 1 + k*10 - l;
            var n = 1 + k*5 - l;
            var o = 1 + k - l;
            if(m < 1 && y>=0) {
                color.setHSL( 0.1 , 1.0, 0 );
            } else if(n < 1 && y>=0) {
                color.setHSL( 0.1 , 1.0, _lerp(-0.4, 0.5, n) );
            } else {
                color.setHSL( _lerp(0, 0.025, o), 1.0, 0.5 );
            }
            colors1.setXYZ( i, color.r, color.g, color.b );
        }

        var n = new THREE.Vector3();
        n.crossVectors(hAxis.normalize(),vAxis.normalize());
        var localPlane = new THREE.Plane( new THREE.Vector3().copy(n), 0);

        var material = new THREE.MeshPhongMaterial( {
            color: 0xffffff,
            flatShading: true,
            vertexColors: THREE.VertexColors,
            shininess: 0,
            clippingPlanes: [ localPlane ],
            clipShadows: true
        } );

        var mesh = new THREE.Mesh( geometry1, material );
        mesh.clipping = localPlane;

        mesh.up = vAxis.normalize();

        mesh.direction = n;
        mesh.lookAt(n);

        mesh.position.set(position.x, position.y, position.z);

        return mesh;
    }

    this.createSensor = function (position, hAxis, vAxis, height, width, free) {
        if(free) {
            vAxis = new THREE.Vector3(0,0,1);
            hAxis = new THREE.Vector3(0,1,0);
        } 
        var mesh = _createMesh(position, hAxis, vAxis);
        mesh.origin = position;
        mesh.vertical = vAxis.normalize();
        mesh.lambda_v = 0;
        mesh.horizontal = hAxis.normalize();
        mesh.lambda_h = 0;
        mesh.azimuth = 0;
        mesh.translate = true;
        mesh.height = height;
        mesh.width = width;
        mesh.free = free;
        
        var c = -(mesh.clipping.normal.dot(position));
        mesh.clipping.set ( mesh.clipping.normal, c);

        mesh.name = "sensor";
        SensObject.add(mesh);
        return mesh;
    };

    this.deleteSensor = function (sensor) {
        sensor.position.set(1000,1000,1000);
        this.remove(sensor);
        SensObject.remove(sensor);
        sensor.geometry.dispose();
        sensor.material.dispose();
    }

    this.getSensors = function() {
        return SensObject.children;
    }

    // this function will find angle between i (vector in the plane)
    // and p when projected on a plane with normal n.
    var getAngle = function (n, i, p) {
        var scale = -1 * p.dot(n);
        var projection = p.addScaledVector(n, scale).normalize();
        return Math.acos(projection.dot(i));
    }

    this.getPositionData = function(sensor, point) {
        var position = new THREE.Vector3().copy(sensor.position);
        var azimuth = getAngle(sensor.vertical, sensor.direction, new THREE.Vector3().copy(point).addScaledVector(position, -1));
        if(Number.isNaN(azimuth)){
            azimuth = 0;
        }
        var distance = new THREE.Vector3().copy(point).addScaledVector(position, -1);

        var data = {distance: distance.length(), azimuth: (azimuth)};
        return data;
    }

    var _dragControls = new DragControls(SensObject.children, _camera, _domElement);

    _dragControls.addEventListener( 'hoveron', function ( event ) {
            _cleanUp();
            _attachGizmos(event.object);
    } );

    //scope.dispatchEvent( { type: 'sensorRotate' } );

    _dragControls.addEventListener( 'dragstart', function ( event ) {
        if(_orbit != null) {
            _orbit.enabled = false;
        }
    });

    _dragControls.addEventListener ( 'drag', function( event ){
        if(_selectedSensor.free) {
            _translation.position.set(_selectedSensor.x, _selectedSensor.y, _selectedSensor.z);
            updateList();
            return;
        }
        var O = _selectedSensor.origin;
        var P = event.object.position;
        var vector = new THREE.Vector3(P.x - O.x, P.y - O.y, P.z - O.z);
        var lambda_v = vector.dot(_selectedSensor.vertical);
        if(Math.abs(lambda_v)<_selectedSensor.height) {
            _selectedSensor.lambda_v = lambda_v;
        }
        var lambda_h = vector.dot(_selectedSensor.horizontal);
        if(Math.abs(lambda_h)<_selectedSensor.width) {
            _selectedSensor.lambda_h = lambda_h;
        }
        var new_pos = new THREE.Vector3(0,0,0);
        new_pos.add(_selectedSensor.origin).addScaledVector(_selectedSensor.vertical, _selectedSensor.lambda_v).addScaledVector(_selectedSensor.horizontal, _selectedSensor.lambda_h);

        _selectedSensor.position.x = new_pos.x;
        _selectedSensor.position.y = new_pos.y;
        _selectedSensor.position.z = new_pos.z;

        if(_translation != null) {
            _translation.position.set(new_pos.x, new_pos.y, new_pos.z);
        }
        updateList();
    })

    _dragControls.addEventListener( 'dragend', function ( event ) {
        if(_orbit != null) {
            _orbit.enabled = true;
        }
        scope.dispatchEvent( { type: 'sensorTranslate' } );
    });

    var _cleanUp = function () {
        if(_translation.visible != false) {
            _translation.visible = false;
            _translation.children[0].geometry.dispose();
            _translation.children[0].material.dispose();
            _translation.children[1].geometry.dispose();
            _translation.children[1].material.dispose();
            _translation.remove(_translation.children[1]);
            _translation.remove(_translation.children[0]);
        }
        if(currentController != null) {
            gui.remove(currentController);
            currentController = null;
        }
        if(_selectedSensor != null) {
            _selectedSensor.scale.set(1, 1, 1);
            _selectedSensor = null;
        }
    }

    var _attachGizmos = function (object) {
        _cleanUp();
        _selectedSensor = object;
        _setupTranslationGizmo(_selectedSensor.position, _selectedSensor.horizontal, _selectedSensor.vertical);
        params.azimuth = _selectedSensor.azimuth;
        currentController = gui.add( params, 'azimuth', -Math.PI, Math.PI ).name('Rotate sensor').step( 0.01 ).onChange( function ( value ) {
            _selectedSensor.direction.applyAxisAngle(_selectedSensor.vertical,  value - _selectedSensor.azimuth)
            var m = new THREE.Vector3().copy(_selectedSensor.position).add(_selectedSensor.direction);
            _selectedSensor.lookAt(m);
            _selectedSensor.azimuth = value;
            scope.dispatchEvent( { type: 'sensorRotate' } );
        } );

    }

    var _setupTranslationGizmo = function (position, hAxis, vAxis) {
        var material = new THREE.LineBasicMaterial( {
            depthTest: false,
            depthWrite: false,
            transparent: true,
            linewidth: 1,
            fog: false,
            color: 0xff0000
        } );
        var points = [];
        points.push( new THREE.Vector3(0,0,0));
        points.push( vAxis);
        var geometry = new THREE.BufferGeometry().setFromPoints( points );
        var vLine = new THREE.Line( geometry, material );

        var material = material.clone();
        material.color.set( 0x00ff00 );
        var points = [];
        points.push( new THREE.Vector3(0,0,0));
        points.push( hAxis);
        var geometry = new THREE.BufferGeometry().setFromPoints( points );
        var hLine = new THREE.Line( geometry, material );

        _translation.add(vLine);
        _translation.add(hLine);
        _translation.visible = true;

        _translation.position.set(position.x, position.y, position.z);
    }

    this.selectSensor = function(s) {
        if(s == null) {
            return;
        }
        _cleanUp();
        _attachGizmos(s);
    }

    this.updateGizmoSize = function() {
        if(_translation.visible) {
            var scaleVector = new THREE.Vector3();
            var scaleFactor = 20;
            var sprite = _translation;
            var scale = scaleVector.subVectors(_translation.position, _camera.position).length() / scaleFactor;
            sprite.scale.set(scale, scale, scale);
        }
        if(_selectedSensor != null) {
            //make it undoable
            var scaleVector = new THREE.Vector3();
            var scaleFactor = 9;
            var scale = scaleVector.subVectors(_translation.position, _camera.position).length() / scaleFactor;
            if(scale > 1) {
                _selectedSensor.scale.set(scale, scale, scale);
            }

        }
    }

}

SensorControls.prototype = Object.create(THREE.Object3D.prototype);
SensorControls.prototype.constructor = SensorControls;

export{SensorControls};
