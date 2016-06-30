var express = require('express');
var fs = require('fs');
var https = require('https');

var options = {
	key: fs.readFileSync('key.pem'),
	cert: fs.readFileSync('cert.pem'),
	passphrase: "thegeeksnextdoor"
};

var app = express();
app.use(express.static(__dirname));

var server = https.createServer(options, app)
var io = require("socket.io").listen(server);

var request = require("request");
//user stores all the sockets
var user = {};
//room stores all the room id
var room = {};
var admin;
var configuration;

var xirsys_details = {
		ident : "qwerty",
		secret : "53253e00-31f8-11e6-ae89-abe6e64b2707",
		domain : "www.thegeeksnextdoor.co",
		application : "default",
		room : "default",
		secure : 0,
}

var opts = {
		method: 'GET',
		uri: 'https://service.xirsys.com/ice',
		body: xirsys_details,
		json: true
};

request.get(opts, function(error, response, body){
	configuration = body.d;
});

server.listen(8080);
io.on("connection", function(socket){

	// new user login
	socket.on("login", function(userName){

		console.log("User " + userName + " logins");

		try {
			if (user[userName]){

				socket.emit("login", {
					type: "login",
					userName: userName,
					status: "fail"
				});

			} else{
				user[userName] = socket;
				user[userName].userName = userName;

				socket.emit("login", {
					type: "login",
					userName: userName,
					config: configuration, 
					status: "success"
				});
			}}catch (e){
				console.log(e);
			}
	})

//	a host create a new room
	socket.on("createRoom", function(roomId){
		try {
			/*if (room[roomId]){
			socket.emit("createRoom", {
type: "createRoom",
userName: socket.userName,
room: roomId,
status: "fail"
});
} else{*/
			room[roomId] = {};
			room[roomId].roomId = roomId;
			room[roomId].host = socket.userName;
			user[socket.userName].room = roomId; 
			user[socket.userName].join(roomId); 
			admin.emit("host", {
				type: "host",
				host: socket.userName
			});

			socket.emit("createRoom", {
				type: "createRoom",
				userName: socket.userName,
				room: roomId,
				status: "success"
			});

//			}
		}catch (e){
			console.log(e);
		}
	})

//	an user join a room
	socket.on("joinRoom", function(roomId){
		try {
			if (room[roomId]){

				socket.emit("host", {
					type: "host",
					host: room[roomId].host
				});

				user[socket.userName].room = roomId;
				user[socket.userName].join(roomId); 

				/*admin.emit("newUser", {
					type: "newUser",
					userName: socket.userName,
					host:	room[roomId].host
				});*/

				var clientSockets = io.sockets.adapter.rooms[roomId].sockets; 

				var userList = {};

				for (var clientSocket in clientSockets){
					userName = io.sockets.connected[clientSocket].userName;
					if (socket.userName !== userName){
						userList[userName] = userName;
					}
				}

				socket.emit("joinRoom", {
					type: "joinRoom",
					userList: userList,
					userName: socket.userName,
					status: "success"
				});
			} else{
				socket.emit("joinRoom", {
					type: "joinRoom",
					userName: socket.userName,
					room: roomId,
					status: "fail"
				});

			}}catch (e){
				console.log(e);
			}
	})

//	an user send an offer to peer
	socket.on("SDPOffer", function(sdpOffer){

		try {
			if (user[sdpOffer.remote]){
				user[sdpOffer.remote].emit("SDPOffer", {
					type: "SDPOffer",
					local: sdpOffer.remote,
					remote: sdpOffer.local,
					offer: sdpOffer.offer
				});
			}else{
				socket.emit("feedback", "Sending Offer: User does not exist or currently offline");
			}} catch(e){
				console.log(e);
			}
	})

//	an user send an answer to peer
	socket.on("SDPAnswer", function(sdpAnswer){

		try {
			if (user[sdpAnswer.remote]){
				user[sdpAnswer.remote].emit("SDPAnswer",{
					type: "SDPAnswer",
					local: sdpAnswer.remote,
					remote: sdpAnswer.local,
					answer: sdpAnswer.answer
				});	

			}else{
				socket.emit("feedback", "Sending Answer: User does not exist or currently offline");
			}} catch(e){
				console.log(e);
			}
	})

//	an user send an ICECandidate to peer
	socket.on("candidate", function(iceCandidate){
		user[iceCandidate.remote].emit("candidate", {
			type: "candidate",
			local: iceCandidate.remote,
			remote: iceCandidate.local,
			candidate: iceCandidate.candidate
		});
	});

//	an user disconnect
	socket.on("disconnect", function(){
		if (socket.userName){
			admin.emit("disconnectedUser", {
				type: "disconnectedUser",
				userName: socket.userName,
				host:	room[socket.room].host
			});
			socket.broadcast.to(socket.room).emit("message", {
				type: "message",
				action: "disconnect",
				user: socket.userName,
				content: ""
			});
			user[socket.userName] = null;
		}
	})

//	a new peer connection is asked to be built
	socket.on("newPeerConnection", function(userData){
		try {
			user[userData.host].emit("initConnection", userData.userName);
			//	console.log("User " + command[1] + " initialise connection to user " + command[2]);
		} catch(e){
			console.log(e);
		}

	})

//	a peer connection is asked to be deleted
	socket.on("deletePeerConnection", function(userData){
		try {

			user[userData.userName].emit("deleteConnection", userData.userName);
			//	console.log("User " + command[1] + " initialise connection to user " + command[2]);
		} catch(e){
			console.log(e);
		}
	})

//	a user send a message
	socket.on("message", function(messageData){
		socket.broadcast.to(socket.room).emit("message", messageData);
	});


//	admin is connected
	socket.on("admin", function(){
		try {
			admin = socket;
		} catch(e){
			console.log(e);
		}
	});

	//	when a datachannel of a user is set up ready
	socket.on("dataChannelStatus", function(dataChannelStatusData){
		socket.emit("dataChannelStatus", dataChannelStatusData);
	});

	//	when user and peer finish transfering their time stamp
	socket.on("timeStamp", function(timeStampData){
		socket.emit("timeStamp", timeStampData);
	});

	socket.on("newUser", function(newUserData){	
		var self = this;
		var roomId = user[socket.userName].room;
		console.log(roomId);
		var host = room[roomId].host;
		console.log(host);
		admin.emit("newUser", {
			type: "newUser",
			user: newUserData.user,
			room: roomId,
			host:	host,
			latency: newUserData.latency
		});
		
	});

})

