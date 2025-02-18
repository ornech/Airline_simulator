/***************************************************************
 * orchestrator.js - Gestion des Opérations Aériennes
 ***************************************************************/
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
let isPaused = false;
let simulatedTime = new Date("2025-02-15T07:00:00");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const airplaneWorkers = new Map();
const flightQueue = [];

app.get("/api/flights", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [flights] = await conn.execute(
      `SELECT Flight_ID, Flight_Number, Departure_Airport_ID, Arrival_Airport_ID, 
              Departure_Time, Arrival_Time, Airplane_ID, Status
       FROM Flights
       WHERE Status IN ('Scheduled', 'On-Time', 'In-Flight')`
    );
    await conn.end();
    res.json(flights);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des vols :", error);
    res.status(500).json({ error: "Erreur lors de la récupération des vols" });
  }
});

/***************************************************************
 * Initialisation des Workers Avions
 ***************************************************************/
async function initializeAirplaneWorkers() {
  const conn = await mysql.createConnection(dbConfig);
  const [airplanes] = await conn.execute(
    `SELECT Airplane_ID, Current_Location FROM Airplanes`
  );
  await conn.end();

  airplanes.forEach(({ Airplane_ID, Current_Location }) => {
    const worker = new Worker("./workerAirplane.js", {
      workerData: { airplaneId: Airplane_ID, location: Current_Location },
    });

    worker.on("message", async (msg) => {
      if (msg.type === "FLIGHT_COMPLETED") {
        console.log(
          `✅ Vol #${msg.flightId} terminé par avion #${msg.airplaneId}`
        );
        await markFlightAsCompleted(msg.flightId);
        await updateAircraftLocation(msg.airplaneId, msg.location);
        assignNextFlight(msg.airplaneId);
      } else if (msg.type === "FLIGHT_ADDED") {
        console.log(
          `✅ L’avion #${msg.airplaneId} a bien ajouté le vol #${msg.flightId} en base.`
        );
      } else if (msg.type === "FLIGHT_DENIED") {
        console.log(
          `❌ L’avion #${msg.airplaneId} a refusé le vol #${msg.flightId} (déjà en vol).`
        );
      } else if (msg.type === "FLIGHT_ERROR") {
        console.error(
          `❌ Erreur d'ajout du vol #${msg.flightId} par l’avion #${msg.airplaneId}.`
        );
      }
    });

    airplaneWorkers.set(Airplane_ID, worker);
  });

  console.log(`🚀 ${airplanes.length} avions initialisés.`);
}

/***************************************************************
 * Simulation du temps
 ***************************************************************/
async function tickSimulation() {
  if (!isPaused) {
    simulatedTime = new Date(simulatedTime.getTime() + timeStep * 60 * 1000);
    console.log(`🕒 Heure simulée mise à jour: ${simulatedTime.toISOString()}`);

    await processPendingFlights();

    airplaneWorkers.forEach((worker) => {
      worker.postMessage({ type: "TIME_UPDATE", simulatedTime });
    });
  }
  setTimeout(tickSimulation, tickInterval);
}

/***************************************************************
 * Vérifie et assigne les vols en attente
 ***************************************************************/
async function processPendingFlights() {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [flights] = await conn.execute(
      `SELECT Flight_ID, Flight_Number, Departure_Airport_ID, Arrival_Airport_ID, Departure_Time, Arrival_Time, CDB, OPL
   FROM Flights
   WHERE Airplane_ID IS NULL AND Status = 'Scheduled'
   ORDER BY Departure_Time ASC`
    );

    await conn.end();
    console.log(`📡 Vols détectés pour assignation: ${flights.length}`);
    if (flights.length > 0) {
      console.log(
        "🔍 Détails des vols détectés :",
        JSON.stringify(flights, null, 2)
      );
    }

    if (flights.length > 0) {
      console.log("🔍 Détails des vols détectés :", flights);
    }

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
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [availableAircraft] = await conn.execute(
      `SELECT Airplane_ID FROM Airplanes
       WHERE Airplane_ID NOT IN 
       (SELECT DISTINCT Airplane_ID FROM Flights WHERE Status IN ('Assigned', 'Boarding', 'In-Flight'))
       LIMIT 1`
    );
    await conn.end();

    if (availableAircraft.length) {
      const airplaneId = availableAircraft[0].Airplane_ID;
      console.log(
        `📡 Assignation du vol #${flight.Flight_ID} à l’avion #${airplaneId}...`
      );

      const worker = airplaneWorkers.get(airplaneId);
      if (worker) {
        console.log(
          `📡 Envoi du vol #${flight.Flight_ID} au worker de l’avion #${airplaneId}`
        );
        worker.postMessage({ type: "START_FLIGHT", flight });
      } else {
        console.error(`❌ Worker introuvable pour l’avion #${airplaneId}`);
      }
    } else {
      console.log(`❌ Aucun avion disponible pour le vol #${flight.Flight_ID}`);
      flightQueue.push(flight.Flight_ID);
    }
  } catch (err) {
    console.error(`❌ Erreur d'assignation du vol #${flight.Flight_ID}`, err);
  }
}

/***************************************************************
 * Lancement du Serveur et simulation
 ***************************************************************/
const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`🌍 Orchestrateur en écoute sur http://localhost:${PORT}`);
  await initializeAirplaneWorkers();
  tickSimulation();
});
