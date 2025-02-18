const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const { Worker } = require("worker_threads");

/***************************************************************
 * Configuration
 ***************************************************************/
const dbConfig = {
  host: "localhost",
  user: "admin",
  password: "admin",
  database: "airline_DB_V3",
};

let timeStep = 10; // Minutes avancées par tick
const tickInterval = 5000; // 5 secondes réelles
let simulatedTime = new Date("2025-02-15T07:00:00");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const airplaneWorkers = new Map();
const flightQueue = [];
const airplaneStatus = new Map(); // Stocke le dernier état des avions

/***************************************************************
 * Initialisation des Workers Avions
 ***************************************************************/
async function initializeAirplaneWorkers() {
  const conn = await mysql.createConnection(dbConfig);
  const [airplanes] = await conn.execute(
    "SELECT Airplane_ID, Current_Location FROM Airplanes"
  );
  await conn.end();

  airplanes.forEach(({ Airplane_ID, Current_Location }) => {
    const worker = new Worker("./workerAirplane.js", {
      workerData: { airplaneId: Airplane_ID, location: Current_Location },
    });

    worker.on("message", async (msg) => {
      if (msg.type === "STATUS_UPDATE") {
        airplaneStatus.set(msg.airplaneId, msg.status);
        await logStatusChange(msg.flightId, msg.airplaneId, msg.status);
      }
    });

    airplaneWorkers.set(Airplane_ID, worker);
    airplaneStatus.set(Airplane_ID, "IDLE");
  });

  console.log(`🚀 ${airplanes.length} avions initialisés.`);
}

/***************************************************************
 * Simulation du temps
 ***************************************************************/
async function tickSimulation() {
  simulatedTime = new Date(simulatedTime.getTime() + timeStep * 60 * 1000);
  console.log(`🕒 Heure simulée mise à jour: ${simulatedTime.toISOString()}`);
  await processPendingFlights();
  setTimeout(tickSimulation, tickInterval);
}

app.get("/api/simulated-time", (req, res) => {
  res.json({ simulatedTime: simulatedTime.toISOString() });
});

/***************************************************************
 * Vérifie et assigne les vols en attente
 ***************************************************************/
async function processPendingFlights() {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [flights] = await conn.execute(
      `SELECT Flight_ID, Flight_Number, Departure_Airport_ID, Arrival_Airport_ID, Departure_Time, Arrival_Time, CDB, OPL
       FROM Flights WHERE Airplane_ID IS NULL AND Status = 'Scheduled' ORDER BY Departure_Time ASC`
    );
    await conn.end();

    for (const flight of flights) {
      await assignNextFlight(flight);
    }
  } catch (err) {
    console.error("❌ Erreur lors de la gestion des vols en attente", err);
  }
}

/***************************************************************
 * Vérifie les avions disponibles et assigne un vol
 ***************************************************************/
async function assignNextFlight(flight) {
  if (!flight || !flight.Flight_ID) {
    console.error(
      "❌ Erreur: Flight_ID invalide ou vol non défini dans assignNextFlight."
    );
    return;
  }

  for (const [airplaneId, status] of airplaneStatus.entries()) {
    if (status === "IDLE") {
      const worker = airplaneWorkers.get(airplaneId);
      if (worker) {
        console.log(
          `📡 Envoi du vol #${flight.Flight_ID} à l’avion #${airplaneId}`
        );
        worker.postMessage({ type: "START_FLIGHT", flight });
        return;
      }
    }
  }

  console.log(`❌ Aucun avion disponible pour le vol #${flight.Flight_ID}`);
  flightQueue.push(flight.Flight_ID);
}

app.post("/api/reset-db", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);

    // Suppression des vols
    await conn.execute(`DELETE FROM Flight_Status_Log`);
    await conn.execute(`DELETE FROM Flights`);

    // Réinitialisation des avions
    await conn.execute(
      `UPDATE Airplanes SET Status = 'IDLE', Current_Location = 10`
    );

    await conn.end();

    console.log("✅ Base de données réinitialisée !");
    res.json({ message: "Base de données réinitialisée avec succès !" });
  } catch (err) {
    console.error("❌ Erreur lors de la réinitialisation de la DB", err);
    res.status(500).json({ error: "Erreur lors de la réinitialisation" });
  }
});

