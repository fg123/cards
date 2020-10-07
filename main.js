// Setup Node,js with Express and Socket.io
const utils = require('./utils');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const uuidv4 = require('uuid/v4');
const path = require('path');

const Room = require('./room');
const Player = require('./player');

const port = process.env.PORT || 3000;

// Global Variables
const rooms = {};
const players = {};

http.listen(port, function() {
	console.log('listening on *:' + port);
});

app.use('/static/', express.static(path.join(__dirname, '/public')));
app.get('/prod.js', function (req, res) {
	res.type('.js');
	res.send('const isProduction = ' + (process.env.NODE_ENV === 'production') + ';');
});
app.get('/room/*', function(request, result) {
    // TODO(felixguo): This is super arbitrary, probably is a better way
    const id = request.path.split('/')[2];
    if (request.path.endsWith('id.js')) {
        result.type('application/javascript');
        result.send(`let roomId = '${id}';`);
    } else {
        result.sendFile(path.join(__dirname, '/public/index.html'));
    }
    if (!rooms[id]) {
        rooms[id] = new Room(id);
    }
});
app.get('/', function(request, result) {
    // Redirect to a random, non-taken room
    var id;
    do {
        id = uuidv4();
    } while (id in rooms);
    result.redirect(307, '/room/' + id + '/');
});

io.on('connection', function (socket) {
	console.log('Connected');
	socket.on('server.join', function(data) {
		if (!rooms[data.room]) {
			rooms[data.room] = new Room(data.room);
		}
		if (rooms[data.room].players.contains(it => it.name === data.name)) {
			socket.emit('client.error', { error: 'Name is already taken!' });
			return;
		}
		const player = new Player(socket, data.name, rooms[data.room]);
		const pos = rooms[data.room].addPlayer(player);
		socket.emit('client.joinSuccess', pos);
		rooms[data.room].pushSpectatorState();
		players[socket.id] = player;
	});

	socket.on('server.placeCard', function (data) {
		rooms[data.room].placeCard(players[socket.id].name, data.card, data.location, data.facedown, data.rotation);
	});

	socket.on('server.moveCard', function (data) {
		rooms[data.room].moveCard(data.id, data.location);
	});

	socket.on('server.reset', function (data) {
		rooms[data.room].reset();
	});

	socket.on('server.setDeck', function (data) {
		rooms[data.room].setDeck(data.deck, data.shuffle);
	});

	socket.on('server.takeCard', function (data) {
		rooms[data.room].takeCard(players[socket.id].name, data.id);
	});

	socket.on('server.clearField', function (data) {
		rooms[data.room].clearField();
	});

	socket.on('server.placeCardPlayArea', function (data) {
		rooms[data.room].placeCardPlayArea(players[socket.id].name, data.card, data.location, data.facedown);
	});

	socket.on('server.flipOverPlayArea', function (data) {
		rooms[data.room].flipOverPlayArea(data.x, data.y, data.width, data.height);
	});

	socket.on('server.dealOne', function (data) {
		rooms[data.room].dealOneToField();
	});

	socket.on('server.dealRestToMe', function (data) {
		rooms[data.room].dealRestTo(players[socket.id].name);
	});

	socket.on('server.flipCard', function (data) {
		rooms[data.room].flipCard(data.id);
	});

	socket.on('server.deal', function (data) {
		rooms[data.room].deal(data.cards, data.order);
	});

	socket.on('server.changePlayArea', function (data) {
		rooms[data.room].changePlayArea(players[socket.id].name, data.top, data.left);
	});

	socket.on('server.chat', function (data) {
		rooms[data.room].processChat(players[socket.id].name, data.message);
	});

	socket.on('server.cursor', function (data) {
		// Cursor information is just relayed separately
		rooms[data.room].cursorUpdate(players[socket.id].name, data.x, data.y);
	});
    socket.on('disconnect', function () {
		if (players[socket.id] !== undefined) {
			removePlayerFromRoom(players[socket.id]);
		}
	});
});


function removePlayerFromRoom(player) {
    const room = player.room;
    room.removePlayer(player);
    if (room.isEmpty()) {
        // Remove room if it's empty
        delete rooms[room.id];
    } else {
        // Notify rest of players someone left (as if they lost)
        room.pushSpectatorState();
    }
}
