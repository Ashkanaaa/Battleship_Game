from flask import Flask, render_template, redirect,url_for, request, session, jsonify, abort
import jwt
import mysql.connector
from flask_socketio import SocketIO,join_room,leave_room,send,emit
from string import ascii_uppercase
from datetime import timedelta
import random, json
import yaml
import datetime
import pytz
import secrets
from flask_mysqldb import MySQL

from __init__ import createApp, createSio
from game import  handle_ready,setUpData,handle_fire
from db.dbManager import dbManager

#creating flask app
application = createApp()
#creating SocketIO object
sio = createSio(application)
#setting the session lifetime to one minute
application.permanent_session_lifetime = timedelta(hours=1)

#contains every room ID generated by generateCode() and maps them to a dict containing the number of members in the room and request.sid of the first player
rooms = {}
#list of all the request.sid that are in singleplayer mode
singleplayers = []

# Configure db
dbConfig = yaml.load(open('db/dbConfig.yaml'), Loader=yaml.SafeLoader)
# application.config['MYSQL_HOST'] = db['mysql_host']
# application.config['MYSQL_USER'] = db['mysql_user']
# application.config['MYSQL_PASSWORD'] = db['mysql_password']
# application.config['MYSQL_DB'] = db['mysql_db']


user_data = [
    {'id': '1', 'date': '2024/04/21', 'result': 'Won', 'mode': 'Single_Player', 'extra_info': 'None'}, 
    {'id': '2', 'date': '2024/04/21', 'result': 'Lost', 'mode': 'Single_Player', 'extra_info': 'None'}
]

def create_db_manager():
    return dbManager(dbConfig['mysql_host'], dbConfig['mysql_user'], dbConfig['mysql_password'], dbConfig['mysql_db'])

#generates a random room ID based on length parameter
def generateCode(length):
    while True:
        code = "" #initialize code with empty string
        for x in range(length):
            code += random.choice(ascii_uppercase)
        if code not in rooms:
            break
    return code

def generateToken(username, db_manager):
    exp_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=30)
    print('EXP TIMEEEE:' + str(exp_time))

    #expiration_time = datetime.datetime.fromtimestamp(int(exp_time))
    payload = {
                'user_id': db_manager.get_user_id(username),
                'exp': exp_time
            }
    return jwt.encode(payload, application.config['SECRET_KEY'], algorithm='HS256')

def decode_token(token):
    # try:
    # Decode the token using the provided secret key and algorithm
    decoded_token = jwt.decode(token, application.config['SECRET_KEY'], algorithms=['HS256'])
    return decoded_token

# @application.errorhandler(401)
# def invalid_username_or_password(e):
#     return jsonify(error=str(e)), 401

@application.errorhandler(401)
def resource_not_found(e):
    return jsonify(error=str(e)), 401

@application.route("/", methods=["POST","GET"])
def home():
    return render_template('login.html')

@application.route('/login', methods=["POST", "GET"])
def login():
    if request.method == "POST":
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        db_manager = create_db_manager()

        if db_manager.validate_login(username, password):
            token = generateToken(username, db_manager)
            print('BACKEND TOKEN:' + token)
             # Return the token as part of a JSON response
            return jsonify({'token': token, 'message': 'Successful Login!'}), 200
        elif db_manager.username_exists(username):
            print('INVALID USERRRRRRRRR HEREE')
            return jsonify({'token': None, 'message': 'The password is invalid or the username already exists'}), 401
        else:
            print("CREATED A NEW USER")
            db_manager.create_new_user(username, password)
            return jsonify({'token': None, 'message': 'Your new account has been created, login with your credentials!'}), 201
    else:
        return render_template('login.html')

@application.route('/main-menu', methods=['POST', 'GET'])
def main_menu():
    return render_template('menu.html')

@application.route("/singleplayer")
def singlePlayer():
    return render_template("index.html")

