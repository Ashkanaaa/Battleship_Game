var Vertical // changing orientation of the ship
var Dragging // ship html element that is being dragged
var Dropped //whether the ship was dropped successfully on the board
var Randomized = false //whether the randomized button was used
var Ready = false //set to true when all the ships have been placed
var Joined = false //if other player has joined you can push the ready button if not, you have to wait  for the player to join
var Startgame = false //set to true when both sides have  hit their ready botton
var Finishgame = false //set to true when the game if finished
var Mute = false 
removedShips = [] // list of ship names that are dropped successfully on the grid

//Single player:
var Singleplayer //true if its singleplayer mode
var Turn //true if its player`s turn in single player mode
var contHits //number of continous hits of compouter
var contDirection //continous direction that should be hit
var lastHit //last cell that was damaged
var hitShips = [] //name of ships that were damaged
var incompleteShips //number of ships that were damaged but not drown
var differentShip //true if the current hit is a different ship than the last hit
var userShipsCount //number of user`s ship initially (5), when 0, computer wins the game
var computerShipsCount //number of computer`s ships initially(5), when 0, user wins the game
computer_hits = [] //cells that were hit by computer (integers in range of [0,99])
const next_hit = [] //stack containing cells that are goinig to be hit by computer

//key value pair of directions and their offset
const Directions = {
    'North':-10,
    'East' : 1,
    'South':10,
    'West':-1
}

//keeping track of how many cells of each ship is sunk for user
var userShipCount = {
    'Carrier': 0,
    'Battleship': 0,
    'Submarine': 0,
    'Destroyer':0,
    'Cruiser':0
}
//how many cells of each ship is sunk for computer
var computerShipCount = {
    'Carrier': 0,
    'Battleship': 0,
    'Submarine': 0,
    'Destroyer':0,
    'Cruiser':0
}

//////////////////////////////////////// Matrices initialazation

matrix = [] //user`s matix containing Block objects (used in single player and multiplayer)
computer_matrix = [] //computer`s matrix (used only in single player)

//Class for representing each cell of the grid
class Block{
    constructor(filled,type,hit){
        this.filled = filled //if the cell containes a ship
        this.type = type //ship object associated with this cell (if Block.fill == true)
        this.hit = hit //whether the cell was hit before
    }
}

//initializing player`s and computer`s matrix with Block objects
for (let i = 0; i < 100; i++) {
    const block = new Block(false, null, false) // Provide initial values for filled, type, and hit
    const computer_block = new Block(false, null, false) //making seperate block objects to prevent both matrices to store refrence to the same Block object 
    matrix.push(block)
    computer_matrix.push(computer_block)
  }

//////////////////////////////////////// Ships
  
//Class for ships used in the game
class Ship{
    constructor(name,size,color){
        this.name = name
        this.size = size //how many cells it takes
        this.color = color
    }
}

//initialazing ship objects
const carrier = new Ship('Carrier',5,'Grey')
const battleship = new Ship('Battleship',4, 'Yellow')
const submarine = new Ship('Submarine',3, 'Red')
const destroyer = new Ship('Destroyer',3, 'Brown')
const cruiser = new Ship('Cruiser',2, 'Green')

//list of all the ships
const ships = [carrier,battleship,submarine,destroyer,cruiser]


//////////////////////////////////////// Game Functions

//initial setup
function gameInit(){
    generateGrid("Enemy")
    generateGrid("Player")
    addEventListener()
    setPlayerMode()
    Vertical = false;
}

//declaring whether its single or multiplayer and taking actions accordingly
function setPlayerMode(){
    var queryParams = new URLSearchParams(window.location.search);

    // Get the value of the 'singlePlayer' parameter
    var singlePlayerValue = queryParams.get("single")
    //if its singleplayer:
    if (singlePlayerValue === "1") {
        Singleplayer = true
        randomizeFleet(true)
        Turn = true //setting the turn to player 
        contHits = 0 //setting the continous hits of computer to 0 initially
        userShipsCount = 0
        lastHit = -1
        incompleteShips = 0
        computerShipsCount = 5
        userShipsCount = 5
    } else {
        Singleplayer = false
    }
}

