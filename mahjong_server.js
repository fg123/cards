const GameServer = require('./game_server.js');

class MahjongServer extends GameServer
{
    constructor(room)
    {
        super(room);
        this.deck = [];
    }

    getDeckCount() {
        return this.wallIds ? this.wallIds.length : 0;
    }

    reset() {
        this.deck = [];
        this.wallIds = [];
    }

    setDeck(deck, shuffle) {
        this.deck = deck;
        if (shuffle) {
            var currentIndex = this.deck.length, temporaryValue, randomIndex;
            while (0 !== currentIndex) {
                randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex -= 1;
                temporaryValue = this.deck[currentIndex];
                this.deck[currentIndex] = this.deck[randomIndex];
                this.deck[randomIndex] = temporaryValue;
            }
        }
        
        // Clear field and build the wall
        this.room.clearField();
        this.wallIds = [];

        for (let i = 0; i < this.deck.length; i++) {
            const card = this.deck[i];
            const newId = this.room.nextId++;
            
            let wallIndex = Math.floor(i / 36); // 0, 1, 2, 3
            let indexInWall = i % 36;
            let stackIndex = Math.floor(indexInWall / 2); // 0 to 17
            let isTopTile = (indexInWall % 2 === 0);

            let x = 0, y = 0;
            // Spacing
            const tileW = 42; 
            const tileH = 20;

            if (wallIndex === 0) { // Bottom wall, left to right
                x = 400 + stackIndex * tileW;
                y = 600;
            } else if (wallIndex === 1) { // Right wall, bottom to top
                x = 400 + 18 * tileW + 50;
                y = 600 - stackIndex * tileH;
            } else if (wallIndex === 2) { // Top wall, right to left
                x = 400 + 18 * tileW - stackIndex * tileW;
                y = 600 - 18 * tileH - 50;
            } else if (wallIndex === 3) { // Left wall, top to bottom
                x = 400 - 50;
                y = 600 - 18 * tileH + stackIndex * tileH;
            }
            
            // Top tile offset
            if (isTopTile) {
                x -= 5;
                y -= 5;
            }

            this.room.field[newId] = {
                card,
                x,
                y,
                facedown: true,
                rotation: 0,
                lastTouch: this.room.seqNumber++,
                id: newId
            };
            // Add to the front so we pop() from the end
            this.wallIds.unshift(newId);
        }
        
        this.deck = []; // Deck is now on the field
        this.room.pushSpectatorState();
    }

    dealOneToField() {
        // Not typically used in Mahjong, but we can draw one and put it in center
        if (!this.wallIds || this.wallIds.length === 0) return;
        const idToDraw = this.wallIds.pop();
        const fieldCard = this.room.field[idToDraw];
        if (fieldCard) {
            fieldCard.x = 800;
            fieldCard.y = 400;
            fieldCard.facedown = false;
            fieldCard.lastTouch = this.room.seqNumber++;
        }
        this.room.pushSpectatorState();
    }

    dealRestTo(to) {
        while (this.wallIds && this.wallIds.length !== 0) {
            this.dealOne(to);
        }
        this.room.pushSpectatorState();
    }

    dealOne(to) {
        if (!this.wallIds || this.wallIds.length === 0) return;
        const idToDraw = this.wallIds.pop();
        const fieldCard = this.room.field[idToDraw];
        if (!fieldCard) {
            // Already taken manually? Try next.
            return this.dealOne(to);
        }
        if (this.room.hands[to] === undefined) {
            this.room.hands[to] = [];
        }
        this.room.hands[to].push({
            card: fieldCard.card,
            id: fieldCard.id
        });
        delete this.room.field[idToDraw];
        this.room.pushSpectatorState();
    }

    deal(n, names) {
        n = n || (this.wallIds ? this.wallIds.length : 0);
        if (n < 0) {
            n = (this.wallIds ? this.wallIds.length : 0) + n;
        }
        console.log('Dealing Mahjong tiles', n, 'to', names);
        if (n === 0) return;
        if (this.room.isDealing) return;
        this.room.isDealing = true;
        let i = 0;
        let j = 0;
        const intervalID = setInterval(() => {
            if (!this.wallIds || this.wallIds.length === 0) {
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

module.exports = MahjongServer;