@application.route("/room", methods=["POST","GET"])
def room():
    session.clear()
    if request.method == "POST":
        data = request.get_json()
        print (data)
        token = None
        try:
            token = decode_token(data.get('token'))
        except jwt.ExpiredSignatureError:
            print('looks like expired')
            print (token)
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        print('TOKENNNNNNN')
        print(token)
        room = data.get('code') if 'code' in data else None
        
        if not room: #create new room if they press create button and name is entered
            print('CREATED A NEW ROOM')
            room = generateCode(5)
            rooms[room] = {"members":0} #initially set the members in the room to 0 until the players connect using the object in index.html
        elif room not in rooms: #if they are joining the room but their session ID is not valid
            print('CODE NOT IN ROOMS')
            return jsonify({'message': 'Room ID does not exist'}), 404
        if room and rooms[room]['members']>=2: #if room already has 2 players in it it avoids connection and goes back to room.html
            print("FROM ROOM: " + str(rooms[room]['members']))
            return jsonify({'message': 'This room already has 2 players'}), 401
        #store the room and name in the session assicoiated with the client
        db_manager = create_db_manager()
        session['room'] = room
        session['user_id'] = token.get('user_id')
        session['name'] = db_manager.get_username(token.get('user_id'))
        #load the game 
        return jsonify({'redirect': url_for('game')}), 200
    else:
        return render_template("room.html")

@application.route('/stats', methods=['POST', 'GET'])
def stats():
    if request.method == 'POST':
        data = request.get_json()
        token = data.get('token')
        # decoded_token = jwt.decode(token, application.config['SECRET_KEY'], algorithms=['HS256'])
        # print('TOKENNNNNNN' + str(decoded_token['user_id']))
        try:
            # Decode the JWT token
            print('HEYYYYYYYYYYYYYY')
            decoded_token = jwt.decode(token, application.config['SECRET_KEY'], algorithms=['HS256'])
            print('TOKENNNNNNN' + str(decoded_token))
            # Return the decoded token as JSON response
            return render_template('stats.html', data = user_data)
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Expired token'}), 400
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
    # else:
    #     return render_template('stats.html', data = data)

@application.route("/game")
def game():
    room = session.get('room') #get the room ID associated with client
    if room is None or session.get("name") is None or room not in rooms: #if not valid return to room
        print('ROOM IS NOT VALID')
        return redirect(url_for("room")) 
    return render_template("index.html") 

@sio.on("connect")
def connect(auth):
    room = session.get('room')
    name = session.get('name')
    # If room and name dont exist append the request.sid to singleplayers list
    if not room or not name:
        singleplayers.append(request.sid)
        return
    # If the room does not exist leave the room
    if room not in rooms:
        leave_room(room)
        return
    else:
        join_room(room)

    # When first player joins set the ID to their request.sid
    if rooms[room]["members"] == 0:
        rooms[room]["ID"] = request.sid
    # When second player joins set up the data
    if rooms[room]["members"] == 1:
        setUpData(request.sid,rooms,room,name)

    rooms[room]["members"] += 1 #incrementing the members in a room after a player has successfully joined
    emit('gameinfo_message', "your game ID is: " + room, to=request.sid)
   

@sio.on("disconnect")
def disconnect():
    #is its multiplayer leave the room, remove the room if no player is present in it
    if request.sid not in singleplayers:
        room = session.get("room")
        name = session.get("name")
        leave_room(room)
        
        #if room is empty remove it
        if room in rooms:
            rooms[room]["members"] -= 1 #decrement the members of the room
            if rooms[room]["members"] <=0:
                del rooms[room]
    #if single player, remove the sid from the singleplayer list
    else:
        singleplayers.remove(request.sid)
#when ready button is presed, handle the matrix coming from the client
@sio.on("ready")
def ready(convertedMatrix):
    handle_ready(request.sid,convertedMatrix)   
#when a cell is clicked, handle the cell
@sio.on('fire')
def fire(hitcell):
    handle_fire(request.sid,hitcell)

if __name__ == "__main__":
    sio.run(application, debug = True)

#FINAL