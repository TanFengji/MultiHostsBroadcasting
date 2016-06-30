var io = require('socket.io-client');
var net = require('net');

var signalSocket = io.connect("http://localhost:8080");

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
});

go.on('data', function(data) {
  var jsonStr = data.toString();
  var jsons = jsonStr.split('\n')
  for (var i=0; i<jsons.length-1; i++) {
    console.log('Go: ' + jsons[i]);
    var res = JSON.parse(jsons[i]);
    switch (res.type) {
      case "newPeerConnection": 
	signalSocket.emit("newPeerConnection", res); break;
      case "deletePeerConnection":
	signalSocket.emit("deletePeerConnection", res); break;
      case "host":
	signalSocket.emit("host", res); break;
    }
  }
  
  
});

go.on('close', function() {
  console.log('Connection to Go server is closed');
  go.destroy();
});

signalSocket.on("host", function(userData){
  console.log(userData);
  go.write(JSON.stringify(userData)+'\n');
});

signalSocket.on("newUser", function(userData){
  console.log(userData);
  go.write(JSON.stringify(userData)+'\n');
});

signalSocket.on("disconnectedUser", function(userData){
  console.log(userData);
  go.write(JSON.stringify(userData)+'\n');
});