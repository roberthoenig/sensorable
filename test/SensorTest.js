import * as THREE from './node_modules/three/build/three.module.js';

function SensorTest(_sensor, _mode, _radius, _segments, _sensorControls) {

    THREE.Object3D.call(this);
    var _test = _mode;

    var _colorGeometry = function(geometry1) {
        var count = geometry1.attributes.position.count;
        geometry1.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array( count * 3 ), 3 ) );
        var color = new THREE.Color();

        var positions1 = geometry1.attributes.position;
        var colors1 = geometry1.attributes.color;

        for ( var i = 0; i < count; i ++ ) {
            var point = new THREE.Vector3(
                positions1.getX( i ) + _sensor.position.x, 
                positions1.getY( i ) + _sensor.position.y , 
                positions1.getZ( i ) + _sensor.position.z); 

            var data = _sensorControls.getPositionData(_sensor, point);

            switch ( _test ) {
                case "azimuth":
                    var k = (data.azimuth) / (Math.PI); 
                    color.setHSL( lerp(0, 0.3, k), 1.0, 0.5 );
                    break;
            }
            colors1.setXYZ( i, color.r, color.g, color.b );
        }
    }

    var _geometry1 = new THREE.SphereBufferGeometry( _radius, _segments, _segments);
    _colorGeometry(_geometry1);

    var _material = new THREE.MeshPhongMaterial( {
        color: 0xffffff,
        flatShading: true,
        transparent: true,
        opacity: 0.5,
        vertexColors: THREE.VertexColors,
        shininess: 0
    } );

    var _mesh = new THREE.Mesh(_geometry1, _material );
    this.add(_mesh);
    this.position.x = _sensor.position.x;
    this.position.y = _sensor.position.y;
    this.position.z = _sensor.position.z;
    


    function lerp(a, b, n) {
        return (1 - n) * a + n * b;
    }

    
    
    this.setMode = function(new_mode){
        _test = new_mode;
        _updateGeometry(this)
    }

    function _updateGeometry(it) {
        it.position.x = _sensor.position.x;
        it.position.y = _sensor.position.y;
        it.position.z = _sensor.position.z;

        var geometry = new THREE.SphereBufferGeometry( _radius, _segments, _segments);
        _colorGeometry(geometry);

        it.remove(_mesh);
        _mesh.geometry.dispose();
        _mesh.geometry = geometry;
        it.add(_mesh);
    }

    this.updateColors = function() {
        _updateGeometry(this);
    }

}

SensorTest.prototype = Object.create(THREE.Object3D.prototype);
SensorTest.prototype.constructor = SensorTest;

export{SensorTest};