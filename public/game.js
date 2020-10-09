const CURSOR_UPDATE_TICK = 32;

const socket = io();
let myName = '';
let myId = '';
let players = [];
let gamePlaying = false;
let currentTurn = false;
let cardHand = [];
let mainCard = '5D';
let selectedCard = undefined;
let clickOffsetX = 0;
let clickOffsetY = 0;

let cardsInField = {};


let dropFaceDown = false;

const errorQueue = [];
let errorTimer = undefined;

const ERROR_TIMEOUT = 1000;

let myPlayArea = undefined;
updateHand();
$('#game').hide();

function emit(endpoint, data, callback) {
    if (!data) data = {};
    // console.log('Emitting ' + endpoint);
	data.room = roomId;
	if (callback) {
		socket.emit(endpoint, data, callback);
	}
	else {
		socket.emit(endpoint, data);
	}
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

function sendChat() {
	const value = $('#chatTextbox').val();
	if (value) {
		emit('server.chat', {
			message: value
		});
		$('#chatTextbox').val('');
	}
}

$('#chatBtn').click(function() {
	sendChat();
});

if (!isProduction) {
	$('#nickname').val(Date.now());
	$('#joinGameBtn').click();
}

let dealCards = () => {};
$('.field').contextmenu(function() { return false });

function isMouseOverField(e) {
	const rect = $('.field')[0].getBoundingClientRect();
	return e.pageX > rect.left && e.pageX < rect.right && e.pageY > rect.top && e.pageY < rect.bottom;
}

function rotateField() {
	// $('.field')[0].style.transform = 'rotate(' + $('.rotation').val() + 'deg)';
}

// $('.rotation').change((e) => { rotateField(); });

$(document).mouseup((e) => {
	if (selectedCard !== undefined && isMouseOverField(e)) {
		const x = e.pageX - $('.field').offset().left - clickOffsetX;
		const y = e.pageY - $('.field').offset().top - clickOffsetY;
		// const rotation = parseInt($('.rotation').val());
		// const rotationRad = rotation * Math.PI / 180;
		// console.log(rotationRad);
		// const newX = 800 * Math.cos(rotationRad) - x * Math.cos(rotationRad) + y * Math.sin(rotationRad);
		// const newY = 800 * Math.sin(rotationRad) - x * Math.sin(rotationRad) - y * Math.cos(rotationRad);
		// console.log(x, y, newX, newY);
		if (parseInt(selectedCard.data('id')) === -1) {
			// Placing a card from your hand
			emit('server.placeCard', {
				card: selectedCard.data('card'),
				location: { x: x, y: y },
				facedown: dropFaceDown
				// rotation: (-rotation + 360) % 360
			});
		} else {
			// Placing a card picked up on the field
			emit('server.moveCard', {
				id: parseInt(selectedCard.data('id')),
				location: { x, y }
			});
			emit('server.freeLock', {});
		}
	}
	else if (selectedCard !== undefined) {
		selectedCard.show();
		$('.cursor').hide();
	}
	selectedCard = undefined;
});

// Cursor Updates

let lastSentCursorTime = 0;
$(document).mousemove((e) => {
	const curTime = Date.now();
	let canTick = false;
	if (curTime > lastSentCursorTime + CURSOR_UPDATE_TICK) {
		canTick = true;
	}
	$('.cursor').hide();
	if (selectedCard !== undefined) {
		const id = parseInt(selectedCard.data('id'));
		if (id !== -1) {
			if (isMouseOverField(e) && canTick) {
				// Not From Hand Update Movement
				emit('server.moveCard', {
					id,
					location: {
						x: e.pageX - $('.field').offset().left - clickOffsetX,
						y: e.pageY - $('.field').offset().top - clickOffsetY,
					}
				});
			}
		}
		else {
			$('.cursor').show();
			$('.cursor')[0].style.top = (e.pageY - clickOffsetY) + 'px';
			$('.cursor')[0].style.left = (e.pageX - clickOffsetX) + 'px';
		}
	}
	if (canTick && myName) {
		const rect = $('.fieldOverlay').offset();
	
		const x = e.pageX - rect.left;
		const y = e.pageY - rect.top;
		emit('server.cursor', {
			x, y
		});
		lastSentCursorTime = curTime;
	}
});

const cursorObjectMap = {};
socket.on('client.cursor', function(data) {
	const name = data.name;
	if (!cursorObjectMap[name]) {
		const element = $(`
			<div class="otherPlayerCursor">${name}</div>
		`);
		$('.fieldOverlay').append(element);
		cursorObjectMap[name] = {
			element: element,
			lastUpdate: 0
		};
	}
	const now = Date.now();
	cursorObjectMap[name].lastUpdate = now;
	cursorObjectMap[name].element[0].style.left = (data.x) + 'px';
	cursorObjectMap[name].element[0].style.top = (data.y) + 'px';
	Object.keys(cursorObjectMap).forEach(key => {
		if (now - cursorObjectMap[key].lastUpdate > 1000) {
			// 1 second without update we delete cursor 
			cursorObjectMap[key].element[0].remove();
			delete cursorObjectMap[key];
		}
	});
});

socket.on('client.moveCard', function(data) {
	const card = cardsInField[data.id];
	if (card) {
		card[0].style.left = (data.location.x) + 'px';
		card[0].style.top = (data.location.y) + 'px';
	}
});

function onMouseDownOnCard(e, id) {
	const isHand = id === -1;
	let rect = e.currentTarget.getBoundingClientRect();
	if (!isHand) {
		// When we lock the card target doesn't exist anymore, it gets remade
		const card = cardsInField[id];
		if (card) {
			rect = card[0].getBoundingClientRect();
		}
	}
	clickOffsetX = e.pageX - rect.left;
	clickOffsetY = e.pageY - rect.top;
	if (isHand) {
		let newElem = selectedCard.clone();
		if (dropFaceDown) {
			newElem = $(`<div class='card back'>&nbsp;</div>`);
		}
		$('.cursor').html(newElem);

		newElem[0].style.top = '0px';
		newElem[0].style.left = '0px';
		$('.cursor')[0].style.top = (e.pageY - clickOffsetY) + 'px';
		$('.cursor')[0].style.left = (e.pageX - clickOffsetX) + 'px';
		$('.cursor').show();
		selectedCard.hide();
	} else {
		$('.cursor').hide();
	}
}

$('.playAreaSelect').change(() => {
	const vals = $('.playAreaSelect').val().split(',');
	emit('server.changePlayArea', {
		top: vals[0] + '%',
		left: vals[1] + '%'
	});
});

$('#chatTextbox').keydown(function(e) {
	console.log(e.which);
	if (e.which == 13) {
		sendChat();
	}
});

socket.on('client.chat', function(data) {
	const date = new Date(data.timestamp);

	$('.chatBox').append(`(${date.getHours()}:${date.getMinutes()}) ${data.name}: ${data.message}\n`);
	$('.chatBox').scrollTop($('.chatBox')[0].scrollHeight);
});

let lastCardMouseDown = 0;

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
	cardsInField = {};
	
	console.log(data);
	myPlayArea = undefined;
	players = data.players;
	
	for (let i = 0; i < data.players.length; i++) {
		const div = $(`<div class="playArea" style="top: ${data.players[i].playArea.top}; left: ${data.players[i].playArea.left}">
			<div class="name">${data.players[i].name}</div>
		</div>`);
		$('.field').append(div);
		if (data.players[i].name === myName) {
			myPlayArea = div;
			div.append(`<button onclick='flipOverPlayArea()'>Flip Over</button>`);
		}
	}
	Object.keys(data.field).forEach(i => {
		let card = $(createCard(data.field[i].card, data.field[i].lastTouch, 0, i));
		if (data.field[i].facedown) {
			card = $(`<div class='card back' data-id='${i}' style='z-index: ${data.field[i].lastTouch};'>&nbsp;</div>`);
		}
		cardsInField[i] = card;
		card[0].style['transform-origin'] = 'top left';
		card[0].style.position = "absolute";
		card[0].style.top = data.field[i].y + "px";
		card[0].style.left = data.field[i].x + "px";

		
		card.mousedown((e) => {
			if (e.which === 1) {
				if (Date.now() - lastCardMouseDown < 300) {
					emit('server.takeCard', {
						id: i
					});
					return;
				}
				
				lastCardMouseDown = Date.now();
				emit('server.lockForMove', {
					id: i
				}, () => {
					selectedCard = card;
					dropFaceDown = data.field[i].facedown;
					onMouseDownOnCard(e, i);
				});
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
	});
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
			.map(p => '<input type="checkbox" id="' + p.name + 'DealCheckbox" value="shuffle" ' + checkMapping[p.name] + '>' + p.name + ' (' + p.cardCount + ')')
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

socket.on('client.joinSuccess', function (pos) {
	$('#game').show();
	$('#login').hide();
	// $(".rotation")[0].selectedIndex = pos % 4;
	// rotateField();
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

$('.sortingMethod').change(() => { updateHand(); });
$('.trumpSuit').change(() => { updateHand(); });
$('.trumpNumber').change(() => { updateHand(); });

function sortHand() {
	if ($('.sortingMethod').val() === 'tractor') {
		sortHandTractor();
	}
	else {
		sortHandBig2();
	}
}

function sortHandBig2() {
	function cardVal(c) {
		if (c === 'JJ') return 10000;
		else if (c === 'JJ') return 1000;
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
	cardHand.sort((a, b) => cardVal(a) - cardVal(b));
}

function sortHandTractor()
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
				else insertIntoBySuit(c, mains);
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
		if (cVal >= currVal)
		{
			lst.splice(i, 0, card);
			return lst;
		}

	}
	lst.push(card);
	return lst;
}

// insertIntoBySuit(card, lst) inserts the card into the list in the same suit order and produces
//   the resulting list.
// insertInto: Str Arr<Str> -> Arr<Str>
function insertIntoBySuit(card, lst)
{
	for (let i = 0; i < lst.length; i++)
	{
		if (card.slice(-1) === lst[i].slice(-1))
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
		let card = $(createCard(cardHand[i], i, i * 30, -1));
		// So it captures the right number in the closure.
		let lastDown = 0;
		
		card.mousedown((e) => {
			if (Date.now() - lastDown < 300) {
				if (!myPlayArea) {
					console.error('Invalid play area!');
					return;
				}
				const fieldOffset = $('.field').offset();
				const playAreaOffset = myPlayArea.offset();

				emit('server.placeCardPlayArea', {
					card: card.data('card'),
					facedown: e.which === 2,
					location: {
						x: playAreaOffset.left - fieldOffset.left + 10,
						y: playAreaOffset.top - fieldOffset.top + 100
					}
				})
				return;
			}
			lastDown = Date.now();
			dropFaceDown = e.which === 2;
			selectedCard = card;
			onMouseDownOnCard(e, -1);
		});
		card.contextmenu(function() { return false });
		$('.me').append(card);
	}
}

function flipOverPlayArea() {
	const fieldOffset = $('.field').offset();
	const playAreaOffset = myPlayArea.offset();
	emit('server.flipOverPlayArea', {
			x: playAreaOffset.left - fieldOffset.left,
			y: playAreaOffset.top - fieldOffset.top,
			width: myPlayArea.width(),
			height: myPlayArea.height()
	});
}