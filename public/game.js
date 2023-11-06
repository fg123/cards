const CURSOR_UPDATE_TICK = 32;

const socket = io();
let myName = '';
let myId = '';
let players = [];
let serverDeckCount = 0;
let gamePlaying = false;
let currentTurn = false;
let cardHand = [];
let mainCard = '5D';
let selectedCard = undefined;
let clickOffsetX = 0;
let clickOffsetY = 0;

let cardsInField = {};

const cardsReady = new Set();

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

$('#btnScoreup').click(function() {
	emit('server.chat', {message: "/scoreadd 1" });
});

$('#btnScoredown').click(function() {
	emit('server.chat', {message: "/scoreadd -1" });
});

$('#bntSetDealtCards').click(function() {

    var dealCount = 0;
    for (let i = 0; i < players.length; i++) {
        if (document.getElementById(players[i].name + 'DealCheckbox') &&
            document.getElementById(players[i].name + 'DealCheckbox').checked) {
            dealCount++;
        }
    }

    var serverDeckCountTemp = serverDeckCount;
    var deckCountMod  = serverDeckCountTemp % dealCount;
    if(deckCountMod === 0) deckCountMod = dealCount;
    if(deckCountMod < 4) {
        deckCountMod += dealCount;
    }
    serverDeckCountTemp -= deckCountMod;

    if(serverDeckCountTemp < 0) serverDeckCountTemp = 0;

    document.getElementById('dealCount').value = serverDeckCountTemp;
});