//generating both of the grids
function generateGrid(side){
    id = side+"Grid";
    const board = document.getElementById(id)
    for(x=0; x< 100; x++){
        const cell = document.createElement("div")
        cell.classList.add('cell')
        cell.id = x + side;
        board.appendChild(cell);

        if(side == "Player"){
            cell.addEventListener('dragover', dragOver);
            cell.addEventListener('drop', drop);
        }else{
            cell.addEventListener('click', fire)
        }
    }
}

//adding eventlisteners
function addEventListener(){
    const fleetpos = document.getElementById("position-B")
    fleetpos.addEventListener('click', changeFleetPosition);

    const randFleet = document.getElementById("randomize-b");
    randFleet.addEventListener('click', ()=>randomizeFleet(false))

    const readyB = document.getElementById("ready-b")
    readyB.addEventListener('click', readyToPlay)

    const muteB = document.getElementById("mute-b")
    muteB.addEventListener('click', mute)

    //event listener for ships
    const ship1 = document.getElementsByClassName("Carrier")[0]
    ship1.addEventListener('dragstart', dragStart)

    const ship2 = document.getElementsByClassName("Battleship")[0]
    ship2.addEventListener('dragstart', dragStart)

    const ship3 = document.getElementsByClassName("Submarine")[0]
    ship3.addEventListener('dragstart', dragStart)

    const ship4 = document.getElementsByClassName("Destroyer")[0]
    ship4.addEventListener('dragstart', dragStart)
    
    const ship5 = document.getElementsByClassName("Cruiser")[0]
    ship5.addEventListener('dragstart', dragStart)
}

//randomizing the fleet for computer is true and randomizing the fleet for the player when computer is flase (which happens through eventlistener for Randomize button) 
function randomizeFleet(computer){
    if(computer){
        //placing hidden ships on the enemy`s grid
        ships.forEach(ship => addShip(true,ship, null,true))
    }else if(!Randomized){
        //placing the ships on the player grid
        ships.forEach(ship => addShip(true,ship, null, false))
        //removing ships that are placed from the middle section
        ships.forEach((ship) => {
                element = document.getElementsByClassName(ship.name)[0]
                element.remove()
        })
        Randomized = true //when randomized once the botton cant be hit again and the ship placments will remain the same
        Ready = true //when randomized ready is set to true since all the ships are placed
    }
}

//when ship dragging is started
function dragStart(e){
    Dragging = e.target
    Dropped = true
}

function dragOver(e){
    e.preventDefault();
}
//when ship is dropped on the grid
function drop(e){
    const startCell = parseInt(e.target.id) //getting the cell id that the ship is being dropped
    //figuring out which ship is being dropped at that cell
    var ship 
    let found = false
    for(x =0;x<ships.length;x++){
        if(Dragging.classList.contains(ships[x].name)){
            ship = ships[x]
            found = true
            break
        }
    }

    //prevent the ship that was already drropped change position again
    if(removedShips.includes(ship.name)){
        found = false
    }

    //checks
    if(!found){
        console.log("ERROR: ship was not found")
    }else{
        addShip(false,ship, startCell, false)
        //if dropped successfully then remove the ship
        if(Dropped){
            removedShips.push(ship.name) //add the name of the ship to the removed ship so that "changeFleetPosition doesnt include it when switching from vertical to horizontal
            Dragging.remove() //removing the ship`s html element
            Randomized = true //set Randomized to true to disable the randomized button after the first ship had been dropped
            if(removedShips.length == 5){
                Ready = true //set ready to true if all the ships have been placed
            }
        }
    }
}

