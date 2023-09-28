from flask_socketio import emit
import copy, json

#dict that maps request.sid to a User object
data = {}

#Blocks of the matrix
class Block:
    def __init__(self, filled, type,hit):
        self.filled = filled
        self.type = type
        self.hit = hit
class Ship:
    def __init__(self, name, size, color):
        self.name = name
        self.size = size
        self.color = color
class User:
    def __init__(self, matrix, opponent, fleet, totalcount,ready, turn):
        self.matrix = matrix
        self.opponent = opponent #request.sid of opponent
        self.fleet = fleet #deep copy of ships list to keep track of the drown ships
        self.totalcount = totalcount #number of total ship cells (17) decremented with each hit
        self.ready = ready
        self.turn = turn #True if its this User`s turn to shoot
     
carrier = Ship('Carrier',5,'Grey')
battleship = Ship('Battleship',4, 'Yellow')
submarine = Ship('Submarine',3, 'Red')
destroyer = Ship('Destroyer',3, 'Brown')
cruiser = Ship('Cruiser',2, 'Green')
#a list of all the Ship objects later assigned to each User object as the fleet attribute
ships = [carrier,battleship,submarine,destroyer,cruiser]   

#returns the remaining cells of the ship
def decrementShip(sid,name):
    for ship in data[opponent(sid)].fleet:
        if ship.name == name:
            ship.size -=1
            return ship.size

#finding all the cells that has a specific ship
def getShipCells(sid, name):
    array = []
    for x in range (100):
        if data[opponent(sid)].matrix[x]['type'] is not None and data[opponent(sid)].matrix[x]['type']['name'] == name:
            array.append(str(x))
    return array        
        
#returns opponent`s request.sid
def opponent(sid):
    return data[sid].opponent

#switches the turns
def switchTurns(sid):
    temp = data[sid].turn
    data[sid].turn = data[opponent(sid)].turn
    data[opponent(sid)].turn = temp

#sends a string message to the client side to be displayed on the GameInfo section
def sendMsg(sid,message,broadcast):
    if broadcast:
        emit('gameinfo_message', message, broadcast=True)
    else:
        emit('gameinfo_message', message, to=sid)

#called when game if over        
def gameOver(sid):
    sendMsg(sid, 'GameOver! Congrats, You have WON!!!', False )    
    emit('victory', to=sid)
    sendMsg(opponent(sid), 'GameOver! You have LOST!!!', False )
    emit('defeat',to=opponent(sid))

#gets called to set up data once the second player has joined the game
def setUpData(sid,rooms,room,name):
    playerID = rooms[room]["ID"] #request.id of opponent (player that created the room)

    #creating User objects for both players
    player = User(None, sid, None, 17, False, True)
    enemy = User(None, playerID, None, 17 ,False, False)

    #assigning the User object to the approprate request.sid
    data[playerID] = player
    data[sid] = enemy

    #let the first player know that the second player has joined
    msg = name + ' has joined the room'
    sendMsg(playerID, msg, False)
    #enable clicking on the ready button after both players have joined, effectively submitting their matrix to the server
    emit('joined', 'Joined', to=sid)
    emit('joined', 'Joined', to=playerID)


def handle_ready(sid, convertedMatrix):
    opID = data[sid].opponent # request.id of opponent

    #assigning data to the corresponding request.sid
    matrix = json.loads(convertedMatrix)
    data[sid].matrix = matrix
    data[sid].fleet = copy.deepcopy(ships)
    data[sid].ready = True

    #if the opponent is not ready yet
    if data[opID].ready == False:
        sendMsg(sid,'waiting for opponent to get ready...', False)
    elif data[opID].ready:
        sendMsg(None,'Game Started Good Luck!!!', True)
        #enable clicking on the enemy board by setting the Startgame var in client side to True
        emit('startgame', 'Start', to=sid)
        emit('startgame', 'Start', to=opID)

#when the shot is missed
def missed(sid,hitcell):
    info1 = {
        "hitcell": str(hitcell),
        "side": 'enemy'
    }
    info2 = {
        "hitcell": str(hitcell),
        "side": 'player'
    }
    emit('missed', info1, to=sid)
    emit('missed',info2, to=opponent(sid))
    sendMsg(sid, 'You have missed!', False)
    switchTurns(sid)

#handling the damage to a ship
def damaged (sid,hitcell):
    shipsize = decrementShip(sid,data[opponent(sid)].matrix[hitcell]['type']['name']) #getting the # of remaining cells of this ship after decrementing
    data[opponent(sid)].totalcount -= 1 #decrementing the total ship cell count
    info1 = {}
    #if ship is fully drown, find all the cells containing the ship and send it as 'array' to client side to color the corresponding cells
    if shipsize == 0:
        array = getShipCells(sid, data[opponent(sid)].matrix[hitcell]['type']['name'])
        info1 = {
            "hitcell": str(hitcell),
            "side": 'enemy',
            "enemyShipColor": data[opponent(sid)].matrix[hitcell]['type']['color'],
            "array": array
        }
    else: 
        info1 = {
            "hitcell": str(hitcell),
            "side": 'enemy',
            "enemyShipColor": None,
            "array": None
        }
    
    #put fire on the enemy`s grid
    info2 = {
        "hitcell": str(hitcell),
        "side": 'player'
    }

    #send the json data to 'damage' event listener in the client side
    emit('damage', info1, to=sid)
    emit('damage',info2, to=opponent(sid))

    #if all opponent`s the ships are drwon the game is over
    if data[opponent(sid)].totalcount == 0:
        gameOver(sid)  
    elif shipsize == 0:  #if one of opponent`s ship is fully drown  
        msg = 'You have drown enemy`s ' + data[opponent(sid)].matrix[hitcell]['type']['name'] + ' ship'
        sendMsg(sid, msg, False)
        msg2 = 'Your ' + data[opponent(sid)].matrix[hitcell]['type']['name'] + ' was drown'
        sendMsg(opponent(sid), msg2, False)
    elif shipsize > 0: #if the ship is just hit without drowning
        msg = 'You have hit enemy`s ship!'
        sendMsg(sid, msg, False)
        msg2 = 'Your ' + data[opponent(sid)].matrix[hitcell]['type']['name'] + ' was hit!'
        sendMsg(opponent(sid), msg2, False)
    #switching the turns
    switchTurns(sid)

#handles the fire, calls either the damage or missed if the cell was not hit before
def handle_fire(sid,hitcell):
    #if its this player`s turn to fire`
    if data[sid].turn:
        if data[opponent(sid)].matrix[hitcell]['hit']: #if the cell was already hit
            sendMsg(sid,'This cell was already hit!', False)
        elif data[opponent(sid)].matrix[hitcell]['filled']: #if the cell is filled with a ship, damage func is called
            data[opponent(sid)].matrix[hitcell]['hit'] = True #setting the hit attribute to true when the cell is hit
            damaged(sid,hitcell) 
        else: #if the cell is empty, missed func is called
            data[opponent(sid)].matrix[hitcell]['hit'] = True #setting the hit attribute to true when the cell is hit
            missed(sid,hitcell)    
    else: #if its not this player`s turn
        sendMsg(sid,'Not your turn yet!',False)    

#FINAL

