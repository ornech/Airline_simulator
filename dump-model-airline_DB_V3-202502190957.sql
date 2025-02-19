/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.10-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 127.0.0.1    Database: airline_DB_V3
-- ------------------------------------------------------
-- Server version	10.11.10-MariaDB-ubu2204

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Airplanes`
--

DROP TABLE IF EXISTS `Airplanes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Airplanes` (
  `Airplane_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Model` varchar(255) NOT NULL,
  `Capacity` int(11) NOT NULL,
  `Cruising_Speed` int(11) NOT NULL,
  `Seats_Per_Row` int(11) NOT NULL DEFAULT 6,
  `Num_Rows` int(11) NOT NULL DEFAULT 30,
  `Current_Location` int(11) DEFAULT NULL,
  `Registration` varchar(20) DEFAULT NULL,
  `Status` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`Airplane_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Airplanes`
--

LOCK TABLES `Airplanes` WRITE;
/*!40000 ALTER TABLE `Airplanes` DISABLE KEYS */;
INSERT INTO `Airplanes` VALUES
(1,'Boeing 737',189,850,6,32,10,'D-ABCD','IDLE'),
(2,'Airbus A320',180,840,6,30,10,'F-GKXY','IDLE'),
(5,'Embraer E190',100,820,4,25,10,'EI-XYZ1','IDLE'),
(6,'Boeing 737',189,850,6,32,10,'D-ABCE','IDLE'),
(7,'Airbus A320',180,840,6,30,10,'F-GKXZ','IDLE'),
(10,'Embraer E190',100,820,4,25,10,'EI-XYZ2','IDLE'),
(11,'Airbus A320',180,840,6,30,10,'F-GKYA','IDLE'),
(12,'Airbus A320',180,840,6,30,10,'F-GKYB','IDLE'),
(13,'Boeing 737',189,850,6,32,10,'D-ABCF','IDLE'),
(14,'Boeing 737',189,850,6,32,10,'D-ABCG','IDLE'),
(15,'Embraer E190',100,820,4,25,10,'EI-XYZ3','IDLE'),
(16,'Embraer E190',100,820,4,25,10,'EI-XYZ4','IDLE');
/*!40000 ALTER TABLE `Airplanes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Airports`
--

DROP TABLE IF EXISTS `Airports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Airports` (
  `Airport_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(255) NOT NULL,
  `City` varchar(255) DEFAULT NULL,
  `Country` varchar(255) DEFAULT NULL,
  `OACI_Code` varchar(10) NOT NULL,
  `Latitude` decimal(9,6) DEFAULT NULL,
  `Longitude` decimal(9,6) DEFAULT NULL,
  PRIMARY KEY (`Airport_ID`),
  UNIQUE KEY `IATA_Code` (`OACI_Code`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Airports`
--

LOCK TABLES `Airports` WRITE;
/*!40000 ALTER TABLE `Airports` DISABLE KEYS */;
INSERT INTO `Airports` VALUES
(1,'Vienna Intl.','Vienna','Austria','VIE',48.110300,16.569700),
(2,'Brussels Airport','Brussels','Belgium','BRU',50.901400,4.484400),
(3,'Sofia Airport','Sofia','Bulgaria','LBSF',42.695200,23.406300),
(4,'Franjo Tuđman Airport','Zagreb','Croatia','LDZA',45.742900,16.068800),
(5,'Larnaca International','Nicosia','Cyprus','LCA',34.875400,33.624900),
(6,'Václav Havel Airport','Prague','Czech Republic','PRG',50.100800,14.260000),
(7,'Copenhagen Airport','Copenhagen','Denmark','CPH',55.617900,12.656000),
(8,'Tallinn Airport','Tallinn','Estonia','EETN',59.413300,24.832800),
(9,'Helsinki-Vantaa','Helsinki','Finland','HEL',60.317200,24.963300),
(10,'Charles de Gaulle','Paris','France','CDG',49.009700,2.547900),
(11,'Berlin Brandenburg','Berlin','Germany','EDDB',52.364900,13.503300),
(12,'Athens Intl. Eleftherios Venizelos','Athens','Greece','ATH',37.936400,23.947500),
(13,'Budapest Ferenc Liszt Intl.','Budapest','Hungary','LHBP',47.430400,19.261100),
(14,'Dublin Airport','Dublin','Ireland','DUB',53.421400,-6.270000),
(15,'Leonardo da Vinci–Fiumicino','Rome','Italy','FCO',41.800300,12.238900),
(16,'Riga Intl.','Riga','Latvia','RIX',56.923600,23.971700),
(17,'Vilnius Airport','Vilnius','Lithuania','VNO',54.636900,25.285000),
(18,'Luxembourg Airport','Luxembourg','Luxembourg','LUX',49.626600,6.198800),
(19,'Malta Intl.','Valletta','Malta','MLA',35.857500,14.477500),
(20,'Amsterdam Schiphol','Amsterdam','Netherlands','AMS',52.310500,4.768300),
(21,'Warsaw Chopin','Warsaw','Poland','WAW',52.165700,20.967100),
(22,'Humberto Delgado Airport','Lisbon','Portugal','LIS',38.774200,-9.134200),
(23,'Henri Coandă Intl.','Bucharest','Romania','OTP',44.571200,26.085100),
(24,'M. R. Štefánik Airport','Bratislava','Slovakia','BTS',48.170200,17.213700),
(25,'Ljubljana Jože Pučnik','Ljubljana','Slovenia','LJU',46.223700,14.457600),
(26,'Adolfo Suárez Madrid-Barajas','Madrid','Spain','MAD',40.493600,-3.567600),
(27,'Stockholm Arlanda','Stockholm','Sweden','ARN',59.651900,17.918600),
(28,'Heathrow Airport','London','UK','LHR',51.470000,-0.454300),
(29,'Keflavík Intl.','Reykjavik','Iceland','KEF',63.985000,-22.605600),
(30,'Bern Airport','Bern','Switzerland','BRN',46.913200,7.499600),
(31,'Oslo Gardermoen','Oslo','Norway','OSL',60.197600,11.100400),
(32,'Belgrade Nikola Tesla','Belgrade','Serbia','LYBE',44.818400,20.309100),
(33,'Sheremetyevo Intl.','Moscow','Russia','SVO',55.972600,37.414600),
(34,'Boryspil Intl.','Kiev','Ukraine','KBP',50.345000,30.894700),
(35,'Minsk National Airport','Minsk','Belarus','UMMS',53.882500,28.032500),
(36,'Sarajevo Intl.','Sarajevo','Bosnia & Herz.','SJJ',43.824600,18.331400),
(37,'Podgorica Airport','Podgorica','Montenegro','TGD',42.365600,19.251800),
(38,'Skopje Intl.','Skopje','North Macedonia','SKP',41.958500,21.628600),
(39,'Tirana Intl. Nënë Tereza','Tirana','Albania','TIA',41.415000,19.720600),
(40,'Esenboğa Intl.','Ankara','Turkey','ESB',40.128100,32.995100);
/*!40000 ALTER TABLE `Airports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Bookings`
--

DROP TABLE IF EXISTS `Bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Bookings` (
  `Booking_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Flight_ID` int(11) DEFAULT NULL,
  `Passenger_ID` int(11) DEFAULT NULL,
  `Booking_Date` datetime NOT NULL,
  `Seat_Number` varchar(10) NOT NULL,
  PRIMARY KEY (`Booking_ID`),
  UNIQUE KEY `unique_passenger_flight` (`Flight_ID`,`Passenger_ID`),
  KEY `Passenger_ID` (`Passenger_ID`),
  KEY `idx_booking_date` (`Booking_Date`),
  CONSTRAINT `Bookings_ibfk_1` FOREIGN KEY (`Flight_ID`) REFERENCES `Flights` (`Flight_ID`),
  CONSTRAINT `Bookings_ibfk_2` FOREIGN KEY (`Passenger_ID`) REFERENCES `Passengers` (`Passenger_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=566 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Bookings`
--

LOCK TABLES `Bookings` WRITE;
/*!40000 ALTER TABLE `Bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `Bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Debug_Log`
--

DROP TABLE IF EXISTS `Debug_Log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Debug_Log` (
  `Log_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Timestamp` datetime DEFAULT current_timestamp(),
  `Message` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`Log_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Debug_Log`
--

LOCK TABLES `Debug_Log` WRITE;
/*!40000 ALTER TABLE `Debug_Log` DISABLE KEYS */;
INSERT INTO `Debug_Log` VALUES
(1,'2025-02-15 16:22:02','equipage_disponible:4'),
(2,'2025-02-15 16:22:02','Crew:2 1');
/*!40000 ALTER TABLE `Debug_Log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Employees`
--

DROP TABLE IF EXISTS `Employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Employees` (
  `Employee_ID` int(11) NOT NULL AUTO_INCREMENT,
  `First_Name` varchar(255) NOT NULL,
  `Last_Name` varchar(255) NOT NULL,
  `Role` enum('Pilot','Cabin Crew') NOT NULL,
  `Location` int(11) DEFAULT NULL,
  PRIMARY KEY (`Employee_ID`),
  KEY `Location` (`Location`),
  CONSTRAINT `Employees_ibfk_1` FOREIGN KEY (`Location`) REFERENCES `Airports` (`Airport_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Employees`
--

LOCK TABLES `Employees` WRITE;
/*!40000 ALTER TABLE `Employees` DISABLE KEYS */;
INSERT INTO `Employees` VALUES
(1,'Léonie','Petrashkov','Pilot',10),
(2,'Ruò','Graine','Pilot',10),
(3,'Mårten','Carrick','Pilot',10),
(4,'Séverine','Levi','Pilot',10),
(5,'Félicie','Virr','Pilot',10),
(6,'Liè','Oganian','Pilot',10),
(7,'Solène','Tear','Pilot',10),
(8,'Noémie','Ruben','Pilot',10),
(9,'Naëlle','Dalziell','Pilot',10),
(10,'Måns','Scadden','Pilot',10),
(11,'Mylène','Poytres','Pilot',10),
(12,'Lyséa','Lundberg','Pilot',10),
(13,'Börje','Trenholm','Pilot',10),
(14,'Clélia','Schultz','Pilot',10),
(15,'Dafnée','Withers','Pilot',10),
(16,'Maëlla','Faldoe','Pilot',10),
(17,'Lorène','Cosby','Pilot',10),
(18,'Maïwenn','Ciccone','Pilot',10),
(19,'Bérénice','Janku','Pilot',10),
(20,'Daphnée','Elgee','Pilot',10),
(21,'Yè','Steers','Pilot',10),
(22,'Maïlys','Mendonca','Pilot',10),
(23,'André','Pickvance','Pilot',10),
(24,'Marie-françoise','Truran','Pilot',10),
(25,'Léane','Brambell','Pilot',10),
(26,'Loïs','Castellone','Pilot',10),
(27,'Cécilia','Roote','Pilot',10),
(28,'Mén','Feyer','Pilot',10),
(29,'Bénédicte','Coneron','Pilot',10),
(30,'Noëlla','Bulcock','Pilot',10);
/*!40000 ALTER TABLE `Employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Flight_Status_Log`
--

DROP TABLE IF EXISTS `Flight_Status_Log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Flight_Status_Log` (
  `Log_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Flight_ID` int(11) NOT NULL,
  `Airplane_ID` int(11) NOT NULL,
  `Status` enum('Scheduled','On-Time','Boarding','In-Flight','Approaching','On-Ground','Completed','Cancelled','Delayed') NOT NULL,
  `Updated_At` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`Log_ID`),
  KEY `Flight_ID` (`Flight_ID`),
  KEY `Airplane_ID` (`Airplane_ID`),
  CONSTRAINT `Flight_Status_Log_ibfk_1` FOREIGN KEY (`Flight_ID`) REFERENCES `Flights` (`Flight_ID`) ON DELETE CASCADE,
  CONSTRAINT `Flight_Status_Log_ibfk_2` FOREIGN KEY (`Airplane_ID`) REFERENCES `Airplanes` (`Airplane_ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Flight_Status_Log`
--

LOCK TABLES `Flight_Status_Log` WRITE;
/*!40000 ALTER TABLE `Flight_Status_Log` DISABLE KEYS */;
/*!40000 ALTER TABLE `Flight_Status_Log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Flights`
--

DROP TABLE IF EXISTS `Flights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Flights` (
  `Flight_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Flight_Number` varchar(10) DEFAULT NULL,
  `Departure_Airport_ID` int(11) DEFAULT NULL,
  `Arrival_Airport_ID` int(11) DEFAULT NULL,
  `Departure_Time` datetime DEFAULT NULL,
  `Arrival_Time` datetime DEFAULT NULL,
  `Airplane_ID` int(11) DEFAULT NULL,
  `CDB` int(11) DEFAULT NULL,
  `OPL` int(11) DEFAULT NULL,
  `Status` varchar(100) DEFAULT NULL,
  `Priority` int(11) DEFAULT 0,
  PRIMARY KEY (`Flight_ID`),
  UNIQUE KEY `Flight_Number` (`Flight_Number`),
  KEY `Departure_Airport_ID` (`Departure_Airport_ID`),
  KEY `Arrival_Airport_ID` (`Arrival_Airport_ID`),
  KEY `Airplane_ID` (`Airplane_ID`),
  KEY `CDB` (`CDB`),
  KEY `OPL` (`OPL`),
  KEY `idx_flight_status` (`Status`),
  CONSTRAINT `Flights_ibfk_1` FOREIGN KEY (`Departure_Airport_ID`) REFERENCES `Airports` (`Airport_ID`),
  CONSTRAINT `Flights_ibfk_2` FOREIGN KEY (`Arrival_Airport_ID`) REFERENCES `Airports` (`Airport_ID`),
  CONSTRAINT `Flights_ibfk_3` FOREIGN KEY (`Airplane_ID`) REFERENCES `Airplanes` (`Airplane_ID`),
  CONSTRAINT `Flights_ibfk_4` FOREIGN KEY (`CDB`) REFERENCES `Employees` (`Employee_ID`),
  CONSTRAINT `Flights_ibfk_5` FOREIGN KEY (`OPL`) REFERENCES `Employees` (`Employee_ID`),
  CONSTRAINT `chk_airports` CHECK (`Departure_Airport_ID` <> `Arrival_Airport_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=1041 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Flights`
--

LOCK TABLES `Flights` WRITE;
/*!40000 ALTER TABLE `Flights` DISABLE KEYS */;
INSERT INTO `Flights` VALUES
(1040,'FL7235',9,1,'2025-02-18 10:00:00',NULL,NULL,NULL,NULL,'Scheduled',0);
/*!40000 ALTER TABLE `Flights` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Passengers`
--

DROP TABLE IF EXISTS `Passengers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Passengers` (
  `Passenger_ID` int(11) NOT NULL AUTO_INCREMENT,
  `First_Name` varchar(255) NOT NULL,
  `Last_Name` varchar(255) NOT NULL,
  `Contact_Info` varchar(255) DEFAULT NULL,
  `Passport_Number` varchar(50) DEFAULT NULL,
  `Nationality` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`Passenger_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Passengers`
--

LOCK TABLES `Passengers` WRITE;
/*!40000 ALTER TABLE `Passengers` DISABLE KEYS */;
INSERT INTO `Passengers` VALUES
(1,'Jean','Dupont','jean.dupont@example.com','FRA123456','French'),
(2,'Anna','Müller','anna.muller@example.com','GER654321','German'),
(3,'Luca','Rossi','luca.rossi@example.com','ITA111222','Italian'),
(4,'Maria','González','maria.gonzalez@example.com','SPA333444','Spanish'),
(5,'Sofia','Silva','sofia.silva@example.com','POR555666','Portuguese');
/*!40000 ALTER TABLE `Passengers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-02-19  9:57:03
