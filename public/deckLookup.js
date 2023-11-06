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

const makeMahjongDeck = () => {
    let result = [];
    for (let j = 0; j < 4; j++) {
        for (let i = 1; i <= 9; i++) {
            result.push(`M-D${i}`);
            result.push(`M-B${i}`);
            result.push(`M-C${i}`);
        }
        result.push("M-East");
        result.push("M-North");
        result.push("M-West");
        result.push("M-South");

        result.push("M-Red");
        result.push("M-Green");
        result.push("M-White");
    }

    for (let i = 1; i <= 4; i++) {
        result.push(`M-F${i}`);
        result.push(`M-S${i}`);
    }
    return result;
};

const DeckLookup = {
    '1dnj': one_deck_nj,
    '1d': one_deck,
    '2d': mkdeck(2),
    '3d': mkdeck(3),
    '4d': mkdeck(4),
    '5d': mkdeck(5),
    'mahjong': makeMahjongDeck(),
};

let MAHJONG_MAP = {
    "M-East": "🀀",
    "M-South": "🀁",
    "M-West": "🀂",
    "M-North": "🀃",
    "M-Red": "🀄",
    "M-Green": "🀅", 
    "M-White": "🀆",
    "M-C1": "🀇",
    "M-C2": "🀈",
    "M-C3": "🀉",
    "M-C4": "🀊",
    "M-C5": "🀋",
    "M-C6": "🀌",
    "M-C7": "🀍",
    "M-C8": "🀎",
    "M-C9": "🀏",
    "M-B1": "🀐",
    "M-B2": "🀑",
    "M-B3": "🀒",
    "M-B4": "🀓",
    "M-B5": "🀔",
    "M-B6": "🀕",
    "M-B7": "🀖",
    "M-B8": "🀗",
    "M-B9": "🀘",
    "M-D1": "🀙", 
    "M-D2": "🀚", 
    "M-D3": "🀛", 
    "M-D4": "🀜", 
    "M-D5": "🀝", 
    "M-D6": "🀞", 
    "M-D7": "🀟", 
    "M-D8": "🀠", 
    "M-D9": "🀡", 
    "M-F1": "🀢",
    "M-F2":	"🀣",
    "M-F3":	"🀤",
    "M-F4":	"🀥",
    "M-S1":	"🀦",
    "M-S2":	"🀧",
    "M-S3":	"🀨",
    "M-S4":	"🀩",
    // 1F029	 🀪 
    // 1F02A	 🀫 
};