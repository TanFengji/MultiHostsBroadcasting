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

var server = https.createServer(options, app).listen(7777);
//var io = require('socket.io')(server);
//Enable CORS 
/*
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  next();
});
*/

/*
app.get('/', function(req, res) {
	res.send('Hello');
});
*/
/*
app.listen(7777, function() {
	console.log('Server runnining');
});
*/
