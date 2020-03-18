class Player {
	constructor (socket, name, room) {
		this.socket = socket;
		this.name = name;
		this.room = room;
		this.score = 2;
	}
}
module.exports = Player;