//chenging the fleet position from vertical to horizontal
function changeFleetPosition(e){
    var button = document.getElementById("position-B")
    const container = document.getElementsByClassName('Ships')[0]
    shipArray = [] //all the ships that have not been successfully dropped
    
    //getting all the ships that have not been removed (dropped) yet
    for(let x = 0;x<ships.length;x++){
        let ship =  document.getElementsByClassName(ships[x].name)[0]
        if(!removedShips.includes(ships[x].name)){
            shipArray.push(ship)
        }
    }
    
    //changing the position button inner text and the container`s css properties
    if(Vertical){
        Vertical = false;
        button.innerText = "Vertical"
        container.style.removeProperty('display')
    }else{
        Vertical = true;
        button.innerText="Horizontal"
        container.style.display = 'flex'
    }

    //changing the position of all the remaining ships one by one
    shipArray.forEach((ship) => {
        changeShipPos(ship);
    })
}

//changing position of the target ship
function changeShipPos(target){
    const computedStyles = window.getComputedStyle(target);
    const heightValue = computedStyles.getPropertyValue("height");
    const widthValue = computedStyles.getPropertyValue("width");
    target.style.height = widthValue;
    target.style.width = heightValue;
}
 
function addShip(rand,ship,startCell, computer){
    //selecting all the cells depending on if its singleplayer or multiplayer
    let cells
    if(computer){
        cells = document.querySelectorAll('#EnemyGrid div')
    }else{
        cells = document.querySelectorAll('#PlayerGrid div')
    }

    //setting the starting index considering whether its randomized or not
    if (rand) {
        let randIndex = Math.floor(Math.random() * 100) //randdom number [0,100)
        let randPos = Math.random() < 0.5 //randomize the position of the ship
        Vertical = randPos
        startIndex = randIndex
    } else{
        startIndex = startCell
    }

    //making sure ships are not placed outside the grid
    if(Vertical){
        if((109 - (10 * ship.size)) < startIndex){
            startIndex = startIndex - ship.size * 10 + 10
        }
    }else{ 
        if((100-ship.size) < startIndex){
            startIndex =  100 - ship.size 
        }
    }

    //list of div elements in the Grid that ship is placed on them
    shipCells = []
    //pushing the corresponding dives based on startIndex into the shioCells
    for(let x = 0;x<ship.size;x++){
        if(Vertical){
            shipCells.push(cells[Number(startIndex) + x * 10])
        }else{
            shipCells.push(cells[Number(startIndex)+x])
        }
    }
 
    //preventing ships to extend horizontally
    var valid = true
    
    if(!Vertical){
        let index = parseInt(startIndex/10) * 10
        if((index + (10 - ship.size)) < startIndex){
            valid = false
        }
    }

    // Check if all ship cells are not filled with the 'filled' class, if false, at least one of them has the filled class and so its not a valid placment
    const notFilled = shipCells.every(shipCell => !shipCell.classList.contains('filled'))

    //if the placment is valid color and add to matrix
    if(valid && notFilled){
        shipCells.forEach(shipCell=>{
            if(!computer){
                shipCell.classList.add(ship.color)
            }
            shipCell.classList.add('filled')
          })
          addToMatrix(shipCells, ship, computer)
    }else{
        if(rand){
            addShip(true,ship, null, computer)
        }else{
            Dropped = false //set dropped to false so that the ship is back to the container
        }
    }
}

//add the corresponding ship to the corresponding matrix
function addToMatrix(shipCells, ship, computer){
    for(x = 0;x<shipCells.length;x++){
        if(computer){
            computer_matrix[parseInt(shipCells[x].id)].filled = true
            computer_matrix[parseInt(shipCells[x].id)].type = ship
        }else{
            matrix[parseInt(shipCells[x].id)].filled = true
            matrix[parseInt(shipCells[x].id)].type = ship
        }
    }   
}

//handles when Ready button is pushed
function readyToPlay(){
    if(Finishgame)return
    if(!Joined && !Singleplayer)return

    //if ships were placed and other player has joined
    if(Ready && Singleplayer){
        element = document.getElementById('ready-b')
        element.style.backgroundColor = 'green'
        Startgame = true //starting the game
        printMessage("Game Started! Take the first Shot!")
    }else if(Ready  && Joined){
        element = document.getElementById('ready-b')
        element.style.backgroundColor = 'green'
        let convertedMatrix = JSON.stringify(matrix) //convert the matrix to json
        socket.emit("ready",convertedMatrix) //send the matrix to the server
        Startgame = true //starting the game
    }
}

