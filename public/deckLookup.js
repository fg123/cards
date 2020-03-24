const one_deck_nj = [];
for (let j = 1; j <= 13; j++) {
    one_deck_nj.push(j + 'D');
    one_deck_nj.push(j + 'C');
    one_deck_nj.push(j + 'S');
    one_deck_nj.push(j + 'H');
}
const one_deck = one_deck_nj.concat(['JJ', 'J']);
const mkdeck = (n) => {
    let result = [];
    for (let i = 0; i < n; i++) {
        result = result.concat(one_deck);
    }
    return result;
};

const two_deck = one_deck.concat(one_deck);
const three_deck = one_deck.concat(one_deck);
const DeckLookup = {
    '1dnj': one_deck_nj,
    '1d': one_deck,
    '2d': mkdeck(2),
    '3d': mkdeck(3),
    '4d': mkdeck(4),
    '5d': mkdeck(5),
};