-- 1) Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS Airports;

-- 2) Création de la table Airports
CREATE TABLE Airports (
    Airport_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name       VARCHAR(100) NOT NULL,
    City       VARCHAR(100) NOT NULL,
    Country    VARCHAR(100) NOT NULL,
    IATA_Code  VARCHAR(10)  NOT NULL,
    Latitude   DECIMAL(8,4) NOT NULL,
    Longitude  DECIMAL(8,4) NOT NULL
);

-- 3) Insérer les aéroports des capitales européennes
INSERT INTO Airports (Name, City, Country, IATA_Code, Latitude, Longitude)
VALUES
    -- Autriche : Vienne
    ('Vienna Intl.', 'Vienna', 'Austria', 'VIE', 48.1103, 16.5697),
    -- Belgique : Bruxelles
    ('Brussels Airport', 'Brussels', 'Belgium', 'BRU', 50.9014, 4.4844),
    -- Bulgarie : Sofia
    ('Sofia Airport', 'Sofia', 'Bulgaria', 'SOF', 42.6952, 23.4063),
    -- Croatie : Zagreb
    ('Franjo Tuđman Airport', 'Zagreb', 'Croatia', 'ZAG', 45.7429, 16.0688),
    -- Chypre : (Nicosie → Aéroport de Larnaca)
    ('Larnaca International', 'Nicosia (via Larnaca)', 'Cyprus', 'LCA', 34.8754, 33.6249),
    -- Rép. tchèque : Prague
    ('Václav Havel Airport', 'Prague', 'Czech Republic', 'PRG', 50.1008, 14.2600),
    -- Danemark : Copenhague
    ('Copenhagen Airport', 'Copenhagen', 'Denmark', 'CPH', 55.6179, 12.6560),
    -- Estonie : Tallinn
    ('Tallinn Airport', 'Tallinn', 'Estonia', 'TLL', 59.4133, 24.8328),
    -- Finlande : Helsinki
    ('Helsinki-Vantaa', 'Helsinki', 'Finland', 'HEL', 60.3172, 24.9633),
    -- France : Paris
    ('Charles de Gaulle', 'Paris', 'France', 'CDG', 49.0097, 2.5479),
    -- Allemagne : Berlin
    ('Berlin Brandenburg', 'Berlin', 'Germany', 'BER', 52.3649, 13.5033),
    -- Grèce : Athènes
    ('Athens Intl. Eleftherios Venizelos', 'Athens', 'Greece', 'ATH', 37.9364, 23.9475),
    -- Hongrie : Budapest
    ('Budapest Ferenc Liszt Intl.', 'Budapest', 'Hungary', 'BUD', 47.4304, 19.2611),
    -- Irlande : Dublin
    ('Dublin Airport', 'Dublin', 'Ireland', 'DUB', 53.4214, -6.2700),
    -- Italie : Rome
    ('Leonardo da Vinci–Fiumicino', 'Rome', 'Italy', 'FCO', 41.8003, 12.2389),
    -- Lettonie : Riga
    ('Riga Intl.', 'Riga', 'Latvia', 'RIX', 56.9236, 23.9717),
    -- Lituanie : Vilnius
    ('Vilnius Airport', 'Vilnius', 'Lithuania', 'VNO', 54.6369, 25.2850),
    -- Luxembourg : Luxembourg
    ('Luxembourg Airport', 'Luxembourg', 'Luxembourg', 'LUX', 49.6266, 6.1988),
    -- Malte : La Valette
    ('Malta Intl.', 'Valletta', 'Malta', 'MLA', 35.8575, 14.4775),
    -- Pays-Bas : Amsterdam
    ('Amsterdam Schiphol', 'Amsterdam', 'Netherlands', 'AMS', 52.3105, 4.7683),
    -- Pologne : Varsovie
    ('Warsaw Chopin', 'Warsaw', 'Poland', 'WAW', 52.1657, 20.9671),
    -- Portugal : Lisbonne
    ('Humberto Delgado Airport', 'Lisbon', 'Portugal', 'LIS', 38.7742, -9.1342),
    -- Roumanie : Bucarest
    ('Henri Coandă Intl.', 'Bucharest', 'Romania', 'OTP', 44.5712, 26.0851),
    -- Slovaquie : Bratislava
    ('M. R. Štefánik Airport', 'Bratislava', 'Slovakia', 'BTS', 48.1702, 17.2137),
    -- Slovénie : Ljubljana
    ('Ljubljana Jože Pučnik', 'Ljubljana', 'Slovenia', 'LJU', 46.2237, 14.4576),
    -- Espagne : Madrid
    ('Adolfo Suárez Madrid-Barajas', 'Madrid', 'Spain', 'MAD', 40.4936, -3.5676),
    -- Suède : Stockholm
    ('Stockholm Arlanda', 'Stockholm', 'Sweden', 'ARN', 59.6519, 17.9186),
    -- Royaume-Uni : Londres
    ('Heathrow Airport', 'London', 'UK', 'LHR', 51.4700, -0.4543),
    -- Islande : Reykjavik
    ('Keflavík Intl.', 'Reykjavik', 'Iceland', 'KEF', 63.9850, -22.6056),
    -- Suisse : Berne
    ('Bern Airport', 'Bern', 'Switzerland', 'BRN', 46.9132, 7.4996),
    -- Norvège : Oslo
    ('Oslo Gardermoen', 'Oslo', 'Norway', 'OSL', 60.1976, 11.1004),
    -- Serbie : Belgrade
    ('Belgrade Nikola Tesla', 'Belgrade', 'Serbia', 'BEG', 44.8184, 20.3091),
    -- Russie : Moscou
    ('Sheremetyevo Intl.', 'Moscow', 'Russia', 'SVO', 55.9726, 37.4146),
    -- Ukraine : Kiev
    ('Boryspil Intl.', 'Kiev', 'Ukraine', 'KBP', 50.3450, 30.8947),
    -- Biélorussie : Minsk
    ('Minsk National Airport', 'Minsk', 'Belarus', 'MSQ', 53.8825, 28.0325),
    -- Bosnie-Herzégovine : Sarajevo
    ('Sarajevo Intl.', 'Sarajevo', 'Bosnia & Herz.', 'SJJ', 43.8246, 18.3314),
    -- Monténégro : Podgorica
    ('Podgorica Airport', 'Podgorica', 'Montenegro', 'TGD', 42.3656, 19.2518),
    -- Macédoine du Nord : Skopje
    ('Skopje Intl.', 'Skopje', 'North Macedonia', 'SKP', 41.9585, 21.6286),
    -- Albanie : Tirana
    ('Tirana Intl. Nënë Tereza', 'Tirana', 'Albania', 'TIA', 41.4150, 19.7206),
    -- Turquie (capitale) : Ankara
    ('Esenboğa Intl.', 'Ankara', 'Turkey', 'ESB', 40.1281, 32.9951);
