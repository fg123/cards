class Player {
	constructor (socket, name, room) {
		this.socket = socket;
		this.name = name;
		this.room = room;
		this.score = 0;
		this.playArea = {
			top: "0",
			left: "0"
		};
	}
}
module.exports = Player;
