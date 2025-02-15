DELIMITER $$

CREATE OR REPLACE FUNCTION `airline_DB_V3`.`Get_Flight_Time`(
    p_distance   DOUBLE,     -- Distance à parcourir (en km)
    p_aircraft_id INT        -- Identifiant de l'avion (Airplane_ID)
)
RETURNS TIME
READS SQL DATA
BEGIN
    DECLARE v_speed       DOUBLE;
    DECLARE v_seconds     INT;
    DECLARE v_time_result TIME;

    -- 1) Récupère la vitesse de croisière (km/h) de l'avion depuis la table Airplanes
    SELECT Cruising_Speed
      INTO v_speed
      FROM Airplanes
     WHERE Airplane_ID = p_aircraft_id
     LIMIT 1;

    -- 2) Vérifie que la vitesse est valable (pas nulle, pas négative)
    IF v_speed IS NULL OR v_speed <= 0 THEN
        -- On renvoie NULL pour signaler un problème (vitesse introuvable ou invalide)
        RETURN NULL;
    END IF;

    -- 3) Calcul du temps de vol en secondes
    --    (distance / vitesse) donne le temps en heures
    --    On multiplie par 3600 pour obtenir des secondes,
    --    puis on arrondit au plus proche (ROUND).
    SET v_seconds = ROUND(p_distance / v_speed * 3600);

    -- 4) Conversion des secondes en format TIME (hh:mm:ss)
    SET v_time_result = SEC_TO_TIME(v_seconds);

    -- 5) Retourne la valeur TIME
    RETURN v_time_result;
END $$

DELIMITER ;


-- ------------------------------------------------------------------------------------

DELIMITER $$

CREATE OR REPLACE FUNCTION `airline_DB_V3`.`Get_Flight_Distance`(
    p_departure_airport_id INT,  -- ID de l'aéroport de départ
    p_arrival_airport_id   INT   -- ID de l'aéroport d'arrivée
)
RETURNS DOUBLE
READS SQL DATA  -- Indique que la fonction effectue un SELECT
BEGIN
    DECLARE lat1 DOUBLE;
    DECLARE lon1 DOUBLE;
    DECLARE lat2 DOUBLE;
    DECLARE lon2 DOUBLE;
    DECLARE dLon DOUBLE;
    DECLARE delta DOUBLE;
    DECLARE distance DOUBLE;
    DECLARE R DOUBLE DEFAULT 6371; -- Rayon moyen de la Terre en km

    -- 1) Récupérer les coordonnées de l'aéroport de départ
    SELECT Latitude, Longitude
      INTO lat1, lon1
      FROM Airports
     WHERE Airport_ID = p_departure_airport_id
     LIMIT 1;

    -- 2) Récupérer les coordonnées de l'aéroport d'arrivée
    SELECT Latitude, Longitude
      INTO lat2, lon2
      FROM Airports
     WHERE Airport_ID = p_arrival_airport_id
     LIMIT 1;

    -- 3) Vérifier que les valeurs existent
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;  -- Retourne NULL si l'un des aéroports n'existe pas
    END IF;

    -- 4) Vérifier si c'est le même aéroport (distance = 0)
    IF p_departure_airport_id = p_arrival_airport_id THEN
        RETURN 0;
    END IF;

    -- 5) Calcul de la différence de longitude en radians
    SET dLon = RADIANS(lon2 - lon1);

    -- 6) Calcul de la variation de latitude selon la loxodromie
    SET delta = LOG( TAN(PI()/4 + RADIANS(lat2)/2) )
              - LOG( TAN(PI()/4 + RADIANS(lat1)/2) );

    -- 7) Calcul de la distance loxodromique
    SET distance = SQRT(dLon * dLon + delta * delta) * R;

    -- 8) Retourne la distance en kilomètres
    RETURN distance;
END $$

DELIMITER ;

DELIMITER $$