function gameOver(){
    //user has won
    if(Turn){
        printMessage('GameOver! Congrats, You have WON!!!')
        playSound('../static/effects/victory.mp3')
    }else{ //computer has won
        printMessage('GameOver! You have LOST!!!')
        playSound('../static/effects/defeat.mp3')
    }
    element = document.getElementById('ready-b')
    element.style.backgroundColor = 'red'
    Startgame = false
    Finishgame = true
}

//handle clicks on the enemy`s grid
function fire(e){
    hitcell = parseInt((e.targetElement || e.srcElement).id)
    if(Startgame){
        if(Singleplayer && Turn){
            hit(hitcell,false)
        }else if(!Singleplayer){
            socket.emit('fire',hitcell) //if multiplayer, send data to the server
        }
    }
}

//handles the functionality of the mute button
function mute(){
    var element = document.getElementById("mute-b")
    if(Mute){
        element.style.backgroundImage = "url(../static/effects/mute.jpg)"
        element.style.backgroundSize = "cover"
        element.style.backgroundRepeat = "no-repeat"
    }else{
        element.style.backgroundImage = "url(../static/effects/unmute.png)"
        element.style.backgroundSize = "cover"
        element.style.backgroundRepeat = "no-repeat"
    }
    Mute = !Mute
}

//prints message in the Game Information sevtion
function printMessage(msg){
    var messageDiv = document.getElementById('dynamic_info')
    //console.log("this is message: " + message);
    messageDiv.innerHTML = '<h3>' + msg + '</h3>';
}

//plays a sound 
function playSound(path){
    if(!Mute && !Finishgame){
        audio = new Audio(path)
        audio.play()
    }
}

///////////////////////////////////////////Singleplayer

//switches the turns between computer and player
function switchTurns() {
    if(Mute){ 
        setTimeout(function() {
            Turn = !Turn;
            // if turn is false, computer fires
            if (!Turn) {
                computerFire();
            }
        }, 500); // Delay of 500 milliseconds
    }else{ //if unmute, delay longer in switching the turns to let the sound be played
        if(Turn){//if its playe`s turn, switch the turns immidietly to avoid the player hitting twice
            Turn = !Turn
            setTimeout(function() {
                if (!Turn) {
                    computerFire();
                }
            }, 4000); // Delay of 4000 milliseconds (3 seconds)
        }else{//if its computer`s turn, delay in switcing to avoid the player hit before computer sound is finished
            setTimeout(function() {
                Turn = !Turn
                if (!Turn) {
                    computerFire();
                }
            }, 4000); // Delay of 4000 milliseconds (3 seconds)
        }
    }
}

//return all the cells that contain a specific ship
function findShip(shipname){
    array = []
    for (let x = 0; x < computer_matrix.length; x++) {
        if(computer_matrix[x].filled && computer_matrix[x].type.name == shipname){
           array.push(x)
        }
    }
    return array
}

