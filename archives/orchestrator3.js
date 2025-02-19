/***************************************************************
 * orchestrator.js - Gestion de la simulation de vols (FIFO, sans Deboarding)
 ***************************************************************/
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
// Pour les Worker Threads
const { Worker } = require("worker_threads");

/***************************************************************
 * Configuration
 ***************************************************************/
const dbConfig = {
  host: "localhost",
  user: "admin", // adapter si besoin
  password: "admin",
  database: "airline_DB_V3",
};

// Paramètres de simulation
let timeStep = 10; // minutes à avancer par tick
const tickInterval = 5000; // 5s réelles
let isPaused = false;

// Heure simulée unique pour tous
let simulatedTime = new Date("2025-02-15T07:00:00");

const app = express();

// Pour les requêtes JSON si besoin
app.use(express.json());

// 🔥 **Important** : Sert le dossier courant comme racine de fichiers statiques.
//    Assurez-vous que "index.html" est dans le même dossier que "orchestrator.js".
app.use(express.static(path.join(__dirname)));

/***************************************************************
 * Endpoints /api/...
 ***************************************************************/

// Simulated time
app.get("/api/simulated-time", (req, res) => {
  res.json({
    simulatedTime: simulatedTime.toISOString().slice(0, 19).replace("T", " "),
  });
});

// Dashboard stats (exemple)
app.get("/api/dashboard-stats", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    // Ex: Avions disponibles
    const [availablePlanes] = await conn.execute(`
      SELECT COUNT(*) AS count
      FROM Airplanes A
      WHERE NOT EXISTS (
        SELECT 1
        FROM Flights F
        WHERE F.Airplane_ID = A.Airplane_ID
          AND F.Status IN ('On-Time','Boarding','In-Flight','Approaching')
      )
    `);

    // Avions engagés
    const [engagedPlanes] = await conn.execute(`
      SELECT COUNT(DISTINCT Airplane_ID) AS count
      FROM Flights
      WHERE Status IN ('On-Time','Boarding','In-Flight','Approaching')
    `);

    // Pilotes disponibles
    const [availablePilots] = await conn.execute(`
      SELECT COUNT(*) AS count
      FROM Employees E
      WHERE E.Role = 'Pilot'
        AND NOT EXISTS (
          SELECT 1
          FROM Flights F
          WHERE (F.CDB = E.Employee_ID OR F.OPL = E.Employee_ID)
            AND F.Status IN ('On-Time','Boarding','In-Flight','Approaching')
        )
    `);

    // Pilotes engagés
    const [engagedPilots] = await conn.execute(`
      SELECT COUNT(DISTINCT Employee_ID) AS count
      FROM (
        SELECT CDB AS Employee_ID FROM Flights WHERE Status IN ('On-Time','Boarding','In-Flight','Approaching')
        UNION
        SELECT OPL AS Employee_ID FROM Flights WHERE Status IN ('On-Time','Boarding','In-Flight','Approaching')
      ) AS Engaged
    `);

    await conn.end();

    res.json({
      availablePlanes: availablePlanes[0].count,
      engagedPlanes: engagedPlanes[0].count,
      availablePilots: availablePilots[0].count,
      engagedPilots: engagedPilots[0].count,
    });
  } catch (err) {
    console.error("❌ Erreur /api/dashboard-stats:", err);
    res.status(500).send("Erreur serveur");
  }
});

// Flights (exemple)
app.get("/api/flights", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(`
      SELECT 
        f.Flight_ID,
        f.Flight_Number,
        f.Status,
        DATE_FORMAT(f.Departure_Time, '%Y-%m-%d') AS Date,
        TIME_FORMAT(f.Departure_Time, '%H:%i') AS Departure_Time,
        TIME_FORMAT(f.Arrival_Time, '%H:%i') AS Arrival_Time,
        a1.City AS Departure_City,
        a2.City AS Arrival_City,
        ap.Registration AS Airplane_Registration
      FROM Flights f
      JOIN Airports a1 ON f.Departure_Airport_ID = a1.Airport_ID
      JOIN Airports a2 ON f.Arrival_Airport_ID = a2.Airport_ID
      JOIN Airplanes ap ON f.Airplane_ID = ap.Airplane_ID
      WHERE f.Status <> 'Completed'
      ORDER BY f.Departure_Time DESC
    `);
    await conn.end();
    res.json(rows);
  } catch (err) {
    console.error("❌ Erreur /api/flights:", err);
    res.status(500).send("Erreur serveur");
  }
});

