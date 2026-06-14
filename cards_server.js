const GameServer = require('./game_server.js');

class CardsServer extends GameServer
{
    constructor(room)
    {
        super(room);
        this.deck = [];
    }

    getDeckCount() {
        return this.deck.length;
    }

    reset() {
        this.deck = [];
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
        this.room.pushSpectatorState();
    }

    dealOneToField() {
        if (this.deck.length === 0) return;
        const card = this.deck.pop();
        let multiples = [];
        Object.keys(this.room.field).forEach(i => {
            if (this.room.field[i].y === 10) {
                if ((this.room.field[i].x - 10) % 100 === 0) {
                    multiples.push((this.room.field[i].x - 10) / 100);
                }
            }
        });
        multiples.sort();
        let c = 0;
        for (let i = 0; i < multiples.length; i++) {
            if (c !== multiples[i]) break;
            c++;
        }
        const newId = this.room.nextId++;
        this.room.field[newId] = {
            card,
            x: (c * 100) + 10,
            y: 10,
            facedown: false,
            rotation: 0,
            lastTouch: this.room.seqNumber++,
            id: newId
        };
        this.room.pushSpectatorState();
    }

    dealRestTo(to) {
        while (this.deck.length !== 0) {
            this.dealOne(to);
        }
        this.room.pushSpectatorState();
    }

    dealOne(to) {
        if (this.deck.length === 0) return;
        if (this.room.hands[to] === undefined) {
            this.room.hands[to] = [];
        }
        this.room.hands[to].push({
            card: this.deck.pop(),
            id: this.room.nextId++
        });
        this.room.pushSpectatorState();
    }

    deal(n, names) {
        // TODO: verify names
        n = n || this.deck.length;
        if (n < 0) {
            n = this.deck.length + n;
        }
        console.log('Dealing', n, 'cards to', names);
        if (n === 0) return;
        if (this.room.isDealing) return;
        this.room.isDealing = true;
        let i = 0;
        let j = 0;
        const intervalID = setInterval(() => {
            if (this.deck.length === 0) {
                console.log('Deal zeroed!');
                this.room.isDealing = false;
                clearInterval(intervalID);
                return;
            }
            this.dealOne(names[i]);
            i += 1;
            if (i >= names.length) i = 0;
            if (++j === n) {
                console.log('Deal done!');
                this.room.isDealing = false;
                clearInterval(intervalID);
            }
        }, process.env.NODE_ENV === 'production' ? 200 : 10);
    }

    onEvent(player, data, callback)
    {

    }
}

module.exports = CardsServer;