//damge in singleplayer mode
function singleDamage(hitcell,computer){
    //if computer has hit
    if(computer){
        //putting fire gif on the cell
        elementId = hitcell + 'Player'
        element = document.getElementById(elementId)
        element.style.backgroundImage = "url(../static/effects/fire.gif)"
        element.style.backgroundSize = "cover"
        element.style.backgroundRepeat = "no-repeat"

        //incrementing the ship that was hit
        userShipCount[matrix[hitcell].type.name]++

        //if user`s ship was drown
        if(userShipCount[matrix[hitcell].type.name] == matrix[hitcell].type.size){
            printMessage('Your ' + matrix[hitcell].type.name + ' was drown')
            //if no ships left for user computer wins
            userShipsCount--
            incompleteShips--
            if(userShipsCount == 0){
                gameOver()
            }
            //if no oncomplete ships left, stack is cleared
            if(incompleteShips == 0){
                next_hit.splice(0);
            }
            
        }else{
            printMessage('Your ' + matrix[hitcell].type.name + ' was hit!')
        }
        //playing the sound
        playSound('../static/effects/hit-player.mp3')
    }else{
        //putting fire gif on the cell 
        elementId = hitcell + 'Enemy'
        element = document.getElementById(elementId)
        element.style.backgroundImage = "url(../static/effects/fire.gif)"
        element.style.backgroundSize = "cover"
        element.style.backgroundRepeat = "no-repeat"
        
        //incrementing the ship that was hit
        computerShipCount[computer_matrix[hitcell].type.name]++

        //if the ship is fully drown, color the corresponding cell on the enemy board
        if(computerShipCount[computer_matrix[hitcell].type.name] == computer_matrix[hitcell].type.size){
            array = findShip(computer_matrix[hitcell].type.name)
            array.forEach((cell)=>{
                elementId = cell + 'Enemy'
                element = document.getElementById(elementId)
                element.classList.add(computer_matrix[cell].type.color)
            })
            computerShipsCount--
            //if  no ships left for computer game is finished
            if(computerShipsCount == 0){
                gameOver()
            }else{
                printMessage('You have drown enemy`s '  + computer_matrix[hitcell].type.name + ' ship')
            }
        
        }else{
            printMessage('You have hit enemy`s ship!')
        }
        //playing the sound
        playSound('../static/effects/hit-enemy.mp3')
    }
}

//miss in singleplayer mode
function singleMissed(hitcell,computer){
    if(computer){
        elementId = hitcell + 'Player'
        element = document.getElementById(elementId)
        element.style.backgroundColor = "#68AEB8";
        element.style.borderColor = "#68AEB8"
    }else{
        elementId = hitcell + 'Enemy'
        element = document.getElementById(elementId)
        element.style.backgroundColor = "#68AEB8";
        element.style.borderColor = "#68AEB8"
        printMessage('You have missed!')
    }
    playSound('../static/effects/missed.mp3')
}

//fire in singleplayer mode
function hit(hitcell,computer){
    if(computer){
        if(matrix[hitcell].filled){
            if(isNeighbour(hitcell)){
                contHits = 2 //if the hit cell is neighbour of the lastHit, set contHits to 2 to trigger the sameDirectionHit()
            }else{
                contHits = 1 //if its not neighbour of lastHit, set contHit to 1 to trigger setDirections
            }
            if(hitShips.includes(matrix[hitcell].type.name)){
                differentShip = false
            }else{
                differentShip = true
                incompleteShips++
            }
            singleDamage(hitcell,true)
            hitShips.push(matrix[hitcell].type.name)
            lastHit = hitcell //set the last hit to the corresponding cell
        }else{
            singleMissed(hitcell,true)
            contHits = 0 //set contHits to 0 so ot does not trigger anything
        }
        matrix[hitcell].hit = true //setting the hit true for the cell after a successful hit
        switchTurns() //switching the turn to user
    }else{
        //checking to see if its user`s turn
        if(Turn){
            if(computer_matrix[hitcell].hit){
                printMessage("You have already hit this cell")
            }else{
                if(computer_matrix[hitcell].filled){
                    singleDamage(hitcell,false)
                }else{
                    singleMissed(hitcell,false)   
                }
                computer_matrix[hitcell].hit = true //setting the hit true for the cell after a successful hit 
                switchTurns()//switching the turn to computer
            }
        }else{
            printMessage("Not your turn yet!")
        }
    }   
}

//called when its computer`s turn
function computerFire(){
    let hitcell
    if(contHits == 1 || differentShip){
        setDirections()
    }
    if(contHits > 1){
        sameDirectionHit()
    }
    //if stack has elements hit them first
    if(next_hit.length != 0){
        let poppedItem  = next_hit.pop()
        contDirection = poppedItem.dir //setting the direction of the next cell that is going to be hit
        hitcell = poppedItem.number//setting hitcell to the next cell that is going to be hit
    }else{
        let randomNumber = Math.floor(Math.random() * 100); // Generates a random integer between 0 and 99
        //while the number has been hit before, the random number gets generated again
        while(computer_hits.includes(randomNumber)){
            randomNumber = Math.floor(Math.random() * 100)
        }
        computer_hits.push(randomNumber) //pushing the number in computer_hits so that its not hit again
        hitcell = randomNumber//setting hitcell to a random number that has not been hit
    }
    hit(hitcell,true) //call the hit function with the corresponding cell
}

