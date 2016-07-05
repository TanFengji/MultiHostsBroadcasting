var io = require('socket.io-client');
var net = require('net');

var signalSocket = io.connect("http://localhost:8080");
var go = io.connect("http://localhost:8888");

signalSocket.emit("admin");
console.log('admin.js starts to work');

go.on("data", function(data) {
	var jsonStr = data.toString();

	console.log('Go: ' + jsonStr);
	var res = JSON.parse(jsonStr);
	switch (res.type) {
	case "startForwarding": 
		signalSocket.emit("task", res); break;
	case "stopForwarding":
		signalSocket.emit("task", res); break;
	case "startBroadcasting":
		signalSocket.emit("task", res); break;
	}
});

go.on('close', function() {
	console.log('Connection to Go server is closed');
	go.destroy();
});

signalSocket.on("host", function(userData){
	console.log(userData);
	go.emit("host", JSON.stringify(userData)+'\n');
});

signalSocket.on("newUser", function(userData){
	console.log(userData);
	go.emit("newUser", JSON.stringify(userData)+'\n');
});

signalSocket.on("disconnectedUser", function(userData){
	console.log(userData);
	go.emit("disconnectedUser", JSON.stringify(userData)+'\n');
});