CREATE PROCEDURE `airline_DB_V3`.`test_reservations_procedure`(
    IN p_flight_id INT -- Paramètre d'entrée : Flight_ID du vol pour lequel on réserve des billets
)
BEGIN
    DECLARE p_passenger_id INT;
    DECLARE p_seat_number VARCHAR(5);
    DECLARE total_rows INT;
    DECLARE total_columns INT;
    DECLARE seat_row_num INT;
    DECLARE seat_col_letter CHAR(1);
    DECLARE is_seat_taken INT;
    DECLARE is_passenger_already_booked INT;
    DECLARE seat_letters VARCHAR(10);
    DECLARE flight_date DATE;
    DECLARE booking_date DATE;
    DECLARE capacity INT;
    DECLARE booked_seats INT;

    -- Vérifier si le vol existe et récupérer la date du vol
    SELECT Departure_Time, Airplane_ID INTO flight_date, capacity
    FROM Flights 
    WHERE Flight_ID = p_flight_id 
    LIMIT 1;

    IF flight_date IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Erreur : Le vol spécifié n''existe pas.';
    END IF;

    -- Récupérer la configuration des sièges de l'avion associé au vol
    SELECT Num_Rows, Seats_Per_Row 
    INTO total_rows, total_columns
    FROM Airplanes 
    WHERE Airplane_ID = (SELECT Airplane_ID FROM Flights WHERE Flight_ID = p_flight_id)
    LIMIT 1;

    -- Vérifier combien de sièges sont déjà réservés
    SELECT COUNT(*) INTO booked_seats 
    FROM Bookings 
    WHERE Flight_ID = p_flight_id;

    -- Vérifier s'il reste des places disponibles
    IF booked_seats >= capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Erreur : Aucune place disponible pour ce vol.';
    END IF;

    -- Déterminer la configuration des sièges en fonction de l'avion
    IF total_columns = 4 THEN
        SET seat_letters = 'ABCD';      -- Configuration 2-2 (Embraer E190)
    ELSEIF total_columns = 6 THEN
        SET seat_letters = 'ABCDEF';    -- Configuration 3-3 (B737, A320)
    ELSEIF total_columns = 8 THEN
        SET seat_letters = 'ABCDEFGH';  -- Configuration 2-4-2 (A330, B767)
    ELSEIF total_columns = 10 THEN
        SET seat_letters = 'ABCDEFGHIJ'; -- Configuration 3-4-3 (B777, A380)
    ELSE
        SET seat_letters = 'ABCDEF'; -- Par défaut, 3-3
    END IF;

    -- Répéter la boucle jusqu'à ce que le vol soit complet
    WHILE booked_seats < capacity DO

        -- Sélection aléatoire d'un passager existant
        pass_loop: LOOP
            SELECT Passenger_ID INTO p_passenger_id 
            FROM Passengers 
            ORDER BY RAND() 
            LIMIT 1;

            -- Vérifier si le passager a déjà une réservation pour ce vol
            SELECT COUNT(*) INTO is_passenger_already_booked 
            FROM Bookings 
            WHERE Flight_ID = p_flight_id AND Passenger_ID = p_passenger_id;

            -- Si ce passager n'a pas encore de billet pour ce vol, on continue
            IF is_passenger_already_booked = 0 THEN
                LEAVE pass_loop;
            END IF;
        END LOOP pass_loop;

        -- Générer un numéro de siège unique pour ce vol
        seat_loop: LOOP
            -- Générer un numéro de rangée (entre 1 et total_rows)
            SET seat_row_num = FLOOR(1 + RAND() * total_rows);

            -- Sélectionner une lettre parmi la configuration correcte
            SET seat_col_letter = SUBSTRING(seat_letters, FLOOR(1 + RAND() * LENGTH(seat_letters)), 1);

            -- Construire le numéro de siège (ex : "12C", "5A", "23F")
            SET p_seat_number = CONCAT(seat_row_num, seat_col_letter);

            -- Vérifier si ce siège est déjà pris pour ce vol
            SELECT COUNT(*) INTO is_seat_taken 
            FROM Bookings 
            WHERE Flight_ID = p_flight_id AND Seat_Number = p_seat_number;

            -- Si le siège est libre, on sort de la boucle
            IF is_seat_taken = 0 THEN
                LEAVE seat_loop;
            END IF;
        END LOOP seat_loop;

        -- Générer une date de réservation basée sur une répartition Gaussienne
        SET booking_date = DATE_SUB(flight_date, INTERVAL ROUND(GREATEST(1, LEAST(180, 90 + (RAND() - 0.5) * 60))) DAY);

        -- Insérer la réservation dans la table Bookings
        INSERT INTO Bookings (Flight_ID, Passenger_ID, Seat_Number, Booking_Date)
        VALUES (p_flight_id, p_passenger_id, p_seat_number, booking_date);

        -- Incrémenter le compteur des sièges réservés
        SET booked_seats = booked_seats + 1;

    END WHILE;

    -- Afficher les sièges réservés pour vérification
    SELECT Flight_ID, Passenger_ID, Seat_Number, Booking_Date
    FROM Bookings 
    WHERE Flight_ID = p_flight_id;

END $$

DELIMITER ;
