-- 1) Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS Airports;

-- 2) Création de la table Airports
--    On n'utilise plus AUTO_INCREMENT pour Airport_ID, 
--    puisqu'on va insérer des valeurs manuellement.
CREATE TABLE Airports (
    Airport_ID INT PRIMARY KEY,
    Name       VARCHAR(100) NOT NULL,
    City       VARCHAR(100) NOT NULL,
    Country    VARCHAR(100) NOT NULL,
    IATA_Code  VARCHAR(10)  NOT NULL,
    Latitude   DECIMAL(8,4) NOT NULL,
    Longitude  DECIMAL(8,4) NOT NULL
);

-- 3) Insérer explicitement l’Airport_ID, en partant de 1
INSERT INTO Airports (Airport_ID, Name, City, Country, IATA_Code, Latitude, Longitude)
VALUES
    ( 1, 'Vienna Intl.',                        'Vienna',      'Austria',          'VIE', 48.1103,  16.5697),
    ( 2, 'Brussels Airport',                    'Brussels',    'Belgium',          'BRU', 50.9014,   4.4844),
    ( 3, 'Sofia Airport',                       'Sofia',       'Bulgaria',         'SOF', 42.6952,  23.4063),
    ( 4, 'Franjo Tuđman Airport',               'Zagreb',      'Croatia',          'ZAG', 45.7429,  16.0688),
    ( 5, 'Larnaca International',               'Nicosia',     'Cyprus',           'LCA', 34.8754,  33.6249),
    ( 6, 'Václav Havel Airport',                'Prague',      'Czech Republic',   'PRG', 50.1008,  14.2600),
    ( 7, 'Copenhagen Airport',                  'Copenhagen',  'Denmark',          'CPH', 55.6179,  12.6560),
    ( 8, 'Tallinn Airport',                     'Tallinn',     'Estonia',          'TLL', 59.4133,  24.8328),
    ( 9, 'Helsinki-Vantaa',                     'Helsinki',    'Finland',          'HEL', 60.3172,  24.9633),
    (10, 'Charles de Gaulle',                   'Paris',       'France',           'CDG', 49.0097,   2.5479),
    (11, 'Berlin Brandenburg',                  'Berlin',      'Germany',          'BER', 52.3649,  13.5033),
    (12, 'Athens Intl. Eleftherios Venizelos',  'Athens',      'Greece',           'ATH', 37.9364,  23.9475),
    (13, 'Budapest Ferenc Liszt Intl.',         'Budapest',    'Hungary',          'BUD', 47.4304,  19.2611),
    (14, 'Dublin Airport',                      'Dublin',      'Ireland',          'DUB', 53.4214,  -6.2700),
    (15, 'Leonardo da Vinci–Fiumicino',         'Rome',        'Italy',            'FCO', 41.8003,  12.2389),
    (16, 'Riga Intl.',                          'Riga',        'Latvia',           'RIX', 56.9236,  23.9717),
    (17, 'Vilnius Airport',                     'Vilnius',     'Lithuania',        'VNO', 54.6369,  25.2850),
    (18, 'Luxembourg Airport',                  'Luxembourg',  'Luxembourg',       'LUX', 49.6266,   6.1988),
    (19, 'Malta Intl.',                         'Valletta',    'Malta',            'MLA', 35.8575,  14.4775),
    (20, 'Amsterdam Schiphol',                  'Amsterdam',   'Netherlands',      'AMS', 52.3105,   4.7683),
    (21, 'Warsaw Chopin',                       'Warsaw',      'Poland',           'WAW', 52.1657,  20.9671),
    (22, 'Humberto Delgado Airport',            'Lisbon',      'Portugal',         'LIS', 38.7742,  -9.1342),
    (23, 'Henri Coandă Intl.',                  'Bucharest',   'Romania',          'OTP', 44.5712,  26.0851),
    (24, 'M. R. Štefánik Airport',              'Bratislava',  'Slovakia',         'BTS', 48.1702,  17.2137),
    (25, 'Ljubljana Jože Pučnik',               'Ljubljana',   'Slovenia',         'LJU', 46.2237,  14.4576),
    (26, 'Adolfo Suárez Madrid-Barajas',        'Madrid',      'Spain',            'MAD', 40.4936,  -3.5676),
    (27, 'Stockholm Arlanda',                   'Stockholm',   'Sweden',           'ARN', 59.6519,  17.9186),
    (28, 'Heathrow Airport',                    'London',      'UK',               'LHR', 51.4700,  -0.4543),
    (29, 'Keflavík Intl.',                      'Reykjavik',   'Iceland',          'KEF', 63.9850, -22.6056),
    (30, 'Bern Airport',                        'Bern',        'Switzerland',      'BRN', 46.9132,   7.4996),
    (31, 'Oslo Gardermoen',                     'Oslo',        'Norway',           'OSL', 60.1976,  11.1004),
    (32, 'Belgrade Nikola Tesla',               'Belgrade',    'Serbia',           'BEG', 44.8184,  20.3091),
    (33, 'Sheremetyevo Intl.',                  'Moscow',      'Russia',           'SVO', 55.9726,  37.4146),
    (34, 'Boryspil Intl.',                      'Kiev',        'Ukraine',          'KBP', 50.3450,  30.8947),
    (35, 'Minsk National Airport',              'Minsk',       'Belarus',          'MSQ', 53.8825,  28.0325),
    (36, 'Sarajevo Intl.',                      'Sarajevo',    'Bosnia & Herz.',   'SJJ', 43.8246,  18.3314),
    (37, 'Podgorica Airport',                   'Podgorica',   'Montenegro',       'TGD', 42.3656,  19.2518),
    (38, 'Skopje Intl.',                        'Skopje',      'North Macedonia',  'SKP', 41.9585,  21.6286),
    (39, 'Tirana Intl. Nënë Tereza',            'Tirana',      'Albania',          'TIA', 41.4150,  19.7206),
    (40, 'Esenboğa Intl.',                      'Ankara',      'Turkey',           'ESB', 40.1281,  32.9951);
