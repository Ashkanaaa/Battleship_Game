CREATE DATABASE battleship;
use battleship;
show tables;

SELECT * FROM Users;
SELECT * FROM Games;


DROP TABLE Users;


CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
	secret_key VARCHAR(255) NOT NULL,
    number_of_games INT DEFAULT 0,
    number_of_wins INT DEFAULT 0,
    number_of_losses INT DEFAULT 0
);
ALTER TABLE Users
MODIFY COLUMN secret_key VARCHAR(255) NULL;
CREATE TABLE Games (
    game_id INT AUTO_INCREMENT PRIMARY KEY,
    player1_id INT,
    FOREIGN KEY (player1_id) REFERENCES Users(user_id),
    player2_id INT,
    FOREIGN KEY (player2_id) REFERENCES Users(user_id),
    game_type ENUM('Single_Player', 'Multiplayer') NOT NULL,
    player1_game_result ENUM('WON', 'LOST'), 
    player2_game_result ENUM('WON', 'LOST'),
    game_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT multiplayer_game_has_opponent CHECK (game_type = 'Single_Player' OR player2_id IS NOT NULL)
);