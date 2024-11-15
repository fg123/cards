class Room {
    constructor (id) {
        this.id = id;
        this.players = [];
        this.admin = undefined;

        this.field = {};
        this.hands = {};
        this.deck = [];

        this.isDealing = false;

        this.seqNumber = 0;

        this.nextId = 1;
    }

    reset() {
        this.field = {};
        this.hands = {};
        this.deck = [];
        this.pushSpectatorState();
    }

    setDeck(deck, shuffle) {
        // TODO: verify deck integrity
        this.deck = deck;
        if (shuffle) {
            var currentIndex = this.deck.length, temporaryValue, randomIndex;

            // While there remain elements to shuffle...
            while (0 !== currentIndex) {

                // Pick a remaining element...
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex -= 1;

                // And swap it with the current element.
                temporaryValue = this.deck[currentIndex];
                this.deck[currentIndex] = this.deck[randomIndex];
                this.deck[randomIndex] = temporaryValue;
            }
        }
        this.pushSpectatorState();
    }

    unlockPlayer(name) {
        const player = this.getPlayer(name);
        if (!player) return;
        player.lockedCard = undefined;
        console.log("Unlocked player", player.name);
        this.pushSpectatorState();
    }

    tryLockCardForMove(name, id) {
        const player = this.getPlayer(name);
        if (!player) return false;
        for (let i = 0; i < this.players.length; i++) {
            const p = this.players[i];
            if (p.name !== name && p.lockedCard === id) {
                return false;
            }
        }
        if (!this.field[id]) return false;
        console.log("Locked card", id, "for", player.name);
        player.lockedCard = id;

        this.field[id].lastTouch = this.seqNumber++;
        this.pushSpectatorState();
        return true;
    }

    takeCard(name, id) {
        if (!this.field[id]) return;
        if (this.hands[name] === undefined) {
            this.hands[name] = [];
        }
        this.hands[name].push({
            card: this.field[id].card,
            id: this.field[id].id
        });
        delete this.field[id];
        this.pushSpectatorState();
    }

    flipCard(id) {
        if (!this.field[id]) return;
        this.field[id].facedown = !this.field[id].facedown;
        this.pushSpectatorState();
    }

    clearField() {
        this.field = {};
        this.pushSpectatorState();
    }

    sendChat(name, message) {
        this.players.forEach(player => {
            player.socket.emit('client.chat', {
                name,
                message,
                timestamp: Date.now()
            });
        });
    }

    processChat(name, message) {
        if (message.length > 0 && message[0] === '/') {
            // Process Command
            const parts = message.split(' ');
            if (parts[0] === '/score') {
                const scoreToSet = parseInt(parts[1]);
                const player = this.getPlayer(name);
                if (player && !isNaN(scoreToSet)) {
                    const oldScore = player.score;
                    player.score = scoreToSet;
                    this.sendChat("Server", `${player.name} score updated from ${oldScore} to ${scoreToSet}`);
                    this.pushSpectatorState();
                }
            }
            else if (parts[0] === '/scoreall') {
                const scoreToSet = parseInt(parts[1]);
                if (!isNaN(scoreToSet)) {
                    this.players.forEach(p => {
                        p.score = scoreToSet;
                    });
                    this.sendChat("Server", `Updated everyone's score to ${scoreToSet}`);
                    this.pushSpectatorState();
                }
            }
            else if (parts[0] === '/scoreadd') {
                const scoreToAdd = parseInt(parts[1]);
                const player = this.getPlayer(name);
                if (player && !isNaN(scoreToAdd)) {
                    const oldScore = player.score;
                    player.score += scoreToAdd;
                    if(player.score <= 0) player.score = 13;
                    if(player.score >= 14) player.score = 1;
                    this.sendChat("Server", `${player.name} score updated from ${oldScore} to ${player.score}`);
                    this.pushSpectatorState();
                }
            }
            else if (parts[0] === '/gif') {  // show image/gif at center: /gif http://abc.com/a.gif, /gif #window
                let gifLink = parts[1];
                if(gifLink == "#w") {
                    gifLink = "https://media.giphy.com/media/ZAq2x1ywtUhxmaaUNG/giphy.gif";
                }
                this.players.forEach(player => {
                    player.socket.emit('client.gif', name, gifLink);
                });
            }
        }
        else {
            this.sendChat(name, message);
        }
    }

    dealOneToField() {
        if (this.deck.length === 0) return;
        const card = this.deck.pop();
        let multiples = [];
        Object.keys(this.field).forEach(i => {
            if (this.field[i].y === 10) {
                if ((this.field[i].x - 10) % 100 === 0) {
                    multiples.push((this.field[i].x - 10) / 100);
                }
            }
        });
        multiples.sort();
        let c = 0;
        for (let i = 0; i < multiples.length; i++) {
            if (c !== multiples[i]) break;
            c++;
        }
        const newId = this.nextId++;
        this.field[newId] = {
            card,
            x: (c * 100) + 10,
            y: 10,
            facedown: false,
            rotation: 0,
            lastTouch: this.seqNumber++,
            id: newId
        };
        this.pushSpectatorState();
    }

    dealRestTo(to) {
        while (this.deck.length !== 0) {
            this.dealOne(to);
        }
        this.pushSpectatorState();
    }

    dealOne(to) {
        if (this.deck.length === 0) return;
        if (this.hands[to] === undefined) {
            this.hands[to] = [];
        }
        this.hands[to].push({
            card: this.deck.pop(),
            id: this.nextId++
        });
        this.pushSpectatorState();
    }

    placeCard(name, cardId, location, facedown, rotation) {
        if (this.hands[name]) {
            for (let i = 0; i < this.hands[name].length; i++) {
                if (this.hands[name][i].id === cardId) {
                    const touchValue = (this.seqNumber++);
                    console.log('Placing card', this.hands[name][i].card, 'from', name, 'to', location, 'facedown', facedown, 'rotation', rotation, 'touchValue', touchValue);
                    this.field[cardId] = {
                        card: this.hands[name][i].card,
                        id: cardId,
                        x: location.x,
                        y: location.y,
                        facedown,
                        rotation,
                        lastTouch: touchValue
                    };
                    this.hands[name].splice(i, 1);
                    this.pushSpectatorState();
                    break;
                }
            }
        }
        this.unlockPlayer(name);
    }

    flipOverPlayArea(x, y, width, height) {
        Object.keys(this.field).forEach(i => {
            const item = this.field[i];
            if (item.x >= x && item.x <= x + width && item.y >= y && item.y <= y + height) {
                item.facedown = true;
            }
        });
        this.pushSpectatorState();
    }

    hasCardAt(x, y) {
        const keys = Object.keys(this.field);
        for (let i = 0; i < keys.length; i++) {
            if (this.field[keys[i]].x === x && this.field[keys[i]].y === y && !this.field[keys[i]].facedown) return true;
        }
        return false;
    }

    placeCardPlayArea(name, cardId, location, facedown) {
        while (this.hasCardAt(location.x, location.y)) {
            location.x += 30;
        }
        console.log(location);
        this.placeCard(name, cardId, location, facedown);
    }

    moveCard(name, id, location) {
        if (!this.field[id]) return;
        this.field[id].x = location.x;
        this.field[id].y = location.y;
        this.field[id].lastTouch = this.seqNumber++;
        this.players.forEach(player => {
            player.socket.emit('client.moveCard', { id, location });
        });
    }

    unlock(name) {
        this.unlockPlayer(name);
        this.pushSpectatorState();
    }

    cursorUpdate(name, x, y) {
        this.players.forEach(player => {
            if (player.name !== name) {
                player.socket.emit('client.cursor', {
                    name,
                    x,
                    y
                });
            }
        });
    }

    deal(n, names) {
        // TODO: verify names
        n = n || this.deck.length;
        if (n < 0) {
            n = this.deck.length + n;
        }
        console.log('Dealing', n, 'cards to', names);
        if (n === 0) return;
        if (this.isDealing) return;
        this.isDealing = true;
        let i = 0;
        let j = 0;
        const intervalID = setInterval(() => {
            if (this.deck.length === 0) {
                console.log('Deal zeroed!');
                this.isDealing = false;
                clearInterval(intervalID);
                return;
            }
            this.dealOne(names[i]);
            i += 1;
            if (i >= names.length) i = 0;
            if (++j === n) {
                console.log('Deal done!');
                this.isDealing = false;
                clearInterval(intervalID);
            }
        }, process.env.NODE_ENV === 'production' ? 200 : 10);
    }

    addPlayer (player) {
        this.players.push(player);
        return this.players.length - 1;
    }

    getPlayer(name) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].name === name) {
                return this.players[i];
            }
        }
        return undefined;
    }

    removePlayer(player) {
        // Called when a player disconnects from the room.
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].name === player.name) {
                this.players.splice(i, 1);
                return;
            }
        }
    }

    changePlayArea(name, top, left) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].name === name) {
                this.players[i].playArea.top = top;
                this.players[i].playArea.left = left;
                this.pushSpectatorState();
                return;
            }
        }
    }

    isEmpty() {
        return this.players.length === 0;
    }

    pushSpectatorState() {
        // Sends the spectator state to everyone in the room.
        this.players.forEach(player => {
            player.socket.emit('client.spectator', this.getSpectatorState());
            player.socket.emit('client.hand', this.hands[player.name] || []);
        });
    }

    getAdmin() {
        return this.players.length === 0 ? undefined : this.players[0].name;
    }

    getSpectatorState() {
        return {
            players: this.players.map(player => {
                return {
                    name: player.name,
                    state: player.state,
                    score: player.score,
                    cardCount: (this.hands[player.name] || []).length,
                    playArea: player.playArea,
                    lockedCard: player.lockedCard
                };
            }),
            field: this.field,
            deckCount: this.deck.length
        };
    }

    play(playerName, cards) {
        const playerIndex = this.players.findIndex(x => x.name === playerName);
        this.gameState.playCards(playerIndex, cards);
    }
}
module.exports = Room;
