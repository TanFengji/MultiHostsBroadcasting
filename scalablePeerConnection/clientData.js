function ClientData(){
	var user;
	var socket;
	var iceServerConfig;
}

ClientData.prototype.setSocket = function(socket){
	this.socket = socket;
}

ClientData.prototype.getSocket = function(){
	return this.socket;
}

ClientData.prototype.setIceServerConfig = function(config){
	this.iceServerConfig = config;
}

ClientData.prototype.getIceServerConfig = function(){
	return this.iceServerConfig;
}

ClientData.prototype.setUser = function(user){
	this.user = user;
}

ClientData.prototype.getUser = function(){
	return this.user;
}

cd = new ClientData();
module.exports = cd;
