
let fs = require('fs')

// Load base wordlist file
let words = JSON.parse(fs.readFileSync("./server/wordlists/jfz - colors.json"))

// create the wordpools list
let wordpools = []
fs.readdirSync("./server/wordlists/").forEach(file => {
  wordpools.push(file.split(".")[0])
});


// Nihongo
class Game{
  constructor(){
    this.wordlist = words
    this.wordpools = wordpools

    this.showKana = true
    this.showKanji = true
    this.showRomaji = true

    this.init();
  }

  init(){
    this.timer = 21
    this.shuffleWordList() // shuffle the Wordlist so the words are not always in the same order

    this.board // Initialize the board (where the words are written)
    this.over = false   // Whether or not the game is over
    this.winner = ''    // Winning player
    this.rounds = 30    // Number of words to guess, can be larger than the wordlist
    this.currentRound = 0
    this.wordIndex = 0  // Word index that we are on
    this.answer = ''    // The current correct answer

    this.nextWord()   // Show the next word to the players
  }

  shuffleWordList() {
    var currentIndex = this.wordlist.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = this.wordlist[currentIndex];
      this.wordlist[currentIndex] = this.wordlist[randomIndex];
      this.wordlist[randomIndex] = temporaryValue;
    }
  }

  nextWord(){
    var word = this.wordlist[this.wordIndex]
    var kana = (this.showKana) ? word.kana : undefined // Word in Kana
    var kanji = (this.showKanji) ? word.kanji : undefined// Word in Kanji
    var romaji = (this.showRomaji) ? word.romaji : undefined // Word in Kanji
    this.answer = word.english // Word in english, also the answer
    this.answer_length = word.english.length // length of the word in english

    if (this.wordIndex + 1 < this.wordlist.length){
      this.wordIndex += 1
    } else{
      this.wordIndex = 0
    }

    this.currentRound += 1
    this.timer = 20 // reset timer

    this.board = {kana:kana, kanji:kanji, romaji:romaji, nbLetter:this.answer_length}
  }

  checkAnswer(answer){
    if (answer === this.answer){
      return this.answer
    }
    else {return false}
  }

  checkOver(){
    if (this.currentRound === this.rounds){
      this.over = true
    }

    return this.over
  }

  changeWordpool(wordPool){
    this.wordlist = JSON.parse(fs.readFileSync("./server/wordlists/" + wordPool + ".json"))
    this.init()
  }

  changeWordpoolCustom(wordPool){
    this.wordlist = wordPool
    this.init()
  }
}

module.exports = Game;
