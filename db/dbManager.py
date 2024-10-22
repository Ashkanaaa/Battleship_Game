import mysql.connector
from functools import wraps

class dbManager:
    def __init__(self, host, user, password, database):
        self.host = host
        self.user = user
        self.password = password
        self.database = database
        self.connection = self.connect_to_database()

    def connect_to_database(self):
        try:
            connection = mysql.connector.connect(
                host= self.host,
                user= self.user,
                password= self.password,
                database= self.database
            )
            print("Connected to MySQL database successfully!")
            return connection
        except mysql.connector.Error as error:
            print("Failed to connect to MySQL database:", error)
            return None
    
    def close_connection(self):
        if self.connection:
            self.connection.close()
            print("Connection to MySQL database closed.")
    
    def ensure_and_close_connection(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            if self.connection is None or not self.connection.is_connected():
                print("Reconnecting to MySQL database...")
                self.connection = self.connect_to_database()
                if self.connection is None:
                    print("Failed to reconnect to the database.")
                    return None
            try:
                result = func(self, *args, **kwargs)
                return result
            finally:
                if self.connection is not None and self.connection.is_connected():
                    print("Closing the database connection.")
                    self.close_connection()
                    self.connection = None
        return wrapper
    
    def open_cursor(self):
        if self.connection:
            return self.connection.cursor()
        
    def close_cursor(self, cur):
        cur.close()

    @ensure_and_close_connection
    def validate_login(self, username, password):
        if self.connection:
            cur = self.open_cursor()

            query = "SELECT * FROM users WHERE username = %s AND password = %s"
            cur.execute(query, (username, password))
            user = cur.fetchone()
            self.close_cursor(cur)
        
            return bool(user)

    @ensure_and_close_connection
    def username_exists(self, username):
        if self.connection:
            query = """
            SELECT EXISTS (
                SELECT 1
                FROM Users
                WHERE username = %s
            ) AS username_exists;
        """ 
            cur = self.open_cursor()
            cur.execute(query, (username,))

            # Fetch the result
            result = cur.fetchone()

            self.close_cursor(cur)

            return bool(result[0])
        else:
            print("Failed to connect to MySQL database")

    @ensure_and_close_connection
    def create_new_user(self, username, password):
        if self.connection:
            query = "INSERT INTO Users (username, password) VALUES (%s, %s)"
            cur = self.open_cursor()
            cur.execute(query, (username, password))
            self.connection.commit()
            self.close_cursor(cur)
        else:
            print("Failed to connect to MySQL database")
            
    @ensure_and_close_connection
    def get_user_id(self, username):
        if self.connection:
            query = "SELECT user_id FROM Users WHERE username = %s;"
            cur = self.open_cursor()
            cur.execute(query, (username,))
            result = cur.fetchone()
            self.close_cursor(cur)
            return result[0]
        else:
            print("Failed to connect to MySQL database")
    
    @ensure_and_close_connection
    def get_username(self, user_id):
        if self.connection:
            query = "SELECT username FROM Users WHERE user_id = %s;"
            cur = self.open_cursor()
            cur.execute(query, (user_id,))
            result = cur.fetchone()
            self.close_cursor(cur)
            if result:
                return result[0]
            else:
                return None
        else:
            print("Failed to connect to MySQL database")

    @ensure_and_close_connection
    def update_game_result(self, player1_id, player2_id=None, result=None):
        if self.connection:
            cur = self.open_cursor()
            try:
                # Determine game type based on whether player2_id is provided
                game_type = 'Single_Player' if player2_id is None else 'Multiplayer'
                
                # Player 1 is the winner
                player1_game_result = 'WON' if player2_id else result
                player2_game_result = 'LOST' if player2_id else None  # No result if single player
                
                insert_game_query = """
                    INSERT INTO Games (player1_id, player2_id, game_type, player1_game_result, player2_game_result)
                    VALUES (%s, %s, %s, %s, %s);
                """
                cur.execute(insert_game_query, (
                    player1_id,
                    player2_id,
                    game_type,
                    player1_game_result,
                    player2_game_result
                                    ))
                
                # Update the Users table: if its single player mode, player1 could have WON or LOST but in multiplayer, player2 is always the loser
                update_player1_query = """
                    UPDATE Users 
                    SET 
                        number_of_games = number_of_games + 1,
                        number_of_wins = number_of_wins + CASE WHEN %s = 'WON' THEN 1 ELSE 0 END,
                        number_of_losses = number_of_losses + CASE WHEN %s = 'LOST' THEN 1 ELSE 0 END
                    WHERE user_id = %s;
                """
                cur.execute(update_player1_query, (player1_game_result, player1_game_result, player1_id))


                if player2_id:
                    update_player2_query = """
                        UPDATE Users 
                        SET number_of_games = number_of_games + 1, number_of_losses = number_of_losses + 1
                        WHERE user_id = %s;
                    """
                    cur.execute(update_player2_query, (player2_id,))
                
                self.connection.commit()
                print("Game result and user stats successfully updated.")
                return True
            
            except Exception as e:
                # Rollback in case of any error
                self.connection.rollback()
                print(f"Error updating game and user stats: {e}")
                return False
            
            finally:
                self.close_cursor(cur)
        else:
            print("Failed to connect to MySQL database.")
        
    @ensure_and_close_connection
    def get_game_stats(self, user_id):
        if self.connection:
            data = []
            query = "SELECT * FROM Games WHERE player1_id = %s;"
            query_2 = "SELECT * FROM Games WHERE player2_id = %s;"

            cur = self.open_cursor()

            cur.execute(query, (user_id,))
            result = cur.fetchall()

            cur.execute(query_2, (user_id,))
            result_2 = cur.fetchall()

            self.close_cursor(cur)

            # Process both results
            data += self.process_result(result, user_is_player1=True)
            data += self.process_result(result_2, user_is_player1=False)
            data.sort(key=lambda x: x['game_id'])

            if data:
                return data
            else:
                return [{'date': 'N/A', 'game_id': 'N/A', 'result': 'N/A', 'mode': 'N/A', 'opponent': 'N/A'}]
        else:
            print("Failed to connect to MySQL database")
            return None
        
    @ensure_and_close_connection
    def get_player_stat(self, user_id):
        if self.connection:
            query = "SELECT * FROM Users WHERE user_id = %s;"
            cur = self.open_cursor()
            cur.execute(query, (user_id,))
            result = cur.fetchall()  
            self.close_cursor(cur) 

            if result:
                data = []
                for row in result:
                    player_dict = {
                        'total_games': row[3],
                        'wins': row[4],
                        'losses': row[5]
                    }
                    data.append(player_dict)
                return data
            else:
                return None  
        else:
            print("Failed to connect to MySQL database")
            return None
        
    def process_result(self, rows, user_is_player1):
        data = []
        for row in rows:
            game_id, player1_id, player2_id, game_type, player1_result, player2_result, game_date = row
            
            # Depending on whether the user is player1 or player2, adjust result and opponent
            if user_is_player1:
                result = player1_result
                opponent_username = self.get_username(player2_id) if player2_id else None
            else:
                result = player2_result
                opponent_username = self.get_username(player1_id) if player1_id else None
            
            game_dict = {
                'date': game_date.strftime('%Y-%m-%d %H:%M:%S'),
                'game_id': str(game_id),
                'result': result,
                'mode': game_type,
                'opponent': opponent_username if opponent_username else 'N/A'
            }
            data.append(game_dict)
        
        return data
