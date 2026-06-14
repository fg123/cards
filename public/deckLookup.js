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

let MAHJONG_SVG_MAP = {
    "M-East": "tile_colored_27.svg",
    "M-South": "tile_colored_28.svg",
    "M-West": "tile_colored_29.svg",
    "M-North": "tile_colored_30.svg",
    "M-Red": "tile_colored_31.svg",
    "M-Green": "tile_colored_32.svg",
    "M-White": "tile_colored_33.svg",
    "M-C1": "tile_colored_0.svg",
    "M-C2": "tile_colored_1.svg",
    "M-C3": "tile_colored_2.svg",
    "M-C4": "tile_colored_3.svg",
    "M-C5": "tile_colored_4.svg",
    "M-C6": "tile_colored_5.svg",
    "M-C7": "tile_colored_6.svg",
    "M-C8": "tile_colored_7.svg",
    "M-C9": "tile_colored_8.svg",
    "M-B1": "tile_colored_9.svg",
    "M-B2": "tile_colored_10.svg",
    "M-B3": "tile_colored_11.svg",
    "M-B4": "tile_colored_12.svg",
    "M-B5": "tile_colored_13.svg",
    "M-B6": "tile_colored_14.svg",
    "M-B7": "tile_colored_15.svg",
    "M-B8": "tile_colored_16.svg",
    "M-B9": "tile_colored_17.svg",
    "M-D1": "tile_colored_18.svg", 
    "M-D2": "tile_colored_19.svg", 
    "M-D3": "tile_colored_20.svg", 
    "M-D4": "tile_colored_21.svg", 
    "M-D5": "tile_colored_22.svg", 
    "M-D6": "tile_colored_23.svg", 
    "M-D7": "tile_colored_24.svg", 
    "M-D8": "tile_colored_25.svg", 
    "M-D9": "tile_colored_26.svg", 
    "M-S1":	"flower_colored_0.svg",
    "M-S2":	"flower_colored_1.svg",
    "M-S3":	"flower_colored_2.svg",
    "M-S4":	"flower_colored_3.svg",
    "M-F1": "flower_colored_4.svg",
    "M-F2":	"flower_colored_5.svg",
    "M-F3":	"flower_colored_6.svg",
    "M-F4":	"flower_colored_7.svg",
};
