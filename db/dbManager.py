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

    def execute_query(self, query, params=None):
        cursor = self.connection.cursor()
        cursor.execute(query, params)
        result = cursor.fetchall()
        cursor.close()
        return result
    
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