$('#btnPlayCards').click(function() {
    cardsReady.forEach(function(id) {
        placeCardPlayArea(id, false);
    })
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
    if (selectedCard === undefined) return;
    const id = parseInt(selectedCard.data('id'));
	if (isMouseOverField(e)) {
		const x = e.pageX - $('.field').offset().left - clickOffsetX;
		const y = e.pageY - $('.field').offset().top - clickOffsetY;
		// const rotation = parseInt($('.rotation').val());
		// const rotationRad = rotation * Math.PI / 180;
		// console.log(rotationRad);
		// const newX = 800 * Math.cos(rotationRad) - x * Math.cos(rotationRad) + y * Math.sin(rotationRad);
		// const newY = 800 * Math.sin(rotationRad) - x * Math.sin(rotationRad) - y * Math.cos(rotationRad);
		// console.log(x, y, newX, newY);
		if (selectedCard.data('isonhand')) {
			// Placing a card from your hand
			emit('server.placeCard', {
				id: id,
				location: { x: x, y: y },
				facedown: dropFaceDown
				// rotation: (-rotation + 360) % 360
			});
            if (cardsReady.has(id)) cardsReady.delete(id);
		} else {
			// Placing a card picked up on the field
			emit('server.moveCard', {
				id: id,
				location: { x, y }
			});
			emit('server.freeLock', {});
		}
	}
	else {
        if (selectedCard.data('isonhand')) {
            if(cardsReady.has(id)) {
                cardsReady.delete(id);
                selectedCard.css("top", "0px");
            }
            else {
                cardsReady.add(id);
                selectedCard.css("top", "-30px");
            }
        }
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
		if (!selectedCard.data('isonhand')) {
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
		else { // onhand
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
			Server Deck Count: ${data.deckCount}
			<br>
	`);
	$('.field').html('');
	cardsInField = {};

	console.log(data);
	myPlayArea = undefined;
	players = data.players;
    serverDeckCount = data.deckCount

	for (let i = 0; i < data.players.length; i++) {
		const div = $(`<div class="playArea" style="top: ${data.players[i].playArea.top}; left: ${data.players[i].playArea.left}">
			<div class="name">${data.players[i].name + " (" + data.players[i].score + ")"}</div>
		</div>`);
		$('.field').append(div);
		if (data.players[i].name === myName) {
			myPlayArea = div;
			div.append(`<button onclick='flipOverPlayArea()'>Flip Over</button>`);
		}
	}
	Object.keys(data.field).forEach(i => {
		let card = $(createCard(data.field[i].card, data.field[i].lastTouch, 0, i, false));
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

socket.on('client.gif', function (name, link) {
    const gifContainer = document.getElementById("gifContainer");
	const gifPlayer = document.getElementById("gifPlayer");
    const gifPlayerName = document.getElementById("gifPlayerName");
    gifPlayer.src = link;
    gifPlayerName.innerHTML = name;
    gifContainer.style.display = "block";
    setTimeout(()=> {
        gifPlayer.src = "";
        gifContainer.style.display = "none";
    }, 5000);
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

// createCard(cardValue, index, xPos) produces a <div> string of the created card with
//   the given values to display the card.
// createCard: Str Num Num -> Str
function createCard(cardValue, index, xPos, id, isOnHand)
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
		cardSuit = MAHJONG_MAP[cardValue];
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

$('.sortingMethod').change(() => { updateHand(); });
$('.trumpSuit').change(() => { updateHand(); });
$('.trumpNumber').change(() => { updateHand(); });

function sortHand() {
	if (cardHand.some(x => x.card.startsWith("M-"))) {
		sortHandMahjong();
	}
	else if ($('.sortingMethod').val() === 'tractor') {
		sortHandTractor();
	}
	else {
		sortHandBig2();
	}
}

function sortHandMahjong() {
	function cardVal(c) {
		return Object.keys(MAHJONG_MAP).indexOf(c);
	}
	cardHand.sort((a, b) => cardVal(a.card) - cardVal(b.card));
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
	cardHand.sort((a, b) => cardVal(a.card) - cardVal(b.card));
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
				else insertIntoBySuit(card, mains);
			}
			else
			{
				switch (suit)
				{
					case 'H': hearts = insertInto(card, hearts); break;
					case 'D': diamonds = insertInto(card, diamonds); break;
					case 'S': spades = insertInto(card, spades); break;
					case 'C': clubs = insertInto(card, clubs); break;
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
// insertInto: CardObj Arr<Str> -> Arr<Str>
function insertInto(card, lst)
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

// insertIntoBySuit(card, lst) inserts the card into the list in the same suit order and produces
//   the resulting list.
// insertInto: cardObj Arr<Str> -> Arr<Str>
function insertIntoBySuit(card, lst)
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

// updateHand() updates the player's hand with the cards in cardHand
function updateHand()
{
	if (cardHand.length !== 0) sortHand();
	let cardOffset = 30;
	if (cardHand.some(x => x.card.startsWith("M-"))) {
		cardOffset = 90;
	}
	console.log(cardHand);
	$('.me').width(cardHand.length * cardOffset + 80);
	$('.me').html('');
	for (let i = 0; i < cardHand.length; i++) {
		let card = $(createCard(cardHand[i].card, i, i * cardOffset, cardHand[i].id, true)); // true = on hand
		// So it captures the right number in the closure.
		let lastDown = 0;

		card.mousedown((e) => {
			if (Date.now() - lastDown < 300) {
				if (!myPlayArea) {
					console.error('Invalid play area!');
					return;
				}
                const id = parseInt(card.data('id'));
                placeCardPlayArea(id, e.which === 2);
				return;
			}
			lastDown = Date.now();
			dropFaceDown = e.which === 2;
			selectedCard = card;
			onMouseDownOnCard(e, -1);
		});
		card.contextmenu(function() { return false });

        if(cardsReady.has(cardHand[i].id)) {
            card.css("top", "-30px");
        }
		$('.me').append(card);
	}
}

function placeCardPlayArea(id, facedown)
{
    const fieldOffset = $('.field').offset();
    const playAreaOffset = myPlayArea.offset();

    emit('server.placeCardPlayArea', {
        id: id,
        facedown: facedown,
        location: {
            x: playAreaOffset.left - fieldOffset.left + 10,
            y: playAreaOffset.top - fieldOffset.top + 100
        }
    })
    if (cardsReady.has(id)) cardsReady.delete(id);
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

$(".scoreboard").mouseover(function(){
  $(".showhide_panel").css("display", "block");
});

$(".scoreboard").mouseout(function(){
  $(".showhide_panel").css("display", "none");
});
