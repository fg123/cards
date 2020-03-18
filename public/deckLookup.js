const one_deck_nj = [];
for (let j = 1; j <= 13; j++) {
    one_deck_nj.push(j + 'D');
    one_deck_nj.push(j + 'C');
    one_deck_nj.push(j + 'S');
    one_deck_nj.push(j + 'H');
}
const one_deck = one_deck_nj.concat(['JJ', 'J']);
const DeckLookup = {
    '1dnj': one_deck_nj,
    '1d': one_deck,
    '2d': one_deck.concat(one_deck),
    '3d': one_deck.concat(one_deck).concat(one_deck)
};