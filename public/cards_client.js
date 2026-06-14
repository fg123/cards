// Store client state for cards module
class CardsClient
{
    constructor(handRef)
    {
        this.mainCard = '5D'; 
        this.handRef = handRef;
    }

    // Public Interface
    renderObjectInHand()
    {

    }

    renderObjectSpectator(object)
    {

    }

    // Private
    createCard(cardValue, index, xPos, id, isOnHand)
    {
        var cardClass = 'card ';
        var cardDisplayNum = '';
        var cardSuit = '';
        if (cardValue == 'FD') // facedown
        {
            cardDisplayNum = '<br><br>';
            cardClass += 'back ';
            cardSuit = '&#129313;';
        }
        else if (cardValue.startsWith("M-")) {
            // Mahjong Card
            let svgFile = MAHJONG_SVG_MAP[cardValue];
            cardSuit = `<img src="/static/mahjong-tiles/${svgFile}" style="width: 100%; height: 100%; pointer-events: none;" />`;
            cardClass += "mahjong";
        }
        else if (cardValue == 'JJ') //big joker
        {
            cardDisplayNum = '<br><br>';
            cardClass += 'bJoker ';
            cardSuit = '&#129313;';
        }
        else if (cardValue == 'J') //small joker
        {
            cardDisplayNum = '<br><br>';
            cardClass += 'sJoker ';
            cardSuit = '&#129313;';
        }
        else // regular card
        {
            var cLen = cardValue.length;
            var cSuit = cardValue.slice(-1);
            var cVal = cardValue.substring(0, cLen - 1);
            if (cSuit == 'H')
            {
                cardSuit = '&hearts;';
                cardClass += 'hearts ';
            }
            else if (cSuit == 'C')
            {
                cardSuit = '&clubs;';
                cardClass += 'clubs ';
            }
            else if (cSuit == 'S')
            {
                cardSuit = '&spades;';
                cardClass += 'spades ';
            }
            else if (cSuit == 'D')
            {
                cardSuit = '&diams;';
                cardClass += 'diamonds ';
            }

            if (cVal == '11')
            {
                cardDisplayNum = 'J<br>' + cardSuit;
            }
            else if (cVal == '12')
            {
                cardDisplayNum = 'Q<br>' + cardSuit;
            }
            else if (cVal == '13')
            {
                cardDisplayNum = 'K<br>' + cardSuit;
            }
            else if (cVal == '1')
            {
                cardDisplayNum = 'A<br>' + cardSuit;
            }
            else
            {
                cardDisplayNum = cVal + '<br>' + cardSuit;
            }
        }
        return `<div
            data-selected='0'
            data-id='${id}'
            data-card='${cardValue}'
            data-isonhand='${isOnHand}'
            style='z-index: ${index}; left: ${xPos}px'
            class='${cardClass}'>
                <div class='value'>${cardDisplayNum}</div>
                <div class='suit'>${cardSuit}</div>
                <div class='valueBr'>${cardDisplayNum}</div>
        </div>`;
    }

    
    sortHand(cardHand) {
        if (cardHand.some(x => x.card.startsWith("M-"))) {
            return this.sortHandMahjong(cardHand);
        }
        else if ($('.sortingMethod').val() === 'tractor') {
            return this.sortHandTractor(cardHand);
        }
        else {
            return this.sortHandBig2(cardHand);
        }
    }

    sortHandMahjong(cardHand) {
        function cardVal(c) {
            return Object.keys(MAHJONG_MAP).indexOf(c);
        }
        cardHand.sort((a, b) => cardVal(a.card) - cardVal(b.card));
        return cardHand;
    }
    sortHandBig2(cardHand) {
        function cardVal(c) {
            if (c === 'JJ') return 10000;
            else if (c === 'J') return 1000;
            let val = parseInt(c.substring(0, c.length - 1), 10);
            // Ace and 2 bigger than king
            if (val === 1) val = 14;
            else if (val === 2) val = 15;
            let suit = 0;
            switch (c.slice(-1)) {
                case 'H': suit = 3; break;
                case 'D': suit = 1; break;
                case 'S': suit = 4; break;
                case 'C': suit = 2; break;
            }
            return val * 10 + suit;
        }
        cardHand.sort((a, b) => cardVal(a.card) - cardVal(b.card));
        return cardHand;
    }

    sortHandTractor(cardHand)
    {
        let mainSuit = $('.trumpSuit').val();
        let mainValue = parseInt($('.trumpNumber').val(), 10);

        let mains = new Array();
        let hearts = new Array();
        let spades = new Array();
        let diamonds = new Array();
        let clubs = new Array();
        let jokers = new Array();
        for (var i = 0; i < cardHand.length; i++)
        {
            const card = cardHand[i];
            const cardStr = card.card;
            if (cardStr === 'JJ')
            {
                jokers.unshift(card);
            }
            else if(cardStr === 'J')
            {
                jokers.push(card);
            }
            else
            {
                var suit = cardStr.slice(-1);
                var val = parseInt(cardStr.substring(0, cardStr.length - 1), 10);
                if (val == mainValue) // is a main value card
                {
                    if (suit == mainSuit) mains.unshift(card);
                    else this.insertIntoBySuit(card, mains);
                }
                else
                {
                    switch (suit)
                    {
                        case 'H': hearts = this.insertInto(card, hearts); break;
                        case 'D': diamonds = this.insertInto(card, diamonds); break;
                        case 'S': spades = this.insertInto(card, spades); break;
                        case 'C': clubs = this.insertInto(card, clubs); break;
                    }
                }
            }
        }
        cardHand = jokers.concat(mains);
        if (mainSuit == 'N') // no suit
        {
            mainSuit = 'D'; // just for ordering purposes
        }
        switch (mainSuit)
        {
            case 'H':
                cardHand = cardHand.concat(
                    hearts.concat(spades.concat(diamonds.concat(clubs))));
                break;
            case 'D':
                cardHand = cardHand.concat(
                    diamonds.concat(clubs.concat(hearts.concat(spades))));
                break;
            case 'S':
                cardHand = cardHand.concat(
                    spades.concat(diamonds.concat(clubs.concat(hearts))));
                break;
            case 'C':
                cardHand = cardHand.concat(
                    clubs.concat(hearts.concat(spades.concat(diamonds))));
                break;
        }
        return cardHand;
    }

    insertInto(card, lst)
    {
        const cardStr = card.card;

        var cVal = parseInt(cardStr.substring(0, cardStr.length - 1), 10);
        var currVal;
        for (var i = 0; i < lst.length; i++)
        {
            currVal = parseInt(lst[i].card, 10);
            if (cVal == 1) { cVal = 14; } //to guarantee 1 is at the end
            if (currVal == 1) { currVal = 14; } //to guarantee 1 is at the end
            if (cVal >= currVal)
            {
                lst.splice(i, 0, card);
                return lst;
            }
        }
        lst.push(card);
        return lst;
    }

    insertIntoBySuit(card, lst)
    {
        const cardStr = card.card;
        for (let i = 0; i < lst.length; i++)
        {
            if (cardStr.slice(-1) === lst[i].card.slice(-1))
            {
                lst.splice(i, 0, card);
                return lst;
            }
        }
        lst.push(card);
        return lst;
    }
}