let socket = io() // Connect to server


// Sign In Page Elements
////////////////////////////////////////////////////////////////////////////
// Divs
let joinDiv = document.getElementById('join-game')
let joinErrorMessage = document.getElementById('error-message')
// Input Fields
let joinNickname = document.getElementById('join-nickname')
let joinRoom = document.getElementById('join-room')
let joinPassword = document.getElementById('join-password')
// Buttons
let joinEnter = document.getElementById('join-enter')
let joinCreate = document.getElementById('join-create')


// Game Page Elements
////////////////////////////////////////////////////////////////////////////
// Divs
let gameDiv = document.getElementById('game')
let boardDiv = document.getElementById('board')
let aboutWindow = document.getElementById('about-window')
let optionsWindow = document.getElementById('options-window')
let wordpoolWindow = document.getElementById('wordpool-window')
let afkWindow = document.getElementById('afk-window')
let serverMessageWindow = document.getElementById('server-message')
let serverMessage = document.getElementById('message')
let overlay = document.getElementById('overlay')
let wordpoolButtons = document.getElementById('wordpool-buttons')
// Buttons
let leaveRoom = document.getElementById('leave-room')
let newGame = document.getElementById('new-game')
let sendMessage = document.getElementById('input-chat')
let buttonAbout = document.getElementById('about-button')
let buttonOptions = document.getElementById('options-button')
let buttonWordpool = document.getElementById('wordpool-button')
let buttonCloseOptions = document.getElementById('close-options-button')
let buttonCloseWordpool = document.getElementById('close-wordpool-button')
let buttonCustomWordpool = document.getElementById('custom-wordpool-button')
let buttonAfk = document.getElementById('not-afk')
let buttonServerMessageOkay = document.getElementById('server-message-okay')
// Player Lists
let playerList = document.getElementById('player-list')
// UI Elements
let turnMessage = document.getElementById('status')
let timer = document.getElementById('timer')
// Chat
let boxMessages = document.getElementById('boxMessages')
// Words
nbLetter = document.getElementById("nbLetter")
kana = document.getElementById("kana")
kanji = document.getElementById("kanji")
romaji = document.getElementById("romaji")
// options
showKana = document.getElementById("show-kana")
showKanji = document.getElementById("show-kanji")
showRomaji = document.getElementById("show-romaji")
// text area
customWordPoolArea = document.getElementById("wordpool-text-area")

////////
// UI Interaction with server
////////

// User Joins Room
joinEnter.onclick = () => {
  socket.emit('joinRoom', {
    nickname:joinNickname.value,
    room:joinRoom.value,
    password:joinPassword.value
  })
}
// User Creates Room
joinCreate.onclick = () => {
  socket.emit('createRoom', {
    nickname:joinNickname.value,
    room:joinRoom.value,
    password:joinPassword.value
  })
}
// User Leaves Room
leaveRoom.onclick = () => {
  socket.emit('leaveRoom', {})
}
// User Starts New Game
newGame.onclick = () => {
  socket.emit('newGame', {})
  timer.style.display = ''
}
// User Toggle show kana option
showKana.onclick = () => {
  socket.emit('updateWords', {kana:showKana.checked, kanji:showKanji.checked, romaji:showRomaji.checked})
}
// User Toggle show kanji option
showRomaji.onclick = () => {
  socket.emit('updateWords', {kana:showKana.checked, kanji:showKanji.checked, romaji:showRomaji.checked})
}
// User Toggle show romaji option
showRomaji.onclick = () => {
  socket.emit('updateWords', {kana:showKana.checked, kanji:showKanji.checked, romaji:showRomaji.checked})
}
// User Send chat message
sendMessage.addEventListener("keyup", function(event) {
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    socket.emit('sendMessage', {value:sendMessage.value})
    sendMessage.value = ""
  }
});

// Send wordpool change to server
function changeWordpoll(wordpool){
  socket.emit('changeWordpool', {wordpool:wordpool})
}

// User Clicks About
buttonAbout.onclick = () => {
  if (aboutWindow.style.display === 'none') {
    aboutWindow.style.display = 'block'
    overlay.style.display = 'block'
    buttonAbout.className = 'open above'
  } else {
    aboutWindow.style.display = 'none'
    overlay.style.display = 'none'
    buttonAbout.className = 'above'
  }
}
// User clicks Options
buttonOptions.onclick = () => {
  if (optionsWindow.style.display === 'none') {
    optionsWindow.style.display = 'block'
    overlay.style.display = 'block'
    buttonAbout.className = 'open above'
  } else {
    optionsWindow.style.display = 'none'
    overlay.style.display = 'none'
    buttonAbout.className = 'above'
  }
}
// User clicks wordpool menu button
buttonWordpool.onclick = () => {
  if (wordpoolWindow.style.display === 'none') {
    wordpoolWindow.style.display = 'block'
    overlay.style.display = 'block'
    buttonAbout.className = 'open above'
  } else {
    wordpoolWindow.style.display = 'none'
    overlay.style.display = 'none'
    buttonAbout.className = 'above'
  }
}
// User clicks close options
buttonCloseOptions.onclick = () => {
  optionsWindow.style.display = 'none'
  overlay.style.display = 'none'
  buttonAbout.className = 'above'
}
// User clicks close wordpool menu
buttonCloseWordpool.onclick = () => {
  wordpoolWindow.style.display = 'none'
  overlay.style.display = 'none'
  buttonAbout.className = 'above'
}
// User clicks to use custom wordpool
buttonCustomWordpool.onclick = () => {
  let CompleteCSV = "kana;kanji;romaji;english\n" + customWordPoolArea.value
  wordpool = Papa.parse(CompleteCSV, {header:true, skipEmptyLines:'greedy'}).data
  socket.emit("changeWordpoolCustom", wordpool)
}

