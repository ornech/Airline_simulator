const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const { Worker } = require("worker_threads");
const axios = require("axios");

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

const airplaneData = new Map();
const airplaneWorkers = new Map();
const flightQueue = [];

/***************************************************************
 * Initialisation des Workers Avions
 ***************************************************************/
async function initializeAirplaneWorkers() {
  const conn = await mysql.createConnection(dbConfig);
  const [airplanes] = await conn.execute(
    "SELECT Airplane_ID, Model, Capacity, Cruising_Speed, Current_Location, Registration, Status FROM Airplanes"
  );
  await conn.end();

  airplanes.forEach((airplane) => {
    airplaneData.set(airplane.Airplane_ID, airplane);

    console.log(
      `👷 Initialisation du worker pour l'avion #${airplane.Airplane_ID}`
    );

    const worker = new Worker("./workerAirplane.js", {
      workerData: airplane,
    });

    airplaneWorkers.set(airplane.Airplane_ID, worker);
  });

  console.log(`🚀 ${airplanes.length} avions initialisés.`);
}

/***************************************************************
 * Gestion du temps
 ***************************************************************/
async function tickSimulation() {
  simulatedTime = new Date(simulatedTime.getTime() + timeStep * 60 * 1000);
  console.log(`🕒 Heure simulée: ${simulatedTime.toISOString()}`);
  await processPendingFlights();
  setTimeout(tickSimulation, tickInterval);
}

/***************************************************************
 * Vérifie et assigne les vols en attente
 ***************************************************************/
async function processPendingFlights() {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [flights] = await conn.execute(
      "SELECT Flight_ID FROM Flights WHERE Airplane_ID IS NULL AND Status = 'Scheduled' ORDER BY Departure_Time ASC"
    );
    await conn.end();
  } catch (err) {
    console.error("❌ Erreur dans la gestion des vols en attente", err);
  }
}

/***************************************************************
 * Logger les changements de statut
 ***************************************************************/
async function logStatusChange(flightId, airplaneId, status) {
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      "INSERT INTO Flight_Status_Log (Flight_ID, Airplane_ID, Status, Updated_At) VALUES (?, ?, ?, NOW())",
      [flightId, airplaneId, status]
    );
    await conn.execute("UPDATE Flights SET Status = ? WHERE Flight_ID = ?", [
      status,
      flightId,
    ]);
    await conn.end();
  } catch (err) {
    console.error("❌ Erreur mise à jour du statut du vol", err);
  }
}

/***************************************************************
 * API Express - Routes
 ***************************************************************/

// Planification d'un vol
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
    res.json({ message: "✈️ Vol planifié avec succès !" });
  } catch (err) {
    console.error("❌ Erreur planification du vol", err);
    res.status(500).json({ error: "Erreur planification du vol." });
  }
});

// Mise à jour d'un vol
app.post("/api/flight/update/:id", async (req, res) => {
  const flightId = req.params.id;
  const updates = req.body;

  try {
    const conn = await mysql.createConnection(dbConfig);
    for (const [column, value] of Object.entries(updates)) {
      await conn.execute(
        `UPDATE Flights SET ${column} = ? WHERE Flight_ID = ?`,
        [value, flightId]
      );
    }
    await conn.end();
    res.json({ message: "Vol mis à jour avec succès" });
  } catch (err) {
    console.error("❌ Erreur mise à jour du vol", err);
    res.status(500).json({ error: "Erreur mise à jour du vol." });
  }
});

// Réinitialisation de la base de données
app.post("/api/reset-db", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute("DELETE FROM Flight_Status_Log");
    await conn.execute("DELETE FROM Flights");
    await conn.execute("UPDATE Airplanes SET Status = 'IDLE'");
    await conn.end();
    res.json({ message: "Base de données réinitialisée !" });
  } catch (err) {
    console.error("❌ Erreur reset DB", err);
    res.status(500).json({ error: "Erreur reset DB." });
  }
});

/***************************************************************
 * Lancement du Serveur
 ***************************************************************/
const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`🌍 Orchestrateur en écoute sur http://localhost:${PORT}`);
  await initializeAirplaneWorkers();
  tickSimulation();
});
