import * as THREE from '../node_modules/three/build/three.module.js';

var sensorControls;

//Called when the add sensor button is clicked.
function addSensor(){
    var i1 = parseFloat(document.getElementById('i1').value);
    var i2 = parseFloat(document.getElementById('i2').value);
    var i3 = parseFloat(document.getElementById('i3').value);
    sensorControls.createSensor(new THREE.Vector3(i1,i2,i3), new THREE.Vector3(-1,1,0), new THREE.Vector3(1, 1, 0), 1, 1, true);
    updateList();
}

var sensors;
//Calling this will discard the current list and rebuild from the SensorControls.
function updateList(){
    var sls = document.getElementById('sensorListScroll');
    sls.innerHTML = ''; //Delete current list
    sensors = sensorControls.getSensors();
    for (var i = 0; i < sensors.length; i++){
        var div = document.createElement("div");
        div.className = "sensor";
        div.setAttribute("data-sensorNumber", i); //Each sensor div needs to remember which sensor it is to call methods on itself
        div.addEventListener('click', function(){sensorControls.selectSensor(sensors[this.getAttribute("data-sensorNumber")]);updateList();});

        div.innerHTML = "<textarea class=\"coordBox\" rows=\"1\" style=\"height: 20px; background: rgb(128,103,135);\" onclick=\"this.focus();this.select()\">" + Math.round(sensors[i].position.x * 10)/10 + "</textarea>";
        div.innerHTML += "<textarea class=\"coordBox\" rows=\"1\" style=\"height: 20px; background: rgb(128,103,135);\" onclick=\"this.focus();this.select()\">" + Math.round(sensors[i].position.y * 10)/10 + "</textarea>";
        div.innerHTML += "<textarea class=\"coordBox\" rows=\"1\" style=\"height: 20px; background: rgb(128,103,135);\" onclick=\"this.focus();this.select()\">" + Math.round(sensors[i].position.z * 10)/10 + "</textarea>";
        div.childNodes[0].addEventListener('change', function(){sensors[this.parentElement.getAttribute("data-sensorNumber")].position.x = parseFloat(this.value)});
        div.childNodes[1].addEventListener('change', function(){sensors[this.parentElement.getAttribute("data-sensorNumber")].position.y = parseFloat(this.value)});
        div.childNodes[2].addEventListener('change', function(){sensors[this.parentElement.getAttribute("data-sensorNumber")].position.z = parseFloat(this.value)});

        var deleteButton = document.createElement("div");
        deleteButton.setAttribute("data-sensorNumber", i);
        deleteButton.addEventListener('click', function(){sensorControls.deleteSensor(sensors[this.getAttribute("data-sensorNumber")]);updateList();});
        deleteButton.style = "background : rgb(78,53,85)"
        deleteButton.innerHTML = "X";
        div.appendChild(deleteButton);

        div.appendChild(deleteButton);
        document.getElementById('sensorListScroll').appendChild(div);
    }
}

function initializeGui(sCtrls) {
    document.getElementById('addSensorButton').addEventListener('click', addSensor);
    sensorControls = sCtrls;
}

export{initializeGui};
export{updateList};
