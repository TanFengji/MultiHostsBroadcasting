var DataChannel = require('./dataChannel.js');

function PeerConnection(local, peer, socket, config, sourceBuffer){
	var p2pConnection;
	var indicator;
	var dataChannel;
	this.sourceBuffer = sourceBuffer;
	this.user = local;
	this.remote = peer;
	this.socket = socket;
	this.configuration = config;
}

//Visitor setup the p2p connection with a peer
PeerConnection.prototype.setupPeerConnection = function(peer, cb) {
	var self = this;

//	Setup ice handling
	this.p2pConnection.onicecandidate = function (event) {
		if (event.candidate) {
			self.socket.emit("candidate", {
				type: "candidate",
				local: self.user,
				remote: peer,
				candidate: event.candidate
			});
		}
	};
	cb();
}

//initialise p2pconnection at the start of a peer connection 
PeerConnection.prototype.startConnection = function(cb){
	this.p2pConnection = new RTCPeerConnection(this.configuration);
	cb();
}

PeerConnection.prototype.openDataChannel = function(cb){
	var self = this;
	this.dataChannel = new DataChannel(self.p2pConnection, self.socket, self.remote, self.sourceBuffer);
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
			console.log(self.p2pConnection.localDescription);
			console.log(self.p2pConnection.remoteDescription);
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
	console.log(this.p2pConnection.localDescription);
	console.log(this.p2pConnection.remoteDescription);
}

//add video
PeerConnection.prototype.addVideo = function(stream){
	var self = this;
	this.p2pConnection.addStream(stream);
	console.log(stream);
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