const socket = io();
let myName = '';
let myId = '';
let players = [];
let gamePlaying = false;
let currentTurn = false;
let cardHand = [];
let mainCard = '5D';
let selectedCard = undefined;
let flipStatus = 0;
const errorQueue = [];
let errorTimer = undefined;

const ERROR_TIMEOUT = 1000;

const TEST_AUTO_JOIN = false;

updateHand();
$('#game').hide();

function emit(endpoint, data) {
    if (!data) data = {};
    console.log('Emitting ' + endpoint);
    data.room = roomId;
    socket.emit(endpoint, data);
}

$(document).ready(() => {
    $('#nickname').focus();
    $('#nickname').keydown((e) => {
        if (e.which === 13) {
            $('#joinGameBtn').click();
        }
    });
});

$('#joinGameBtn').click(function () {
	myName = $('#nickname').val();
	if ($('#nickname').val() != '') {
		emit('server.join', {
			name: $('#nickname').val()
		});
	}
});

if (TEST_AUTO_JOIN) {
	$('#nickname').val(Date.now());
	$('#joinGameBtn').click();
}

let dealCards = () => {};

$('.field').mousedown((e) => {
	if (selectedCard !== undefined) {
		const x = e.pageX - $('.field').offset().left;
		const y = e.pageY - $('.field').offset().top;
		if (typeof selectedCard === 'string') {
			// Placing a card from your hand
			emit('server.placeCard', {
				card: selectedCard,
				location: { x, y },
				facedown: event.which === 3
			});
		} else if (typeof selectedCard === 'number') {
			// Placing a card picked up on the field
			emit('server.moveCard', {
				id: selectedCard,
				location: { x, y }
			});
		}
		selectedCard = undefined;
	}
});

$('.field').contextmenu(function() { return false });

socket.on('client.spectator', function (data) {
	$('.scoreboard .players').html(`
			<b>Playing:</b>
			<br>
			${data.players
                .map(p => p.name + " (" + p.score + ")")
                .join('<br>')}
			<br><br>
			Server Deck Count: ${data.deckCount}
			<br>
	`);
	$('.field').html('');
	for (let i = 0; i < data.field.length; i++) {
		let card = $(createCard(data.field[i].card, i, 0, i));
		if (data.field[i].facedown) {
			card = $(`<div class='card back' data-id='${i}'>&nbsp;</div>`)
		}
		// So it captures the right number in the closure.
		card[0].style.position = "absolute";
		card[0].style.top = data.field[i].y + "px";
		card[0].style.left = data.field[i].x + "px";
		card.mousedown((e) => {
			if (e.which === 1) {
				selectedCard = i;
			}
			else if (selectedCard === undefined) {
				if (e.which === 2) {
					emit('server.takeCard', {
						id: i
					});
				}
				else if (e.which === 3) {
					emit('server.flipCard', {
						id: i
					});
				}
			}
			e.stopPropagation();
        	return false;
		});
		$('.field').append(card);
	}
	// Save checkbox for deal cards
	const checkMapping = {};
	for (let i = 0; i < data.players.length; i++) {
		if (document.getElementById(data.players[i].name + 'DealCheckbox') && 
			!document.getElementById(data.players[i].name + 'DealCheckbox').checked) {
			checkMapping[data.players[i].name] = "";
		}
		else {
			checkMapping[data.players[i].name] = "checked";
		}
	}
	$('.scoreboard .dealPlayers').html(`
		${data.players
			.map(p => '<input type="checkbox" id="' + p.name + 'DealCheckbox" value="shuffle" ' + checkMapping[p.name] + '>' + p.name)
			.join('<br>')}
	`);
	dealCards = () => {
		let dealTo = [];
		for (let i = 0; i < data.players.length; i++) {
			if (document.getElementById(data.players[i].name + 'DealCheckbox') && 
				document.getElementById(data.players[i].name + 'DealCheckbox').checked) {
				dealTo.push(data.players[i].name);
			}
		}
		emit('server.deal', {
			cards: parseInt(document.getElementById('dealCount').value),
			order: dealTo
		});
	}
});