/***************************************************************
 * Logger les changements de statut
 ***************************************************************/
async function logStatusChange(flightId, airplaneId, status) {
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      `INSERT INTO Flight_Status_Log (Flight_ID, Airplane_ID, Status, Updated_At) VALUES (?, ?, ?, NOW())`,
      [flightId, airplaneId, status]
    );
    await conn.execute(`UPDATE Flights SET Status = ? WHERE Flight_ID = ?`, [
      status,
      flightId,
    ]);
    await conn.end();
  } catch (err) {
    console.error("❌ Erreur lors de la mise à jour du statut du vol", err);
  }
}

/***************************************************************
 * API Express - Routes
 ***************************************************************/

// Route pour récupérer l'heure simulée
app.get("/api/simulated-time", (req, res) => {
  res.json({ simulatedTime: simulatedTime.toISOString() });
});

// Route pour récupérer la liste des vols en cours
app.get("/api/flights", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [flights] = await conn.execute(
      `SELECT Flight_ID, Flight_Number, Departure_Airport_ID, Arrival_Airport_ID, Status 
             FROM Flights 
             WHERE Status NOT IN ('Completed') 
             ORDER BY Departure_Time ASC`
    );
    await conn.end();
    res.json(flights);
  } catch (err) {
    console.error("❌ Erreur lors de la récupération des vols", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/airports", async (req, res) => {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    // Sélectionner uniquement les colonnes utiles
    const [airports] = await conn.execute(
      "SELECT Airport_ID, Name, City, Country, OACI_Code, Latitude, Longitude FROM Airports"
    );

    if (airports.length === 0) {
      return res.status(404).json({ error: "Aucun aéroport trouvé" });
    }

    res.json(airports);
  } catch (err) {
    console.error("❌ Erreur SQL lors de la récupération des aéroports :", err);
    res
      .status(500)
      .json({ error: `Erreur récupération aéroports : ${err.message}` });
  } finally {
    if (conn) await conn.end(); // Ferme la connexion même en cas d'erreur
  }
});

app.get("/api/get-flight-distance", async (req, res) => {
  const { departure, arrival } = req.query;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [result] = await conn.execute(
      "SELECT airline_DB_V3.Get_Flight_Distance(?, ?) AS distance",
      [departure, arrival]
    );
    await conn.end();
    res.json({ distance: result[0].distance });
  } catch (err) {
    console.error("Erreur calcul distance", err);
    res.status(500).json({ error: "Erreur calcul distance" });
  }
});

app.get("/api/get-flight-time", async (req, res) => {
  const { distance, airplane } = req.query;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [result] = await conn.execute(
      "SELECT airline_DB_V3.Get_Flight_Time(?, ?) AS flightTime",
      [distance, airplane]
    );
    await conn.end();
    res.json({ flightTime: result[0].flightTime });
  } catch (err) {
    console.error("Erreur calcul temps vol", err);
    res.status(500).json({ error: "Erreur calcul temps vol" });
  }
});

app.post("/api/plan-flight", async (req, res) => {
  const {
    departureAirportId,
    arrivalAirportId,
    airplaneId,
    distance,
    flightTime,
  } = req.body;
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      `INSERT INTO Flights (Flight_Number, Departure_Airport_ID, Arrival_Airport_ID, Departure_Time, Arrival_Time, Status)
             VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), 'Scheduled')`,
      [
        `FL${Math.floor(Math.random() * 10000)}`,
        departureAirportId,
        arrivalAirportId,
        flightTime,
      ]
    );
    await conn.end();
    res.json({ message: "Vol planifié avec succès !" });
  } catch (err) {
    console.error("Erreur planification vol", err);
    res.status(500).json({ error: "Erreur planification vol" });
  }
});

// Récupérer la distance entre deux aéroports
app.get("/api/flight-distance", async (req, res) => {
  const { departure, arrival } = req.query;

  if (!departure || !arrival) {
    return res.status(400).json({ error: "Aéroports requis" });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT Get_Flight_Distance(?, ?) AS distance",
      [departure, arrival]
    );
    await conn.end();

    res.json({ distance: rows[0].distance });
  } catch (err) {
    console.error("Erreur récupération distance de vol", err);
    res.status(500).json({ error: err.message });
  }
});

