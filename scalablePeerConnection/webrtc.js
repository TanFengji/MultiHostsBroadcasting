var ClientData = require("./clientData.js");
var AllConnection = require("./allconnection.js");
var io = require("socket.io-client");

function WebRTC(server){
	var self = this;
	var user;
	var peerList;
	this.initPeerNo = 0;
	this.latencyList = [];
	this.peerNo = 0;
	this.connectionBuilt = 0;
	//this.latencyList = {};
	this.latencyListSize = 0;
	this.allConnection = new AllConnection();;
	this.socket = io(server);
	ClientData.setSocket(this.socket);

	// when a datachannel setup ready
	self.socket.on("dataChannelStatus", function(dataChannelStatusData){
		if (dataChannelStatusData.status === "success"){
			self.connectionBuilt++;
			if (self.connectionBuilt === self.initPeerNo){
				self.initPeerNo = 0;
				self.sendTimeStamp();
				/*setInterval(function(){
					self.sendTimeStamp();
				}, 10000);*/
			}
		}
	});

//	when user and a peer finish transfering their time stamp
	self.socket.on("timeStamp", function(timeStampData){
		var timeStamp = {};
		timeStamp.peer = timeStampData.peer;
		timeStamp.latency = timeStampData.receiveTime - timeStampData.sendTime;
		self.latencyList.push(timeStamp);

		self.latencyListSize++ ; 
		if (self.latencyListSize === self.peerNo){

			self.socket.emit("newUser", {
				type: "newUser",
				user: self.user,
				latency: self.latencyList
			});
			self.clearTimeStamp();
		}


	});

//	responde to different socket received from server

	self.socket.on("feedback", function(feedback) {
		document.getElementById("feedback").value = feedback;
	});

//	receive a sdp offer
	self.socket.on("SDPOffer", function(sdpOffer) {
		self.allConnection.onOffer(sdpOffer, function(){
		});
	});

//	receive a sdp answer
	self.socket.on("SDPAnswer", function(sdpAnswer) {
		self.allConnection.onAnswer(sdpAnswer);
	});

//	receive an ice candidate
	self.socket.on("candidate", function(iceCandidate) {
		self.allConnection.onCandidate(iceCandidate);
	});

//	initialize 1 way peer connection or start host's camera
	self.socket.on("initConnection", function(peer){
		self.allConnection.initConnection(peer);
	});

//	delete peer connection when peer left
	self.socket.on("deleteConnection", function(peerData){
		self.allConnection.deleteConnection(peerData.peer);
		self.peer = null;
	});

	self.socket.on("message", function(messageData){
		self.onMessage(messageData);
	});

	self.socket.on("startBroadcasting", function(){
		self.onStartBroadcasting(function(){
			self.sendTaskStatus();
		});
	})

	self.socket.on("startForwarding", function(userData){
		self.onStartForwarding(userData);
	});

	self.socket.on("stopForwarding", function(task){
		self.onStopForwarding(task);
	});

}

//find more details of following api in readme
WebRTC.prototype.login = function(userName, successCallback, failCallback) {
	var self = this;
	this.socket.emit("login", userName);
	this.socket.on("login", function(loginResponse){
		if (loginResponse.status === "success") {
			ClientData.setUser(loginResponse.userName);
			ClientData.setIceServerConfig(loginResponse.config);
			self.user = loginResponse.userName;
			self.allConnection.init();
			successCallback();
		} else if (loginResponse.status === "fail") {
			failCallback();
		}
	});
}

WebRTC.prototype.createRoom = function(roomId, successCallback, failCallback){
	var self = this;
	this.socket.emit("createRoom", roomId);
	this.socket.on("createRoom", function(createRoomResponse){
		if (createRoomResponse.status === "success") {
			successCallback();
		} else if (createRoomResponse.status === "fail") {
			failCallback();
		}
	});
}

WebRTC.prototype.joinRoom = function(roomId, successCallback, failCallback) {
	var self = this;
	this.socket.emit("joinRoom", roomId);
	this.socket.on("joinRoom", function(joinRoomResponse){
		if (joinRoomResponse.status === "success") {
			self.peerList = joinRoomResponse.userList;
			self.socket.emit("message", {
				type: "message",
				action: "join",
				user: self.user,
				content: ""
			});

			for (var peer in self.peerList){
				self.initPeerNo++;
			}

			for (var peer in self.peerList){
				self.allConnection.initConnection(peer);
			}

			successCallback();
		} else if (joinRoomResponse.status === "fail") {
			failCallback();
		}
	});
}

WebRTC.prototype.onUserDisconnect = function(userDisconnected){
}

WebRTC.prototype.sendChatMessage = function(chatMessage){
	var self = this;
	for (var peer in self.allConnection.connection){
		self.allConnection.connection[peer].dataChannel.send(chatMessage);
	}
}

WebRTC.prototype.onMessage = function(messageData){
}

WebRTC.prototype.setIceServer = function(iceServers){
	this.allConnection.setIceServer(iceServers);
}

WebRTC.prototype.sendTimeStamp = function(){
	var self = this;

	for (var peer in self.allConnection.connection){
		self.peerNo++;
		var time = Date.now();
		var timeStamp = {
				type: "timeStamp",
				sendTime: time
		}
		timeStamp = JSON.stringify(timeStamp);
		self.allConnection.connection[peer].dataChannel.send(timeStamp);
	}
}

WebRTC.prototype.clearTimeStamp = function(){
	this.latencyList = [];
	this.peerNo = 0;
	this.connectionBuilt = 0;
	this.latencyListSize = 0;
}

WebRTC.prototype.onStartBroadcasting = function(cb){
	this.allConnection.initCamera();
	cb();
}

WebRTC.prototype.onStartForwarding = function(userData, cb){
	var self = this;
	if (userData.parent === this.user){
		console.log("addvideo");
		this.allConnection.addVideo(userData.child);
	}else if (userData.child === this.user){
		console.log("onaddvideo");
		this.allConnection.onAddVideo(userData.parent, function(){
			self.sendTaskStatus();
		});
	}
}

WebRTC.prototype.onStopForwarding = function(task){
	if (task.child === this.user){
		this.allConnection.stopForwarding(task.parent);
		self.sendTaskStatus();
	}else {
		this.allConnection.stopForwarding(task.child);
	}
}

WebRTC.prototype.sendTaskStatus = function(){
	console.log(Date.now());
	this.socket.emit("taskFinish");
}

module.exports = WebRTC;