// User confirms theyre not afk
buttonAfk.onclick = () => {
  socket.emit('active')
  afkWindow.style.display = 'none'
  overlay.style.display = 'none'
}

// User confirms server message
buttonServerMessageOkay.onclick = () => {
  serverMessageWindow.style.display = 'none'
  overlay.style.display = 'none'
}

////////
// Server Responses to this client
////////
socket.on('serverStats', (data) => {        // Client gets server stats
  document.getElementById('server-stats').innerHTML = "Players: " + data.players + " | Rooms: " + data.rooms
})

socket.on('joinResponse', (data) =>{        // Response to joining room
  if(data.success){
    joinDiv.style.display = 'none'
    gameDiv.style.display = 'block'
    joinErrorMessage.innerText = ''
  } else joinErrorMessage.innerText = data.msg
})

socket.on('createResponse', (data) =>{      // Response to creating room
  if(data.success){
    joinDiv.style.display = 'none'
    gameDiv.style.display = 'block'
    joinErrorMessage.innerText = ''
  } else joinErrorMessage.innerText = data.msg
})

socket.on('newMessage', (data) =>{      // Response to receiving a chat message
  var newMessage = document.createElement('p');
  if (! data.foundAnswer){
    newMessage.innerHTML = "<b>" + data.nickname + ": </b><span>" + data.message + "</span>"
  }
  else {
    newMessage.innerHTML = "<b>" + data.nickname + ": </b><span style='color:#228B22'>" + data.message + "</span>"
  }
  boxMessages.appendChild(newMessage)
  boxMessages.scrollTop = boxMessages.scrollHeight // scroll to the bottom
})

socket.on('leaveResponse', (data) =>{       // Response to leaving room
  if(data.success){
    joinDiv.style.display = 'block'
    gameDiv.style.display = 'none'
  }
})

socket.on('timerUpdate', (data) => {        // Server update client timer
  timer.innerHTML = "[" + data.timer + "]"
})

socket.on('afkWarning', () => {    // Response to Afk Warning
  afkWindow.style.display = 'block'
  overlay.style.display = 'block'
})

socket.on('afkKicked', () => {    // Response to Afk Kick
  afkWindow.style.display = 'none'
  serverMessageWindow.style.display = 'block'
  serverMessage.innerHTML = 'You were kicked for being AFK'
  overlay.style.display = 'block'
})

socket.on('serverMessage', (data) => {    // Response to Server message
  serverMessage.innerHTML = data.msg
  serverMessageWindow.style.display = 'block'
  overlay.style.display = 'block'
})

socket.on('gameState', (data) =>{           // Response to gamestate update
  updateInfo(data.game, data.players)      // Update the games turn information
  updatePlayerlist(data.players)        // Update the player list for the room
  updateBoard(data.game.board)
  updateOptions(data.game)
  updateWordpools(data.game) // Update available wordpools
})

////////
// Utility Functions
////////

function updateWordpools(game){
  wordpoolButtons.innerHTML = ""
  let buttons = ''
  for (let i=0; i < game.wordpools.length; i++){
    let button = "<button class=\'wordpool-button\' onClick=\'changeWordpoll(\"" + game.wordpools[i] + "\")'>" + game.wordpools[i] + "</button>\n"
    buttons += button
  }
  wordpoolButtons.innerHTML = buttons
}

// Update the game info displayed to the client
function updateInfo(game, players){
  turnMessage.innerHTML = "Round " + game.currentRound + " of " + game.rounds // Update the turn msg
  if (game.over){                                         // Display winner
    turnMessage.innerHTML = game.winner + " wins!"
    timer.style.display = 'none'
  }
}

function updateBoard(gameBoard){
  nbLetter.innerHTML = "<u>Number of letters: " + gameBoard.nbLetter + "</u>"
  kana.innerHTML = (gameBoard.kana === undefined) ? "" : "kana: " + gameBoard.kana
  kanji.innerHTML = (gameBoard.kanji === undefined) ? "" : "kanji: " + gameBoard.kanji
  romaji.innerHTML = (gameBoard.romaji === undefined) ? "" : "romaji: " + gameBoard.romaji
}

function updateOptions(game){
  showKana.checked = game.showKana
  showKanji.checked = game.showKanji
  showRomaji.checked = game.showRomaji
}

// Update the player list
function updatePlayerlist(players){
  playerList.innerHTML = ''
  for (let i in players){
    // Create a li element for each player
    let li = document.createElement('li');
    li.innerText = players[i].nickname + " (" + players[i].score + ")"
    playerList.appendChild(li)
  }
}
