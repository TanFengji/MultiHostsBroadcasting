var ClientData = require("./clientData.js");

function DataChannel(p2pConnection, peer){
	var self = this;
	var dataChannel;
	this.p2pConnection = p2pConnection;
	this.socket = ClientData.socket;
	this.peer = peer;
}

DataChannel.prototype.open = function(){
	var self = this;

	var dataChannelOptions = {
			ordered: true,
			reliable: true,
			negotiated: true,
			id: "myChannel"
	};

	this.dataChannel = this.p2pConnection.createDataChannel("label", dataChannelOptions);

	MessageEnum = {
			OFFER: "offer",
			ANSWER: "answer",
			TIMESTAMP: "timeStamp",
			TIMESTAMPRESPONSE: "timeStampResponse"
	}

	self.dataChannel.onerror = function (error) {
		console.log("Data Channel Error:", error);
	};

	self.dataChannel.onmessage = function (msg) {
		if (isJson(msg.data)){
			message = JSON.parse(msg.data);

			switch(message.type){

			case MessageEnum.OFFER:
				self.setupConnectionWithVideo();
				self.onOffer(message);
				break;

			case MessageEnum.ANSWER:
				self.onAnswer(message);
				break;

			case MessageEnum.TIMESTAMP:
				console.log("received time stamp");
				self.onTimeStamp(message);
				break;

			case MessageEnum.TIMESTAMPRESPONSE:
				self.onTimeStampResponse(message);
				break;
			}
		} else {
			message = msg.data + "<br />"
			document.getElementById("info").innerHTML += message;
		}
	};

	self.dataChannel.onopen = function () {
		console.log("dataChannel opened");
		self.dataChannel.send("connected.");
		self.socket.emit("dataChannelStatus", {
			type: "dataChannelStatus",
			status: "success"
		});
	};

	self.dataChannel.onclose = function () {
		console.log("The Data Channel is Closed");
	};
}

DataChannel.prototype.send = function(message){
	this.dataChannel.send(message);
}

//receive an spd answer
DataChannel.prototype.onOffer = function(sdpOffer){
	var self = this;
	sdpAnswer = new RTCSessionDescription(sdpOffer);
	this.p2pConnection.setRemoteDescription(sdpOffer, function(){
		self.p2pConnection.createAnswer(function (answer) {
			
			answer.sdp = answer.sdp.replace(/a=sendrecv/g,"a=recvonly");
			self.p2pConnection.setLocalDescription(answer);
			answer = JSON.stringify(answer);
			self.send(answer);
		},function(error){
			console.log(error);
		});
	}, function(){});
}

//receive an spd answer
DataChannel.prototype.onAnswer = function(sdpAnswer){
	sdpAnswer = new RTCSessionDescription(sdpAnswer);
	this.p2pConnection.setRemoteDescription(sdpAnswer,function(){}, function(){});
}

DataChannel.prototype.onTimeStamp = function(timeStamp){
	var respondTime = Date.now();
	var timeStampResponse = {
			type: "timeStampResponse",
			sendTime: timeStamp.sendTime,
			respondTime: respondTime
	}
	timeStampResponse = JSON.stringify(timeStampResponse);
	this.dataChannel.send(timeStampResponse);
}

DataChannel.prototype.onTimeStampResponse = function(timeStampResponse){
	var self = this;
	receiveTime = Date.now();

	this.socket.emit("timeStamp", {
		type: "timeStamp",
		peer: self.peer,
		sendTime: message.sendTime,
		respondTime: message.respondTime,
		receiveTime: receiveTime
	});
}

DataChannel.prototype.setupConnectionWithVideo = function(){
}

function isJson(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}

module.exports = DataChannel;