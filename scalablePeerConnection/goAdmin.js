var io = require('socket.io-client');
var net = require('net');

var signalSocket = io.connect("http://localhost:8080");
var index = 0;
var HOST = 'localhost';
var PORT = 8888;
var go = new net.Socket();

go.connect(PORT, HOST, function() {
	console.log('Connected to Go server: ' + HOST + ':' + PORT);

	// Send signal to signalServer.js that admin starts to work

	signalSocket.emit("admin");
	console.log('admin.js starts to work');

	//var text = JSON.stringify(peer);
	//client.write(text+'\n');

	go.on('data', function(data) {
		var jsonStr = data.toString();
		var jsons = jsonStr.split('\n')
		for (var i=0; i<jsons.length-1; i++) {
			console.log('Go: ' + jsons[i]);
			var res = JSON.parse(jsons[i]);
			switch (res.type) {
			case "startForwarding": 
				signalSocket.emit("startForwarding", res); break;
			case "stopForwarding":
				signalSocket.emit("stopForwarding", res); break;
			case "startBroadcasting":
				signalSocket.emit("startBroadcasting", res); break;
			}
		}
	});

	go.on('close', function() {
		console.log('Connection to Go server is closed');
		go.destroy();
	});

	signalSocket.on("host", function(userData){
		console.log(userData);
		signalSocket.emit("startBroadcasting", {
			type: "startBroadcasting",
			host:	userData.user
		});
		//go.write(JSON.stringify(userData)+'\n');
	});

	signalSocket.on("newUser", function(userData){
		console.log(userData);
		switch (index){
		case 0:
			signalSocket.emit("startForwarding", {
				parent: "a",
				child: "b"
			});
			break;
		case 1:
			signalSocket.emit("startForwarding", {
				parent: "b",
				child: "c"
			});
			break;
		case 2:
			signalSocket.emit("startForwarding", {
				parent: "c",
				child: "d"
			});
			break;
		}
		index++;
		//go.write(JSON.stringify(userData)+'\n');
	});

	signalSocket.on("disconnectedUser", function(userData){
		console.log(userData);
		switch (userData.user){
		case "b":
			signalSocket.emit("startForwarding", {
				parent: "a",
				child: "c"
			});
			setTimeout(function(){
				signalSocket.emit("startForwarding", {
					parent: "c",
					child: "d"
				});
			}, 20000);

			break;
		}
		//signalSocket.emit("stopForwarding", res); break;
		//go.write(JSON.stringify(userData)+'\n');
	});
});