//push all the cells around the lastHit into the stack
function setDirections() {
    for (const direction in Directions) {
        const offset = Directions[direction];
        const num = lastHit + offset;
        if (num >= 0 && num < 100 && !computer_hits.includes(num)) {
            next_hit.push({ number: num, dir: direction})
            computer_hits.push(num)
        }
    }
}

//push cells in a contineous direction into the stack
function sameDirectionHit(){
    num = lastHit + Directions[contDirection]
    if (num >= 0 && num < 100 && !computer_hits.includes(num)) {
        next_hit.push({ number: num, dir: contDirection})
        computer_hits.push(num)
    }
}

//returns whether a cell is in West,North,East, or South of the hitcell
function isNeighbour(hitcell){
    if(lastHit == -1)return false
    const absoluteDiff = Math.abs(hitcell - lastHit)
    return absoluteDiff === 1 || absoluteDiff === 10
}

//////////////////////////////////////// Multiplayer
//when a cell is damaged
socket.on('damage',data=>{
    //modify the player`s board
    if(data.side == 'player'){
        //adding fire gif to the cell that was hit
        elementId = data.hitcell + 'Player'
        element = document.getElementById(elementId)
        element.style.backgroundImage = "url(../static/effects/fire.gif)"
        element.style.backgroundSize = "cover"
        element.style.backgroundRepeat = "no-repeat"

        //playing sound when your ship is hit
        playSound('../static/effects/hit-player.mp3')
        
    }else if(data.side == 'enemy'){
        //if the ship is fully drown, color the corresponding cell on the enemy board
        if(data.array !==null && data.enemyShipColor !== null){
            data.array.forEach((cell)=>{
                elementId = cell + 'Enemy'
                element = document.getElementById(elementId)
                element.classList.add(data.enemyShipColor)
            })
        }
        //adding fire gif to the cell that was hit
        elementId = data.hitcell + 'Enemy'
        element = document.getElementById(elementId)
        element.style.backgroundImage = "url(../static/effects/fire.gif)"
        element.style.backgroundSize = "cover"
        element.style.backgroundRepeat = "no-repeat"

        //playing sound when you him enemy`s ship
        playSound('../static/effects/hit-enemy.mp3')
    }
})

//when a shot is missed
socket.on('missed',data=>{
    //modify playe`s board
    if(data.side == 'player'){
        elementId = data.hitcell + 'Player'
        element = document.getElementById(elementId)
        element.style.backgroundColor = "#68AEB8";
        element.style.borderColor = "#68AEB8"
    }else if(data.side == 'enemy'){
        elementId = data.hitcell + 'Enemy'
        element = document.getElementById(elementId)
        element.style.backgroundColor = "#68AEB8";
        element.style.borderColor = "#68AEB8"
    }
    playSound('../static/effects/missed.mp3')
})


//print message on the Game Information section
socket.on('gameinfo_message', message => {
    if (message) {
            printMessage(message)
    }
})

//if the second player has joined the game
socket.on('joined',data=>{
    Joined = true
})

//if both sides are ready start the game
socket.on('startgame', data=>{
    Startgame = true
})

//victory for this player
socket.on('victory', () => {
    playSound('../static/effects/victory.mp3')
    element = document.getElementById('ready-b')
    element.style.backgroundColor = 'red'
    Startgame = false
    Finishgame = true
})

//defeat for this player
socket.on('defeat', () => {
    playSound('../static/effects/defeat.mp3')
    element = document.getElementById('ready-b')
    element.style.backgroundColor = 'red'
    Startgame = false
    Finishgame = true
})

//upon connection
socket.on('connect', message => {
    if (message) {
        printMessage(message)
    }
})

//assigns the function gameInit to the onload event of the window object
window.onload = gameInit;

//FINAL