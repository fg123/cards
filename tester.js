const { GameState } = require('./game/game.js');

const gameState = new GameState(4, 0, (output) => {
    console.log(output);
});

gameState.start();
