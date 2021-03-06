/*
 * The MIT License (http://www.opensource.org/licenses/mit-license.html)
 *
 * Copyright (c) 2014 Tribalyte Technologies S.L. (http://www.tribalyte.com/)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*
 * Myo Cordova plugin test application
 */

var initMyoDemoApp = function(){
	if(cordova && cordova.plugins && cordova.plugins.MyoApi){
		console.log("Myo plugin found!!");
	}else{
		console.log("Myo plugin NOT found!!");
		return;
	}

	//Helper alias and functions
	function docElem(id){
		return document.getElementById(id);
	}
	function setVisible(elemId, isVisible){
		docElem(elemId).setAttribute("style", (isVisible ? "display:block;" : "display:none;"));
	}
	var uiElementsIds = ["myoConnecting", "myoConnected", "myoSensorData"];
	var visibilityMap = {
		"connecting":		[true, false, false],
		"connected":		[false, true, false],
		"initial":			[false, false, false],
		"sensor data":		[false, false, true]
	};
	var prevUiState = null;
	var currentUiState = null;
	function showUiState(stateId){
		var visibilityConf = visibilityMap[stateId];
		if(visibilityConf){
			for(var i = 0; i < uiElementsIds.length; ++i){
				setVisible(uiElementsIds[i], visibilityConf[i]);
			}
			prevUiState = currentUiState;
			currentUiState = stateId;
		}else{
			console.log("ERROR: unkown UI state: " + stateId);
		}
	};

	var MyoApi = cordova.plugins.MyoApi;
	var apiInited = false;
	var myMyo = null;
	var myMyoLocked = null;

	function initApi(){
		MyoApi.init(function(){
			console.log("Myo Hub initialized successfully");
			/*MyoApi.setLockingPolicy(MyoApi.LockingPolicy.NONE, function(){
				console.log("Locking policy set to NONE successfully");
			}, function(err){
				console.log("ERROR: couldn't set locking policy: " + err);
			});*/
			apiInited = true;
		}, function(err){
			window.alert("Error initializing the Myo Hub: " + err);
		});
	}
	function checkBluetooth(btOnCallback){
		MyoApi.isBluetoothEnabled(function(isBtOn){
			console.log("The bluetooth adater is " + (isBtOn ? "ON" : "OFF") );
			if(isBtOn){
				if(btOnCallback){
					btOnCallback();
				}
			}else{
				MyoApi.openBluetoothConfig(function(didEnableBt){
					if(didEnableBt){
						console.log("Bluetooth enabled by the user");
						if(btOnCallback){
							btOnCallback();
						}
					}else{
						window.alert("You need to enable the Bluetooth adapter in order to use Myo");
					}
				}, function(err){
					window.alert("Error opening Bluetooth configuration: " + err);
				});
			}
		}, function(err){
			window.alert("Error checking Bluetooth adapter state: " + err);
		});
	}
	function logMyoEvent(arg){
		console.log("Myo event: " + JSON.stringify(arg));
	}
	function alertMyoEvent(ev){
		logMyoEvent(ev);
		window.alert("Event: " + ev.eventName);
	}
	function alertMyoPose(ev){
		logMyoEvent(ev);
		if(ev.pose !== MyoApi.Pose.REST){
			window.alert("Pose detected: " + ev.pose);
		}
	}

	initApi();

	MyoApi
	.on("connect", function(ev){
		myMyo = ev.myo;
		myMyo.isUnlocked(function(isUnlocked){ //Could also use the "lock" / "unlock" events
			console.log("Is Myo unlocked? " + isUnlocked);
			myMyoLocked = !isUnlocked;
			console.log("Is Myo locked? " + myMyoLocked);
		}, function(err){
			console.log("ERROR: requesting lock state: " + err);
		});
		window.alert("My " + ev.myo.name + " has connected");
		logMyoEvent(ev);
		showUiState("connected");
		docElem("myoName").innerHTML = myMyo.name;
	}, function(err){
		console.log("ERROR: onConnect: " + err);
	})
	.on("disconnect", function(ev){
		if(ev.myo.equals(myMyo)){
			window.alert("My " + ev.myo.name + " has disconnected");
		}else{
			window.alert("Unknown Myo '" + ev.myo.name + "' has disconnected");
		}
		myMyo = null;
		logMyoEvent(ev);
		showUiState("initial");
	})
	.on("attach", function(ev){
		logMyoEvent(ev);
		localStorage["lastUsedMyoMac"] = ev.myo.macAddress;
		console.log("Myo MAC address stored for easier future connection: " + localStorage["lastUsedMyoMac"]);
	})
	.on("detach", function(ev){
		if(myMyo){
			window.alert(myMyo.name + " has detached");
		}else{
			window.alert("Received detach event from unknown Myo");
		}
		myMyo = null;
		logMyoEvent(ev);
		showUiState("initial");
	});

	MyoApi
	.on("armSync", alertMyoEvent)
	.on("armUnsync", alertMyoEvent)
	.on("unlock", logMyoEvent)
	.on("lock", logMyoEvent)
	.on("pose", alertMyoPose, function(err){
		console.log("ERROR: onPose: " + err);
	})
	.on("rssi", logMyoEvent);

   MyoApi.on("orientationData", function(data){
      console.log(data);
       console.log("!");
   });
    
	docElem("btnAttachLast").onclick = function(){
		console.log("Clicked on attach last button");
		showUiState("connecting");
		if(!apiInited){
			initApi();
		}
		checkBluetooth(function(){
			var lastMac = localStorage["lastUsedMyoMac"];
			if(lastMac){
				MyoApi.attachByMacAddress(lastMac, function(res){
					console.log("Attach command sent to MAC " + lastMac + ": " + res);
				}, function(err){
					console.log("ERROR sending attach to MAC command: " + err);
				});
			}else{
				window.alert("No previous Myo known");
			}
		});
	};

	docElem("btnAttachClosest").onclick = function(){
		console.log("Clicked on attach closest button");
		showUiState("connecting");
		if(!apiInited){
			initApi();
		}
		checkBluetooth(function(){
			MyoApi.attachToAdjacentMyo(function(res){
			console.log("Attach command sent: " + res);
			}, function(err){
				console.log("ERROR sending attach command: " + err);
			});
		});
	};

	docElem("btnScan").onclick = function(){
		console.log("Clicked on scan button");
		MyoApi.openScanDialog();
	};

	docElem("btnVibrateMyo").onclick = function(){
		console.log("Clicked on vibrate myo button");
		if(myMyo){
			myMyo.vibrate(MyoApi.VibrationType.MEDIUM, function(){
				console.log("Vibration sent successfully");
			}, function(err){
				console.log("ERROR: couldn't send vibration: " + err);
			});
		}else{
			window.alert("There are no Myos connected at the moment");
		}
	};

	docElem("btnShowMyo").onclick = function(){
		console.log("Clicked on show myo button");
		window.alert("Current connected Myo: " + JSON.stringify(myMyo));
	};

	docElem("btnListDevices").onclick = function(){
		console.log("Clicked on list devices button");
		MyoApi.getConnectedDevices(function(devList){
			window.alert("Connected devices: " + JSON.stringify(devList));
		}, function(err){
			console.log("ERROR: couldn't get connected device list");
		});
	};

	docElem("btnDetach").onclick = function(){
		console.log("Clicked on detach button");
		if(myMyo){
			var myoMac = myMyo.macAddress;
			MyoApi.detach(myoMac, function(){
				console.log("Detach from " + myoMac + " command sent");
			}, function(err){
				console.log("ERROR: sending detach from " + myoMac + " command");
			});
			myMyo = null;
		}else{
			window.alert("No Myo currently attached");
		}
	};

	docElem("btnShutdown").onclick = function(){
		console.log("Clicked on shutdown button");
		MyoApi.shutdown();
		apiInited = false;
		showUiState("initial");
	};

	function createSensorDataHandler(txtElemId, eventDataField, isQuaternion){
		var NUM_PREC = 3;
		var txtElement = docElem(txtElemId);
		var prevTimestamp = null;
		return function(ev){
			var d = ev[eventDataField];
			var txt = "X: " + d.x.toFixed(NUM_PREC)
				+ " Y: " + d.y.toFixed(NUM_PREC)
				+ " Z: " + d.z.toFixed(NUM_PREC);
			if(isQuaternion){
				txt += " W: " + d.w.toFixed(NUM_PREC)
					+ "<br>&nbsp;&nbsp;\\\\\\ Roll: " + d.roll.toFixed(NUM_PREC)
					+ " Pitch: " + d.pitch.toFixed(NUM_PREC)
					+ " Yaw: " + d.yaw.toFixed(NUM_PREC);
			}
			//Uncomment to see timing info
			/*if(prevTimestamp){
				txt += " deltaMs: " + (ev.timestamp -  prevTimestamp).toFixed(NUM_PREC);
			}*/
			txtElement.innerHTML = txt;
			prevTimestamp = ev.timestamp;
		};
	}

	var isSensorMode = false;
	docElem("btnSensorMode").onclick = function(){
		console.log("Clicked on sensor mode button. Is sensor mode? " + isSensorMode);
		if(!isSensorMode){
			if(myMyo){
				MyoApi
				.on("orientationData", createSensorDataHandler("sensOrientationData", "rotation", true))
				.on("accelerometerData", createSensorDataHandler("sensAccelerometerData", "accel"))
				.on("gyroscopeData", createSensorDataHandler("sensGyroscopeData", "gyro"));
				showUiState("sensor data");
				isSensorMode = true;
			}else{
				window.alert("No Myo currently attached");
			}
		}else{
			MyoApi
			.off("orientationData")
			.off("accelerometerData")
			.off("gyroscopeData");
			showUiState(prevUiState ? prevUiState : "initial");
			isSensorMode = false;
		}
	};

	showUiState("initial");
    
    var fun = function(){
		console.log("Clicked on attach closest button");
		checkBluetooth(function(){
			MyoApi.attachToAdjacentMyo(function(res){
			console.log("Attach command sent: " + res);
			}, function(err){
				console.log("ERROR sending attach command: " + err);
			});
		});
	};
    


};

document.addEventListener('deviceready', function(){
	var parentElement = document.getElementById('deviceready');
	var listeningElement = parentElement.querySelector('.listening');
	var receivedElement = parentElement.querySelector('.received');
	listeningElement.setAttribute('style', 'display:none;');
	receivedElement.setAttribute('style', 'display:block;');
	initMyoDemoApp();
}, false);