// Récupérer la durée de vol estimée
app.get("/api/flight-time", async (req, res) => {
  const { distance } = req.query;

  if (!distance) {
    return res.status(400).json({ error: "Distance requise" });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      "SELECT Get_Flight_Time(?, 1) AS duration",
      [distance]
    );
    await conn.end();

    res.json({ duration: rows[0].duration });
  } catch (err) {
    console.error("Erreur récupération temps de vol", err);
    res.status(500).json({ error: err.message });
  }
});

// Planifier un vol
app.post("/api/schedule-flight", async (req, res) => {
  const { departureAirport, arrivalAirport, departureTime } = req.body;

  if (!departureAirport || !arrivalAirport || !departureTime) {
    return res.status(400).json({ error: "Données incomplètes" });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      "INSERT INTO Flights (Flight_Number, Departure_Airport_ID, Arrival_Airport_ID, Departure_Time, Status, Priority) VALUES (?, ?, ?, ?, 'Scheduled', 0)",
      [
        `FL${Math.floor(1000 + Math.random() * 9000)}`,
        departureAirport,
        arrivalAirport,
        departureTime,
      ]
    );
    await conn.end();

    res.json({ message: "Vol planifié avec succès" });
  } catch (err) {
    console.error("Erreur planification vol", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/schedule-flight", async (req, res) => {
  const { departureAirport, arrivalAirport, departureTime } = req.body;

  try {
    const conn = await mysql.createConnection(dbConfig);

    // Calcul de la distance
    const [distanceResult] = await conn.execute(
      "SELECT airline_DB_V3.Get_Flight_Distance(?, ?) AS distance",
      [departureAirport, arrivalAirport]
    );
    const distance = distanceResult[0]?.distance;

    if (!distance) {
      return res
        .status(400)
        .json({ error: "Impossible de calculer la distance." });
    }

    // Sélection d'un avion disponible
    const [airplaneResult] = await conn.execute(
      "SELECT Airplane_ID FROM Airplanes WHERE Status = 'IDLE' LIMIT 1"
    );
    const airplaneId = airplaneResult[0]?.Airplane_ID;

    if (!airplaneId) {
      return res.status(400).json({ error: "Aucun avion disponible." });
    }

    // Calcul du temps de vol
    const [flightTimeResult] = await conn.execute(
      "SELECT airline_DB_V3.Get_Flight_Time(?, ?) AS flightTime",
      [distance, airplaneId]
    );
    const flightTime = flightTimeResult[0]?.flightTime;

    if (!flightTime) {
      return res
        .status(400)
        .json({ error: "Impossible de calculer la durée du vol." });
    }

    // Calcul de l'heure d'arrivée
    const departureDateTime = new Date(departureTime);
    departureDateTime.setMinutes(departureDateTime.getMinutes() + flightTime);
    const arrivalTime = departureDateTime
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // Insérer le vol dans la base de données avec `Arrival_Time`
    await conn.execute(
      `INSERT INTO Flights (Flight_Number, Departure_Airport_ID, Arrival_Airport_ID, Departure_Time, Arrival_Time, Status, Priority)
             VALUES (?, ?, ?, ?, ?, 'Scheduled', 0)`,
      [
        `FL${Math.floor(1000 + Math.random() * 9000)}`,
        departureAirport,
        arrivalAirport,
        departureTime,
        arrivalTime,
      ]
    );

    await conn.end();
    res.json({ message: "Vol planifié avec succès !" });
  } catch (err) {
    console.error("❌ Erreur lors de la planification du vol :", err);
    res.status(500).json({ error: "Erreur lors de la planification du vol." });
  }
});

app.get("/api/airplanes-status", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [airplanes] = await conn.execute(
      "SELECT Airplane_ID, Status FROM Airplanes"
    );
    await conn.end();

    res.json(airplanes);
  } catch (err) {
    console.error("❌ Erreur récupération des statuts des avions :", err);
    res.status(500).json({ error: "Erreur récupération statuts avions." });
  }
});

/***************************************************************
 * Lancement du Serveur et simulation
 ***************************************************************/
const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`🌍 Orchestrateur en écoute sur http://localhost:${PORT}`);
  await initializeAirplaneWorkers();
  tickSimulation();
});
