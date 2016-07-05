var PeerConnection = require('./peerconnection.js');
var Indicator = require('./indicator.js');

function AllConnection(){
	var parentDataChannel;
	var local;
	var stream;
	var socket;
	var configuration;
	var localVideo;
	var sourceBuffer;
	this.peerList = [];
	this.connection = {};
	this.indicator = new Indicator();
	this.ms = new MediaSource();
	this.chunkUpdating = false;
	this.chunks = [];
	this.videoData = [];
	this.chunkSize = 10000;
}

//initialise the setup of AllConnection
AllConnection.prototype.init = function(user, socket, config){
	var self = this;
	var sourceBuffer;
	this.local = user;
	this.socket = socket;
	this.configuration = config;
	this.localVideo = document.getElementById("localVideo");
	this.localVideo.src = window.URL.createObjectURL(this.ms);
	this.localVideo.autoplay = true;
	this.ms.addEventListener('sourceopen', function(){
		// this.readyState === 'open'. Add source buffer that expects webm chunks.
		self.sourceBuffer = self.ms.addSourceBuffer('video/webm; codecs="vorbis,vp9"');
		self.sourceBuffer.mode = "sequence";
		window.sourceBuffer = self.sourceBuffer;
		console.log(self.sourceBuffer);
	});
	window.localVideo = this.localVideo;
	window.localVideo2 = document.getElementById("localVideo2");
}

//initialise the setup of own camera
AllConnection.prototype.initCamera = function(){
	var self = this;

	if (self.indicator.hasUserMedia()) {
		navigator.getUserMedia({ video: true, audio: true }, function(stream){
			self.stream = stream;
			self.localVideo.src = window.URL.createObjectURL(stream);
		}, function (error) {
			console.log(error);
		});
	} else {
		alert("Sorry, your browser does not support WebRTC.");
	}
}

//initialise a connection with peers
AllConnection.prototype.initConnection = function(peer){	
	var self = this;
	self.localVideo = document.getElementById("localVideo");
	self.localVideo.autoplay = true;
	self.connection[peer] = new PeerConnection(self.local, peer, self.socket, self.configuration, self.sourceBuffer);
	self.connection[peer].startConnection(function(){
		self.connection[peer].openDataChannel(function(){
			self.connection[peer].setupPeerConnection(peer, function(){
				self.connection[peer].makeOffer( function(offer){
					self.connection[peer].p2pConnection.setLocalDescription(offer,function(){}, function(){});
					self.socket.emit("SDPOffer", {
						type: "SDPOffer",
						local: self.local,
						remote: peer,
						offer: offer
					});
				});
			});
		});
	});
}

//when receive an spd offer
AllConnection.prototype.onOffer = function(sdpOffer, cb){
	var self = this;
	self.localVideo = document.getElementById("localVideo");
	self.localVideo.autoplay = true;
	var peer = sdpOffer.remote;
	self.connection[peer] = new PeerConnection(self.local, peer, self.socket, self.configuration, self.sourceBuffer);
	self.connection[peer].startConnection(function(){
		self.connection[peer].openDataChannel(function(){
			self.connection[peer].setupPeerConnection(peer, function(){
				self.connection[sdpOffer.remote].receiveOffer(sdpOffer.offer, function(sdpAnswer){
					self.socket.emit("SDPAnswer", {
						type: "SDPAnswer",
						local: self.local,
						remote: sdpOffer.remote,
						answer: sdpAnswer
					});
				});
			});
		});
	});
}

//set the ICE server 
AllConnection.prototype.setIceServer = function(iceServers){
	this.iceServers = iceServers;
}

AllConnection.prototype.addVideo = function(peer){
	var self = this;
	this.connection[peer].addVideo(self.stream);
}

AllConnection.prototype.onAddVideo = function(peer){
	var self = this;
	this.connection[peer].dataChannel.setLocalStream = function(stream){
		self.stream = stream;
		console.log(self.stream);
	};
}

AllConnection.prototype.setLocalStream = function(stream){
	console.log("set local stream in allconnection");
	console.log(stream);
	this.stream = stream;
}

AllConnection.prototype.stopForwarding = function(peer){
	var self = this;
	console.log("remove stream");
	this.connection[peer].p2pConnection.removeStream(self.stream);
}

//when receive an spd answer
AllConnection.prototype.onAnswer = function(sdpAnswer, cb){
	this.connection[sdpAnswer.remote].receiveAnswer(sdpAnswer.answer);
}

//when receive an ice candidate
AllConnection.prototype.onCandidate = function(iceCandidate){
	this.connection[iceCandidate.remote].addCandidate(iceCandidate);
}

AllConnection.prototype.deleteConnection = function(peer){
	var self = this;
	//this.connection[peer].p2pConnection.removeStream(self.stream);
	this.connection[peer].p2pConnection.onicecandidate = null; 
	this.connection[peer].p2pConnection.onaddstream = null;
	this.connection[peer].p2pConnection.close();
	this.connection[peer].p2pConnection = null;
	this.connection[peer] = null;
}

module.exports = AllConnection;