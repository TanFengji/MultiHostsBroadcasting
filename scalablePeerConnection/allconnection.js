var ClientData = require("./clientData.js");
var PeerConnection = require("./peerconnection.js");
var Indicator = require("./indicator.js");

function AllConnection(){
	var stream;
	var localVideo;
	var sourceBuffer;
	var user;
	var socket;
	this.connection = {};
	this.indicator = new Indicator();
	this.ms = new MediaSource();
	this.chunkUpdating = false;
	this.chunks = [];
	this.videoData = [];
	this.chunkSize = 10000;
}

//initialise the setup of AllConnection
AllConnection.prototype.init = function(){
	var self = this;
	this.user = ClientData.getUser();
	this.socket = ClientData.getSocket();
	this.localVideo = document.getElementById("localVideo");
	this.localVideo.src = window.URL.createObjectURL(this.ms);
	this.localVideo.autoplay = true;
	this.ms.addEventListener("sourceopen", function(){
		// this.readyState === 'open'. Add source buffer that expects webm chunks.
		self.sourceBuffer = self.ms.addSourceBuffer('video/webm; codecs="vorbis,vp9"');
		self.sourceBuffer.mode = "sequence";
	});
	this.localVideo2 = document.getElementById("localVideo2");
}

//initialise the setup of own camera
AllConnection.prototype.initCamera = function(){
	var self = this;

	if (self.indicator.hasUserMedia()) {
		navigator.getUserMedia({ video: true, audio: false }, function(stream){
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

	self.connection[peer] = new PeerConnection(peer);
	self.connection[peer].startConnection(function(){
		self.connection[peer].openDataChannel(function(){
			self.connection[peer].setupPeerConnection( function(){
				self.connection[peer].makeOffer( function(offer){
					self.connection[peer].p2pConnection.setLocalDescription(offer,function(){}, function(){});
					self.socket.emit("SDPOffer", {
						type: "SDPOffer",
						local: self.user,
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
	var peer = sdpOffer.remote;
	self.connection[peer] = new PeerConnection(peer);
	self.connection[peer].startConnection(function(){
		self.connection[peer].openDataChannel(function(){
			self.connection[peer].setupPeerConnection(function(){
				self.connection[sdpOffer.remote].receiveOffer(sdpOffer.offer, function(sdpAnswer){
					self.socket.emit("SDPAnswer", {
						type: "SDPAnswer",
						local: self.user,
						remote: sdpOffer.remote,
						answer: sdpAnswer
					});
				});
			});
		});
	});
}


AllConnection.prototype.addVideo = function(peer){
	var self = this;
	this.connection[peer].addVideo(self.stream);
}

AllConnection.prototype.onAddVideo = function(peer, cb){
	var self = this;
	this.connection[peer].dataChannel.setupConnectionWithVideo = function(){

		self.connection[peer].p2pConnection.onaddstream = function (e) {
			self.localVideo2.src = window.URL.createObjectURL(e.stream);
			self.setLocalStream(e.stream);
			//self.startRecording(e.stream);
			cb();
		};
	}
}

AllConnection.prototype.setLocalStream = function(stream) {
	this.stream = stream;
}

AllConnection.prototype.startRecording = function(stream) {
	// Could improve performace in the future when disconnect by increase buffer size
	this.sourceBuffer.abort();
	setInterval(function(){
		this.localVideo.currentTime = 2000;
	}, 10000);

	var self = this;
	var mediaRecorder = new MediaRecorder(stream);
//	will freeze if lose socket	
	mediaRecorder.start(10);

	mediaRecorder.ondataavailable = function (e) {
		var reader = new FileReader();
		reader.addEventListener("loadend", function () {
			var arr = new Uint8Array(reader.result);
			self.videoData.push(arr);
			if (!self.sourceBuffer.updating){
				var chunk = self.videoData.shift();
				self.sourceBuffer.appendBuffer(chunk);
			}
		});
		reader.readAsArrayBuffer(e.data);
	};

	mediaRecorder.onstart = function(){
		console.log("Started, state = " + mediaRecorder.state);
	};
}

AllConnection.prototype.stopForwarding = function(peer){
	var self = this;
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