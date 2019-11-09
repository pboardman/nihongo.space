// Express
let express = require('express')

// Create app
let app = express()

//Set up server
let server = app.listen(process.env.PORT || 2000, listen);

// Callback function confirming server start
function listen(){
  let host = server.address().address;
  let port = server.address().port;
  console.log('Nihongo Server Started at http://' + host + ':' + port);
}

// Files for client
app.use(express.static('public'))

// Websocket
let io = require('socket.io')(server)

// Catch wildcard socket events
var middleware = require('socketio-wildcard')()
io.use(middleware)

// Make API requests
const Heroku = require('heroku-client')
const heroku = new Heroku({ token:process.env.API_TOKEN})// DELETE requests

// Game
const Game = require('./server/game.js')

// Objects to keep track of sockets, rooms and players
let SOCKET_LIST = {}
let ROOM_LIST = {}
let PLAYER_LIST = {}

// Room class
// Live rooms will have a name and password and keep track of game options / players in room
class Room {
  constructor(name, pass){
    this.room = '' + name
    this.password = '' + pass
    this.players = {}
    this.game = new Game()
    this.mode = 'casual'

    // Add room to room list
    ROOM_LIST[this.room] = this
  }
}

// Player class
// When players log in, they give a nickname, have a socket and a room they're trying to connect to
class Player {
  constructor(nickname, room, socket){
    this.id = socket.id

    // If someone in the room has the same name, append (1) to their nickname
    let nameAvailable = false
    let nameExists = false;
    let tempName = nickname
    let counter = 0
    while (!nameAvailable){
      if (ROOM_LIST[room]){
        nameExists = false;
        for (let i in ROOM_LIST[room].players){
          if (ROOM_LIST[room].players[i].nickname === tempName) nameExists = true
        }
        if (nameExists) tempName = nickname + "(" + ++counter + ")"
        else nameAvailable = true
      }
    }
    this.nickname = tempName
    this.room = room
    this.timeout = 2100         // # of seconds until kicked for afk (35min)
    this.afktimer = this.timeout
    this.score = 0
    this.foundAnswer = false

    // Add player to player list and add their socket to the socket list
    PLAYER_LIST[this.id] = this
  }
}

////////
// Server logic
////////
io.sockets.on('connection', function(socket){

  // Alert server of the socket connection
  SOCKET_LIST[socket.id] = socket
  logStats('CONNECT: ' + socket.id)

  // Pass server stats to client
  socket.emit('serverStats', {
    players: Object.keys(PLAYER_LIST).length,
    rooms: Object.keys(ROOM_LIST).length
  })

  ////////
  // Lobby
  ////////

  // Room Creation. Called when client attempts to create a rooom
  // Data: player nickname, room name, room password
  socket.on('createRoom', (data) => {createRoom(socket, data)})

  // Room Joining. Called when client attempts to join a room
  // Data: player nickname, room name, room password
  socket.on('joinRoom', (data) => {joinRoom(socket, data)})

  // Room Leaving. Called when client leaves a room
  socket.on('leaveRoom', () =>{leaveRoom(socket)})

  // Client Disconnect
  socket.on('disconnect', () => {socketDisconnect(socket)})

  ////////
  // Game
  ////////

  // New Game. Called when client starts a new game
  socket.on('newGame', () =>{newGame(socket)})

  // Active. Called whenever client interacts with the game, resets afk timer
  socket.on('*', () => {
    if (!PLAYER_LIST[socket.id]) return // Prevent Crash
    PLAYER_LIST[socket.id].afktimer = PLAYER_LIST[socket.id].timeout
  })

  // Update which words are shown on screen (kana, kanji, romaji)
  socket.on('updateWords', (data) => {
    if (!PLAYER_LIST[socket.id]) return // Prevent Crash
    let room = PLAYER_LIST[socket.id].room  // Get the room the client was in
    let game = ROOM_LIST[room].game

    game.showKana = (data.kana) ? true : false
    game.showKanji = (data.kanji) ? true : false
    game.showRomaji = (data.romaji) ? true : false

    gameUpdate(room)
  })

  // Send Message to chatbox
  socket.on('sendMessage', (data) => {
    if (!PLAYER_LIST[socket.id]) return // Prevent Crash
    let room = PLAYER_LIST[socket.id].room  // Get the room the client was in

    // Check if the message is the word we are looking for
    let foundAnswer = false
    if (ROOM_LIST[room].game.checkAnswer(data.value) && ! PLAYER_LIST[socket.id].foundAnswer){
      PLAYER_LIST[socket.id].score += 1 // Increment score
      PLAYER_LIST[socket.id].foundAnswer = true // Prevent a player from answering twice
      data.value = "Found the answer!"
      foundAnswer = true

      // Check if everyone found the answer
      if (wordDone(room)){
        if(ROOM_LIST[room].game.checkOver()){ // check of the game is over
          ROOM_LIST[room].game.winner = computerWinner(room)
          gameUpdate(room)
          return
        }
        changeWord(room) // Everyone found the word, changing word.
      }
    }

    for (let player in ROOM_LIST[room].players){
      SOCKET_LIST[player].emit('newMessage', {message:data.value, nickname:PLAYER_LIST[socket.id].nickname, foundAnswer:foundAnswer})  // send the new chat message
    }

    gameUpdate(room)
  })
  // Change the room wordpool
  socket.on('changeWordpool', (data) => {
    if (!PLAYER_LIST[socket.id]) return // Prevent Crash
    let room = PLAYER_LIST[socket.id].room  // Get the room the client was in
    ROOM_LIST[room].game.changeWordpool(data.wordpool)
    gameUpdate(room)
  })

  // Change the room wordpool for a custom one
  socket.on('changeWordpoolCustom', (data) => {
    if (!PLAYER_LIST[socket.id]) return // Prevent Crash
    let room = PLAYER_LIST[socket.id].room  // Get the room the client was in
    ROOM_LIST[room].game.changeWordpoolCustom(data)
    gameUpdate(room)
  })

})

