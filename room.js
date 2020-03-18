class Room {
    constructor (id) {
        this.id = id;
        this.players = [];
        this.admin = undefined;
        
        this.field = [];
        this.hands = {};
        this.deck = [];
    }

    reset() {
        this.field = [];
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

    takeCard(name,  id) {
        if (id >= this.field.length) return;
        if (this.hands[name] === undefined) {
            this.hands[name] = [];
        }
        this.hands[name].push(this.field[id].card);
        this.field.splice(id, 1);
        this.pushSpectatorState();
    }

    flipCard(id) {
        if (id >= this.field.length) return;
        this.field[id].facedown = !this.field[id].facedown;
        this.pushSpectatorState();
    }

    dealOne(to) {
        if (this.deck.length === 0) return;
        if (this.hands[to] === undefined) {
            this.hands[to] = [];
        }
        this.hands[to].push(this.deck.pop());
        this.pushSpectatorState();
    }

    placeCard(name, card, location, facedown) {
        console.log('Placing card', card, 'from', name, 'to', location, 'facedown', facedown);
        for (let i = 0; i < this.hands[name].length; i++) {
            if (this.hands[name][i] === card) {
                this.hands[name].splice(i, 1);
                this.field.push({ card, x: location.x, y: location.y, facedown });
                this.pushSpectatorState();
                break;
            }
        }
    }

    moveCard(id, location) {
        if (id >= this.field.length) return;
        this.field[id].x = location.x;
        this.field[id].y = location.y;
        this.field.push(this.field.splice(id, 1)[0]);
        this.pushSpectatorState();
    }

    deal(n, names) {
        // TODO: verify names
        n = n || this.deck.length;
        console.log('Dealing', n, 'cards to', names);
        if (n === 0) return;
        let i = 0; 
        let j = 0;
        const intervalID = setInterval(() => {
            this.dealOne(names[i]);
            i += 1;
            if (i >= names.length) i = 0;
            if (++j === n) {
                console.log('Deal done!');
                clearInterval(intervalID);
            }
        }, process.env.NODE_ENV === 'production' ? 200 : 10);
    }

    addPlayer (player) {
        this.players.push(player);
    }

    removePlayer(player) {
        // Called when a player disconnects from the room.
        if (this.hands[player.name]) { 
            delete this.hands[player.name];
        }
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].name === player.name) {
                this.players.splice(i, 1);
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
                    cardCount: (this.hands[player.name] || []).length
                };
            }),
            field: this.field.slice(0).map(card => {
                // TODO: remove data if facedown to prevent cheating
                return card;
            }),
            deckCount: this.deck.length
        };
    }

    play(playerName, cards) {
        const playerIndex = this.players.findIndex(x => x.name === playerName);
        this.gameState.playCards(playerIndex, cards);
    }
}
module.exports = Room;