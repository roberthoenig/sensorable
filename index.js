import * as THREE from './node_modules/three/build/three.module.js';
import {WEBGL} from './node_modules/three/examples/jsm/WebGL.js';
import {PCDLoader} from './node_modules/three/examples/jsm/loaders/PCDLoader.js';
import {OrbitControls} from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import {SensorControls}  from './custom_modules/SensorControls.js';
import {TransformControls} from './node_modules/three/examples/jsm/controls/TransformControls.js';
import {initializeGui} from './custom_modules/gui.js'
import {InspectPlane}  from './custom_modules/InspectPlane.js';
import {PlaneModel}  from './custom_modules/PlaneModel.js';
import {floorPlane}  from './custom_modules/FloorPlan.js';
import {Colorer} from './custom_modules/Colorer.js';
import {WASM} from './custom_modules/WASM.js';
import { GUI } from './node_modules/three/examples/jsm/libs/dat.gui.module.js';
import {updateList} from '../custom_modules/gui.js';
import {TrajectoryTracking} from './custom_modules/TrajectoryTracking.js';

// This is called once all the WebAssembly has been loaded.
Module.onRuntimeInitialized = function() {

  WASM.initialize = Module.cwrap('initialize', null, []);
  // get_distance_to_first_intersection(ray_orig_x, ray_orig_y, ray_orig_z, ray_dir_x, ray_dir_y, ray_dir_z)
  WASM.get_distance_to_first_intersection = Module.cwrap(
    'get_distance_to_first_intersection', 'number', ['number','number','number','number','number','number']);
  WASM.initialize();
  WASM.is_loaded = true;

  const canvas = document.querySelector('#c');
  var scene = new THREE.Scene();
  console.log(canvas.clientWidth, canvas.clientHeight);
  var camera = new THREE.PerspectiveCamera( 75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000 );
  camera.position.z = 50;
  camera.up.set(0,0,1);

  var renderer = new THREE.WebGLRenderer({canvas});
  renderer.setSize( canvas.clientWidth, canvas.clientHeight );
  console.log("HELO WORLD");
  var orbitControls = new OrbitControls( camera, canvas );
  //The user will always be looking at the factory at 45 degree angle
  orbitControls.minPolarAngle = Math.PI/4;
  orbitControls.maxPolarAngle = Math.PI/4;

  var loader = new PCDLoader();

  var axesHelper = new THREE.AxesHelper( 10 );
  scene.add( axesHelper );

  var params = {
    plane_scale: true,
    plane_translate: false,
    plane_rotate: false,
    onClick_place: false,
    onClick_select: false
  }

  var gui = new GUI({hideable: false});
  gui.domElement.id = 'gui';

  var sensorGUI = gui.addFolder("Sensor Control");
  var sensorControls = new SensorControls(camera, renderer.domElement, orbitControls, sensorGUI);

  scene.add(sensorControls);
  initializeGui(sensorControls);

  var onClickGUI = gui.addFolder("On Wall Click");
  var onClickPlace = onClickGUI.add(params, 'onClick_place').name('Place a sensor').listen().onChange(
    function(){
      if(params.onClick_place) {
        params.onClick_select = false;
      }
    }
  );
  var onClickSelect = onClickGUI.add(params, 'onClick_select').name('Select the plane').listen().onChange(
    function(){
      if(params.onClick_select) {
        params.onClick_place = false;
      }
    }
  );
  var planeModel = new PlaneModel("../model.json", sensorControls);
  scene.add(planeModel);
  var mouse = new THREE.Vector2();
  var selected = null;
  var deleteController = null;

  canvas.addEventListener('mousedown', e => {
    mouse.x = ( event.clientX / canvas.clientWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / canvas.clientHeight ) * 2 + 1;
    if(params.onClick_select) {
      var p = planeModel.intersect(mouse, camera);
      if(p != selected && selected != null) {
        onClickGUI.remove(deleteController);
      }
      if(p!=null) {
        deleteController = onClickGUI.add({delete:function(){
          planeModel.deleteSelected();
          onClickGUI.remove(deleteController);
          selected = null;
        }}, 'delete').name('Delete Selected');
      }
      selected = p;
    }
    if(params.onClick_place) {
      planeModel.createSensor(mouse, camera);
      updateList();
    }
  });

  var showImage = function (secs) {
    var duration;
    getVideoImage(
      './path.MP4',
      function(totalTime) {
        duration = totalTime;
        return secs;
      },
      function(img, secs, event) {
        if (event.type == 'seeked') {
          document.getElementById('imgFrame').src = img.src;
        }
      }
    );
  }

var video = document.createElement('video');

function getVideoImage(path, secs, callback) {
    var me = this;
    video.onloadedmetadata = function() {
        if ('function' === typeof secs) {
        secs = secs(this.duration);
        }
        this.currentTime = Math.min(Math.max(0, (secs < 0 ? this.duration : 0) + secs), this.duration);
    };
    video.onseeked = function(e) {
        var canvas = document.createElement('canvas');
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var img = new Image();
        img.src = canvas.toDataURL();
        callback.call(me, img, this.currentTime, e);
    };
    video.onerror = function(e) {
        callback.call(me, undefined, undefined, e);
    };
    video.src = path;
  }

  var trajectoryGUI = gui.addFolder("Trajectory Controls");
  var trajectory = new TrajectoryTracking("trajectory.txt", trajectoryGUI, showImage);
  scene.add(trajectory);
  //Noah's light
  var dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.setScalar(10);
  scene.add(dirLight);

  var light = new THREE.AmbientLight( 0xffffff ); // soft white light
  scene.add( light );
  
  //add transform controls
  var transformControl = new TransformControls( camera, renderer.domElement );
  transformControl.addEventListener( 'change', function () {
      renderer.render( scene, camera );
  } );

  transformControl.addEventListener( 'dragging-changed', function ( event ) {
      orbitControls.enabled = ! event.value;
  } );
  transformControl.setMode( "translate" );

  var plane = new InspectPlane(10, 300, -1, camera, renderer, orbitControls);
  var colorer = new Colorer(sensorControls, plane);
  scene.add(plane);
  var inspectGUI = gui.addFolder("Inspection Plane Controls");
  var scale = inspectGUI.add(params, 'plane_scale').name('Scale').listen().onChange(
    function(){
      plane.setModeScale();
      params.plane_translate = false;
      params.plane_rotate = false;
    }
  );
  var rotate = inspectGUI.add(params, 'plane_rotate').name('Rotate').listen().onChange(
    function(){
      plane.setModeRotate();
      params.plane_translate = false;
      params.plane_scale = false;
    }
  );
  var translate = inspectGUI.add(params, 'plane_translate').name('Translate').listen().onChange(
    function(){
      plane.setModeTranslate();
      params.plane_scale = false;
      params.plane_rotate = false;
    }
  );

  sensorGUI.open();
  onClickGUI.open();
  trajectoryGUI.open();
  inspectGUI.open();

  var boundingBox;
  var planeSlider = document.getElementById("plane-slider");
  planeSlider.addEventListener("input", function () {
    var ratio = planeSlider.value / 100;
    var height = boundingBox.max.z;
    var base = boundingBox.min.z;
    plane.getObjectByName("plane").position.z = ratio * height + base;
  });

  function animate () {
    requestAnimationFrame( animate );
    sensorControls.updateGizmoSize();
    trajectory.updateBallSize(camera);
    orbitControls.update();
    plane.updateColors(colorer.getColor);
    renderer.render( scene, camera );
  };
 
  
  //Noah's floor plan
  var hullLoader = new THREE.FileLoader();
  hullLoader.setResponseType("json");
  var chull_file = "model_chull.json"; // changed by Ivan as this will be the name of the currently working point cloud
  var convex = [];

  //load a JSON file and output the result to the console
  hullLoader.load(
    // resource URL
    chull_file,

    // onLoad callback
    function ( data ) {
      for(var i = 0; i<data.length; i++){
        convex.push(data[i]["x"]);
        convex.push(data[i]["y"]);
      }
      var floor = floorPlane( 'assets/img/AstonFloorplan_cropped.jpeg', renderer, convex);

      transformControl.attach( floor );
      scene.add(transformControl);
      scene.add(floor);

      var floorParams = {
        floor_scale: false,
        floor_translate: true,
        floor_rotate: false,
        floor_reset: false,
      }

      //Adds the floor plan controls to the GUI
      var floorGUI = gui.addFolder("Floor Plan Controls");
      var floorScale = floorGUI.add(floorParams, 'floor_scale').name('Scale').listen().onChange(
        function(){
          if(transformControl.mode == "scale") {
            if(transformControl.object == null) {
                transformControl.attach(floor);
            } else {
                transformControl.detach();
            }
          } 
          else {
            transformControl.setMode("scale");
            transformControl.showZ = false;
            transformControl.showY = true;
            transformControl.showX = true;
            if(transformControl.object == null) {
                transformControl.attach(floor);
            }
          }
          transformControl.setMode( "scale" );
          floorParams.floor_translate = false;
          floorParams.floor_rotate = false;
        }
      );
      var floorRotate = floorGUI.add(floorParams, 'floor_rotate').name('Rotate').listen().onChange(
        function(){
          if(transformControl.mode == "rotate") {
            if(transformControl.object == null) {
                transformControl.attach(floor);
            } else {
                transformControl.detach();
            }
          } 
          else {
            transformControl.setMode("rotate");
            transformControl.showZ = true;
            transformControl.showY = false;
            transformControl.showX = false;
            if(transformControl.object == null) {
                transformControl.attach(floor);
            }
          }
            floorParams.floor_translate = false;
            floorParams.floor_scale = false;
        }
      );
      var floorTranslate = floorGUI.add(floorParams, 'floor_translate').name('Translate').listen().onChange(
        function(){
          if(transformControl.mode == "translate") {
            if(transformControl.object == null) {
                transformControl.attach(floor);
            } else {
                transformControl.detach();
            }
          } 
          else {
            transformControl.setMode("translate");
            transformControl.showZ = true;
            transformControl.showY = false;
            transformControl.showX = false;
            if(transformControl.object == null) {
                transformControl.attach(floor);
            }
          }
          floorParams.floor_scale = false;
          floorParams.floor_rotate = false;
        }
      );
      var haveDef = false;
      var floorReset = floorGUI.add(floorParams, 'floor_reset').name('Reset Plane').listen().onChange(
        function(){
          //load a text file and output the result to the console
          if(!haveDef){
            var defPlane;
        
            //Create plane
            var planeGeometry = new THREE.PlaneGeometry(89.85, 40, 1, 1);
            var texture = new THREE.TextureLoader().load('assets/img/AstonFloorplan_cropped.jpeg');
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            var planeMaterial = new THREE.MeshLambertMaterial( { map: texture } );
            planeMaterial.side = THREE.DoubleSide;
            defPlane = new THREE.Mesh(planeGeometry, planeMaterial);
            defPlane.name = "defPlane"
            console.log("DEFAULT PLANE CREATED")

            if(transformControl.object == null) {
              scene.remove(floor);
              floor = defPlane
              scene.add(floor);
              transformControl.attach(defPlane);
            }
            else{
              transformControl.detach(floor);
              scene.remove(floor);
              floor = defPlane
              scene.add(floor);
              transformControl.attach(floor);
            }
            haveDef = true;
        }
        else{
          floorParams.floor_reset = true;
        }
        }
      );

      floorGUI.open();
    },

    // onProgress callback
    function ( xhr ) {
      console.log( (xhr.loaded / xhr.total * 100) + '% loaded of HULL' );
    },

    // onError callback
    function ( err ) {
      console.error(err);
      console.error( 'An error happened in Noah hullLoader' );
    }
  );

  loader.load(
    'model.pcd',
    // called when the resource is loaded
    function ( mesh ) {
      mesh.name = "pointcloud";
      mesh.up = new THREE.Vector3(0, 0, 1); // Geoslam models have Z as up.
      //console.log(mesh);
      mesh.material.size = 0.10;
      scene.add( mesh );

      //Remove loading screen
      var loadingScreen = document.getElementById('overlay');
      loadingScreen.parentNode.removeChild(loadingScreen);
      if (WEBGL.isWebGLAvailable()) {
        animate();
      } else {
        var warning = WEBGL.getWebGLErrorMessage();
        document.getElementById( 'container' ).appendChild( warning );
      }
      boundingBox = new THREE.Box3().setFromObject( mesh );
  });

}
