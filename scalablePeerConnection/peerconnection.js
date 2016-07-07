var ClientData = require("./clientData.js");
var DataChannel = require('./dataChannel.js');

function PeerConnection(peer){
	var p2pConnection;
	var indicator;
	var dataChannel;
	this.peer = peer;
	this.user = ClientData.getUser();
	this.socket = ClientData.getSocket();
}

//Visitor setup the p2p connection with a peer
PeerConnection.prototype.setupPeerConnection = function(cb) {
	var self = this;

//	Setup ice handling
	this.p2pConnection.onicecandidate = function (event) {
		if (event.candidate) {
			self.socket.emit("candidate", {
				type: "candidate",
				local: self.user,
				remote: self.peer,
				candidate: event.candidate
			});
		}
	};
	cb();
}

//initialise p2pconnection at the start of a peer connection 
PeerConnection.prototype.startConnection = function(cb){
	this.p2pConnection = new RTCPeerConnection(ClientData.getIceServerConfig());
	cb();
}

PeerConnection.prototype.openDataChannel = function(cb){
	var self = this;
	this.dataChannel = new DataChannel(self.p2pConnection, self.peer);
	this.dataChannel.open();
	cb();
}


//make an sdp offer
PeerConnection.prototype.makeOffer = function(cb)	{
	var self = this;
	this.p2pConnection.createOffer(function (sdpOffer) {
		cb(sdpOffer);
	}, function(error){
		console.log(error);
	});
}

//receive an sdp offer and create an sdp answer
PeerConnection.prototype.receiveOffer = function(sdpOffer, cb){
	var self = this;
	sdpOffer = new RTCSessionDescription(sdpOffer);
	this.p2pConnection.setRemoteDescription(sdpOffer, function(){
		self.p2pConnection.createAnswer(function (answer) {
			//answer.sdp = answer.sdp.replace(/a=sendrecv/g,"a=recvonly");
			self.p2pConnection.setLocalDescription(answer);
			cb(answer);
		},function(error){
			console.log(error);
		});
	}, function(){});
}

//receive an spd answer
PeerConnection.prototype.receiveAnswer = function(sdpAnswer){
	sdpAnswer = new RTCSessionDescription(sdpAnswer);
	this.p2pConnection.setRemoteDescription(sdpAnswer,function(){}, function(){});

}

//add video
PeerConnection.prototype.addVideo = function(stream){
	var self = this;

	if (this.p2pConnection.getLocalStreams().length === 0){
		console.log("add stream");
		this.p2pConnection.addStream(stream);
	} else {
		console.log("delete stream and add stream");
		this.p2pConnection.removeStream(self.p2pConnection.getLocalStreams()[0]);
		this.p2pConnection.addStream(stream);
	}

	this.makeOffer( function(sdpOffer){
		sdpOffer.sdp = sdpOffer.sdp.replace(/a=sendrecv/g,"a=sendonly");
		self.p2pConnection.setLocalDescription(sdpOffer,function(){}, function(){});
		sdpOffer = JSON.stringify(sdpOffer);
		self.dataChannel.send(sdpOffer);
	});
}

//add ice candidate when receive one
PeerConnection.prototype.addCandidate = function(iceCandidate) {
	this.p2pConnection.addIceCandidate(new RTCIceCandidate(iceCandidate.candidate), function(){}, function(){
		console.log("fail");
	});
}

module.exports = PeerConnection;