function computerWinner(room){
  let bestScore = -1
  let playerNick = ''

  for (let player in ROOM_LIST[room].players){
    if (PLAYER_LIST[player].score > bestScore){
      playerNick = PLAYER_LIST[player].nickname
    } else if (PLAYER_LIST[player].score === bestScore){
      playerNick += " + " + PLAYER_LIST[player].nickname
    }
  }

  return playerNick
}

// Check if everyone found the word currently on the board
function wordDone(room){
  let wordDone = true
  for (let player in ROOM_LIST[room].players){
    if (! PLAYER_LIST[player].foundAnswer){
      wordDone = false
    }
  }

  return wordDone
}

// Change the word currently on the board
function changeWord(room){
  for (let player in ROOM_LIST[room].players){ // Let everyone know what the answer was
    SOCKET_LIST[player].emit('newMessage', {message:"The answer was: " + ROOM_LIST[room].game.answer, nickname:"server", foundAnswer:false})  // send the new chat message
  }

  ROOM_LIST[room].game.nextWord()
  for (let player in ROOM_LIST[room].players){
    PLAYER_LIST[player].foundAnswer = false // reset foundAnswer since we are changing word
  }
}

// Create room function
// Gets a room name and password and attempts to make a new room if one doesn't exist
// On creation, the client that created the room is created and added to the room
function createRoom(socket, data){
  let roomName = data.room.trim()     // Trim whitespace from room name
  let passName = data.password.trim() // Trim whitespace from password
  let userName = data.nickname.trim() // Trim whitespace from nickname

  if (ROOM_LIST[roomName]) {   // If the requested room name is taken
    // Tell the client the room arleady exists
    socket.emit('createResponse', {success:false, msg:'Room Already Exists'})
  } else {
    if (roomName === "") {
      // Tell the client they need a valid room name
      socket.emit('createResponse', {success:false, msg:'Enter A Valid Room Name'})
    } else {
      if (userName === ''){
        // Tell the client they need a valid nickname
        socket.emit('createResponse', {success:false, msg:'Enter A Valid Nickname'})
      } else {    // room name and nickname are both valid, proceed
        new Room(roomName, passName)                          // Create a new room
        let player = new Player(userName, roomName, socket)   // Create a new player
        ROOM_LIST[roomName].players[socket.id] = player       // Add player to room
        socket.emit('createResponse', {success:true, msg: ""})// Tell client creation was successful
        gameUpdate(roomName)                                  // Update the game for everyone in this room
        logStats(socket.id + "(" + player.nickname + ") CREATED '" + ROOM_LIST[player.room].room + "'(" + Object.keys(ROOM_LIST[player.room].players).length + ")")
      }
    }
  }
}

// Join room function
// Gets a room name and password and attempts to join said room
// On joining, the client that joined the room is created and added to the room
function joinRoom(socket, data){
  let roomName = data.room.trim()     // Trim whitespace from room name
  let pass = data.password.trim()     // Trim whitespace from password
  let userName = data.nickname.trim() // Trim whitespace from nickname

  if (!ROOM_LIST[roomName]){
    // Tell client the room doesnt exist
    socket.emit('joinResponse', {success:false, msg:"Room Not Found"})
  } else {
    if (ROOM_LIST[roomName].password !== pass){
      // Tell client the password is incorrect
      socket.emit('joinResponse', {success:false, msg:"Incorrect Password"})
    } else {
      if (userName === ''){
        // Tell client they need a valid nickname
        socket.emit('joinResponse', {success:false, msg:'Enter A Valid Nickname'})
      } else {  // If the room exists and the password / nickname are valid, proceed
        let player = new Player(userName, roomName, socket)   // Create a new player
        ROOM_LIST[roomName].players[socket.id] = player       // Add player to room
        // player.joinTeam()                                     // Distribute player to team
        socket.emit('joinResponse', {success:true, msg:""})   // Tell client join was successful
        gameUpdate(roomName)                                  // Update the game for everyone in this room
        // Server Log
        logStats(socket.id + "(" + player.nickname + ") JOINED '" + ROOM_LIST[player.room].room + "'(" + Object.keys(ROOM_LIST[player.room].players).length + ")")
      }
    }
  }
}