socket.on('client.hand', function (data) {
	cardHand = data;
	updateHand();
});

socket.on('client.error', function (data) {
	console.error(Error(data));
	errorQueue.push(data);
	showErrorIfNecessary();
});

socket.on('client.joinSuccess', function () {
	$('#game').show();
	$('#login').hide();
});

socket.on('disconnect', function() {
	// alert('Server disconnected.');
	window.location.reload();
});

function errorTimeout() {
	errorTimer = undefined;
	if (errorQueue.length === 0) {
		$('.errorMessage').html('');
	}
	else {
		showErrorIfNecessary();
	}
}

function showErrorIfNecessary() {
	if (errorTimer === undefined && errorQueue.length !== 0) {
		$('.errorMessage').html(errorQueue.shift());
		errorTimer = setTimeout(errorTimeout, ERROR_TIMEOUT);
	}
}

socket.on('updatePlayers', function (plist) {
	players = plist;
	updatePlayerUI();
});

// createCard(cardValue, index, xPos) produces a string of the created card with
//   the given values.
// createCard: Str Num Num -> Str
function createCard(cardValue, index, xPos, id)
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
		style='z-index: ${index}; left: ${xPos}px'
		class='${cardClass}'>
			<div class='value'>${cardDisplayNum}</div>
			<div class='suit'>${cardSuit}</div>
			<div class='valueBr'>${cardDisplayNum}</div>
	</div>`;
}

// sortHand() sorts the cards in cardHand based on Joker, Main Numbers,
//   Main Suit, Rest
function sortHand()
{
	var mainSuit = mainCard.slice(-1);
	var mainValue = parseInt(mainCard.substring(0, mainCard.length - 1), 10);

	var mains = new Array();
	var hearts = new Array();
	var spades = new Array();
	var diamonds = new Array();
	var clubs = new Array();
	var jokers = new Array();
	for (var i = 0; i < cardHand.length; i++)
	{
		var c = cardHand[i];
		if (c == 'JJ')
		{
			jokers.unshift(c);
		}
		else if(c == 'J')
		{
			jokers.push(c);
		}
		else
		{
			var suit = c.slice(-1);
			var val = parseInt(c.substring(0, c.length - 1), 10);
			if (val == mainValue) // is a main value card
			{
				if (suit == mainSuit) mains.unshift(c);
				else mains.push(c);
			}
			else
			{
				switch (suit)
				{
					case 'H': hearts = insertInto(c, hearts); break;
					case 'D': diamonds = insertInto(c, diamonds); break;
					case 'S': spades = insertInto(c, spades); break;
					case 'C': clubs = insertInto(c, clubs); break;
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
}
// insertInto(card, lst) inserts the card into the list in order and produces
//   the resulting list.
// insertInto: Str Arr<Str> -> Arr<Str>
function insertInto(card, lst)
{
	var cVal = parseInt(card.substring(0, card.length - 1), 10);
	var currVal;
	for (var i = 0; i < lst.length; i++)
	{
		currVal = parseInt(lst[i], 10);
		if (cVal == 1) { cVal = 14; } //to guarantee 1 is at the end
		if (currVal == 1) { currVal = 14; } //to guarantee 1 is at the end
		//console.log(cVal + ' ' + currVal);
		if (cVal >= currVal)
		{
			lst.splice(i, 0, card);
			return lst;
		}

	}
	lst.push(card);
	return lst;
}

// updateHand() updates the player's hand with the cards in cardHand
function updateHand()
{
	if (cardHand.length !== 0) sortHand();
	console.log(cardHand);
	$('.me').width(cardHand.length * 30 + 80);
	$('.me').html('');
	for (let i = 0; i < cardHand.length; i++) {
		let card = $(createCard(cardHand[i], i, i * 30));
		// So it captures the right number in the closure.
		card.click(function () {
			selectedCard = cardHand[i];
		});
		$('.me').append(card);
	}
}
