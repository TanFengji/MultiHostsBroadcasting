var net = require('net');

var HOST = 'localhost';
var PORT = 8889;

var peer = {
	peer: "abc",
	latency: 3
};

var client = new net.Socket();
client.connect(PORT, HOST, function() {
	console.log('Connected to: ' + HOST + ':' + PORT);
	var text = JSON.stringify(peer);
	client.write(text+'\n');
});

client.on('data', function(data) {
	console.log(data.toString());
});

client.on('close', function() {
	console.log('Connection closed');
});