// Leave room function
// Gets the client that left the room and removes them from the room's player list
function leaveRoom(socket){
  if (!PLAYER_LIST[socket.id]) return // Prevent Crash
  let player = PLAYER_LIST[socket.id]              // Get the player that made the request
  delete PLAYER_LIST[player.id]                    // Delete the player from the player list
  delete ROOM_LIST[player.room].players[player.id] // Remove the player from their room
  gameUpdate(player.room)                          // Update everyone in the room
  // Server Log
  logStats(socket.id + "(" + player.nickname + ") LEFT '" + ROOM_LIST[player.room].room + "'(" + Object.keys(ROOM_LIST[player.room].players).length + ")")

  // If the number of players in the room is 0 at this point, delete the room entirely
  if (Object.keys(ROOM_LIST[player.room].players).length === 0) {
    delete ROOM_LIST[player.room]
    logStats("DELETE ROOM: '" + player.room + "'")
  }
  socket.emit('leaveResponse', {success:true})     // Tell the client the action was successful
}

// Disconnect function
// Called when a client closes the browser tab
function socketDisconnect(socket){
  let player = PLAYER_LIST[socket.id] // Get the player that made the request
  delete SOCKET_LIST[socket.id]       // Delete the client from the socket list
  delete PLAYER_LIST[socket.id]       // Delete the player from the player list

  if(player){   // If the player was in a room
    delete ROOM_LIST[player.room].players[socket.id] // Remove the player from their room
    gameUpdate(player.room)                          // Update everyone in the room
    // Server Log
    logStats(socket.id + "(" + player.nickname + ") LEFT '" + ROOM_LIST[player.room].room + "'(" + Object.keys(ROOM_LIST[player.room].players).length + ")")

    // If the number of players in the room is 0 at this point, delete the room entirely
    if (Object.keys(ROOM_LIST[player.room].players).length === 0) {
      delete ROOM_LIST[player.room]
      logStats("DELETE ROOM: '" + player.room + "'")
    }
  }
  // Server Log
  logStats('DISCONNECT: ' + socket.id)
}

// New game function
// Gets client that requested the new game and instantiates a new game board for the room
function newGame(socket){
  if (!PLAYER_LIST[socket.id]) return // Prevent Crash
  let room = PLAYER_LIST[socket.id].room  // Get the room that the client called from
  ROOM_LIST[room].game.init();      // Make a new game for that room

  for (let player in ROOM_LIST[room].players){
    PLAYER_LIST[player].foundAnswer = false
  }

  gameUpdate(room) // Update everyone in the room
}

// Update the gamestate for every client in the room that is passed to this function
function gameUpdate(room){
  // Create data package to send to the client
  let gameState = {
    room: room,
    players:ROOM_LIST[room].players,
    game:ROOM_LIST[room].game,
    mode:ROOM_LIST[room].mode
  }
  for (let player in ROOM_LIST[room].players){
    SOCKET_LIST[player].emit('gameState', gameState)  // Pass data to the client
  }
}

function logStats(addition){
  let inLobby = Object.keys(SOCKET_LIST).length - Object.keys(PLAYER_LIST).length
  let stats = '[R:' + Object.keys(ROOM_LIST).length + " P:" + Object.keys(PLAYER_LIST).length + " L:" + inLobby + "] "
  console.log(stats + addition)
}

// Every second, update the timer in the rooms that are on timed mode
setInterval(()=>{
  // AFK Logic
  for (let player in PLAYER_LIST){
    PLAYER_LIST[player].afktimer--      // Count down every players afk timer
    // Give them a warning 5min before they get kicked
    if (PLAYER_LIST[player].afktimer < 300) SOCKET_LIST[player].emit('afkWarning')
    if (PLAYER_LIST[player].afktimer < 0) {   // Kick player if their timer runs out
      SOCKET_LIST[player].emit('afkKicked')
      logStats(player + "(" + PLAYER_LIST[player].nickname + ") AFK KICKED FROM '" + ROOM_LIST[PLAYER_LIST[player].room].room + "'(" + Object.keys(ROOM_LIST[PLAYER_LIST[player].room].players).length + ")")
      leaveRoom(SOCKET_LIST[player])
    }
  }

  // Game Timer Logic
  for (let room in ROOM_LIST){
    ROOM_LIST[room].game.timer--          // count timer down

    if (ROOM_LIST[room].game.timer < 0){  // If timer runs out
      if(ROOM_LIST[room].game.checkOver()){ // check of the game is over
        ROOM_LIST[room].game.winner = computerWinner(room)
        gameUpdate(room)
        return
      }
      changeWord(room) // Change word
      gameUpdate(room) // Update everyone in the room
    }

    // Update the timer value to every client in the room
    for (let player in ROOM_LIST[room].players){
      SOCKET_LIST[player].emit('timerUpdate', {timer:ROOM_LIST[room].game.timer})
    }
  }
}, 1000)