// Airplanes status (exemple)
app.get("/api/airplanes-status", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const simTimeStr = simulatedTime
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const [rows] = await conn.execute(
      `
      SELECT
        a.Airplane_ID,
        a.Registration,
        a.Model,
        ap.City AS Location_City,
        (
          SELECT f.Status
          FROM Flights f
          WHERE f.Airplane_ID = a.Airplane_ID
          ORDER BY f.Arrival_Time DESC
          LIMIT 1
        ) AS Last_Status,
        (
          SELECT DATE_FORMAT(f.Departure_Time, '%Y-%m-%d %H:%i')
          FROM Flights f
          WHERE f.Airplane_ID = a.Airplane_ID
            AND f.Departure_Time > ?
          ORDER BY f.Departure_Time ASC
          LIMIT 1
        ) AS Next_Departure,
        (
          SELECT DATE_FORMAT(f.Arrival_Time, '%Y-%m-%d %H:%i')
          FROM Flights f
          WHERE f.Airplane_ID = a.Airplane_ID
            AND f.Departure_Time > ?
          ORDER BY f.Departure_Time ASC
          LIMIT 1
        ) AS Next_Arrival,
        (
          SELECT COUNT(*)
          FROM Employees e
          WHERE e.Role = 'Pilot'
            AND e.Location = a.Current_Location
            AND NOT EXISTS (
              SELECT 1
              FROM Flights f2
              WHERE (f2.CDB = e.Employee_ID OR f2.OPL = e.Employee_ID)
                AND f2.Status IN ('On-Time','Boarding','In-Flight','Approaching')
            )
        ) AS Available_Pilots
      FROM Airplanes a
      JOIN Airports ap ON a.Current_Location = ap.Airport_ID
    `,
      [simTimeStr, simTimeStr]
    );

    await conn.end();
    res.json(rows);
  } catch (err) {
    console.error("❌ Erreur /api/airplanes-status:", err);
    res.status(500).send("Erreur serveur");
  }
});

// Stocke les workers des avions
const airplaneWorkers = new Map();

/***************************************************************
 * Initialisation des Workers (Avions)
 ***************************************************************/
async function initializeAirplaneWorkers() {
  const conn = await mysql.createConnection(dbConfig);
  const [airplanes] = await conn.execute(`
    SELECT Airplane_ID, Current_Location FROM Airplanes
  `);
  await conn.end();

  airplanes.forEach(({ Airplane_ID, Current_Location }) => {
    const worker = new Worker("./workerAirplane.js", {
      workerData: { airplaneId: Airplane_ID, location: Current_Location },
    });

    // Gère les messages des workers (mises à jour de statut et de localisation)
    worker.on("message", (msg) => {
      if (msg.type === "FLIGHT_STATUS" || msg.type === "IDLE_STATUS") {
        console.log(
          `📡 Avion #${msg.airplaneId}: ${msg.status || "Idle"} - 📍 ${
            msg.location
          }`
        );
      }
      if (msg.type === "FLIGHT_COMPLETED") {
        console.log(
          `✅ Vol #${msg.flightId} terminé par avion #${msg.airplaneId}`
        );
      }
      if (msg.type === "LOCATION_UPDATE") {
        console.log(
          `📍 Avion #${msg.airplaneId} est maintenant à ${msg.location}`
        );
      }
    });

    // Stocke le worker dans la Map
    airplaneWorkers.set(Airplane_ID, worker);
  });

  console.log(
    `🚀 ${airplanes.length} avions ont été initialisés avec des workers.`
  );
}

/***************************************************************
 * Contrôles de vitesse et pause/reprise
 ***************************************************************/
app.post("/api/set-speed", (req, res) => {
  const newSpeed = parseInt(req.query.value);
  if (newSpeed > 0 && newSpeed <= 60) {
    timeStep = newSpeed;
    res.json({ success: true, newSpeed });
  } else {
    res.status(400).json({ error: "Valeur invalide" });
  }
});

app.post("/api/toggle-pause", (req, res) => {
  isPaused = !isPaused;
  res.json({ success: true, isPaused });
});

/***************************************************************
 * Simulation du temps (tick)
 ***************************************************************/

// Dans cette version, on n'a pas forcément besoin de Worker Avion/Pilote
// On peut le faire, mais voici la base du code si vous n'utilisez pas encore les workers.
function tickSimulation() {
  if (!isPaused) {
    simulatedTime = new Date(simulatedTime.getTime() + timeStep * 60 * 1000);
    console.log(`🕒 Heure simulée mise à jour: ${simulatedTime.toISOString()}`);
    // Ici, on peut appeler planifierVols() et mettreAJourStatuts() si on a un code existant
  }
  setTimeout(tickSimulation, tickInterval);
}

/***************************************************************
 * Lancement
 ***************************************************************/
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🌍 Serveur orchestrateur sur http://localhost:${PORT}`);
  console.log("🔄 Démarrage de la simulation...");

  initializeAirplaneWorkers();
  tickSimulation();
});
