var io = require('socket.io-client');
var net = require('net');

var signalSocket = io.connect("http://localhost:8080");
var go = io.connect("http://localhost:8888");

signalSocket.emit("admin");
console.log('admin.js starts to work');
/*
go.connect(PORT, HOST, function() {
  console.log('Connected to Go server: ' + HOST + ':' + PORT);
  
  // Send signal to signalServer.js that admin starts to work
  
  signalSocket.emit("admin");
  console.log('admin.js starts to work');
  
  //var text = JSON.stringify(peer);
  //client.write(text+'\n');
});
*/

go.on("data", function(data) {
  var jsonStr = data.toString();
  
  /*
  var jsons = jsonStr.split('\n')
  console.log(jsons);
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
  */
  
  
  console.log('Go: ' + jsonStr);
  var res = JSON.parse(jsonStr);
    switch (res.type) {
      case "startForwarding": 
	signalSocket.emit("startForwarding", res); break;
      case "stopForwarding":
	signalSocket.emit("stopForwarding", res); break;
      case "startBroadcasting":
	signalSocket.emit("startBroadcasting", res); break;
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