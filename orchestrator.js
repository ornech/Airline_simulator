const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const { Worker } = require("worker_threads");
const airplaneData = new Map();

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
let simulatedTime = Date.now(); // new Date("2025-02-15T07:00:00");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
    // Stocke les infos des avions dans airplaneData pour l'orchestreur
    airplaneData.set(airplane.Airplane_ID, {
      airplaneId: airplane.Airplane_ID,
      model: airplane.Model,
      capacity: airplane.Capacity,
      cruisingSpeed: airplane.Cruising_Speed,
      location: airplane.Current_Location,
      registration: airplane.Registration,
      status: airplane.Status || "IDLE",
    });

    console.log(
      `👷 Initialisation du worker pour l'avion #${airplane.Airplane_ID}:`,
      airplaneData.get(airplane.Airplane_ID)
    );

    // Initialise le worker
    const worker = new Worker("./workerAirplane.js", {
      workerData: airplaneData.get(airplane.Airplane_ID),
    });

    airplaneWorkers.set(airplane.Airplane_ID, worker);
  });

  console.log(`🚀 ${airplanes.length} avions initialisés.`);
}

/***************************************************************
 * Simulation du temps
 ***************************************************************/
async function tickSimulation() {
  simulatedTime += timeStep * 60 * 1000; // Ajoute `timeStep` minutes en millisecondes
  console.log(
    `🕒 Heure simulée mise à jour: ${new Date(simulatedTime).toISOString()}`
  );

  await processPendingFlights();
  setTimeout(tickSimulation, tickInterval);
}

/***************************************************************
 * Vérifie et assigne les vols en attente
 ***************************************************************/
async function processPendingFlights1111() {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [flights] = await conn.execute(
      `SELECT Flight_ID, Flight_Number, Departure_Airport_ID, Arrival_Airport_ID, Departure_Time, Arrival_Time, CDB, OPL
       FROM Flights WHERE Airplane_ID IS NULL AND Status = 'Scheduled' ORDER BY Departure_Time ASC`
    );
    await conn.end();
  } catch (err) {
    console.error("❌ Erreur lors de la gestion des vols en attente", err);
  }
}

/***************************************************************
 * Envoie d'une demande de vol à un avion IDLE et situé à l’aéroport de départ
 ***************************************************************/
function assignFlightToWorker(airplaneId, flightId) {
  const worker = airplaneWorkers.get(airplaneId);
  if (!worker) {
    console.error(`❌ Aucun worker trouvé pour l'avion #${airplaneId}`);
    return;
  }

  console.log(
    `📢 Envoi de la mission au worker de l'avion #${airplaneId} pour le vol #${flightId}`
  );

  // Envoie un message au worker pour qu'il prenne en charge le vol
  worker.postMessage({ type: "START_FLIGHT", flightId });
}

/***************************************************************
 * appel à findAvailableAirplane pour chaque vol en attente.
 ***************************************************************/
async function processPendingFlights() {
  try {
    const conn = await mysql.createConnection(dbConfig);

    // Récupérer les vols qui n'ont pas encore d'avion assigné
    const [flights] = await conn.execute(
      `SELECT Flight_ID, Departure_Airport_ID 
       FROM Flights 
       WHERE Airplane_ID IS NULL 
       AND Status = 'Pending' 
       ORDER BY Departure_Time ASC`
    );

    await conn.end();

    for (const flight of flights) {
      console.log(
        `🔍 Tentative d'assignation d'un avion au vol #${flight.Flight_ID}`
      );
      await findAvailableAirplane(
        flight.Flight_ID,
        flight.Departure_Airport_ID
      );
    }
  } catch (err) {
    console.error("❌ Erreur lors de la gestion des vols en attente", err);
  }
}

/***************************************************************
 * Recherche un avion IDLE et situé à l’aéroport de départ
 ***************************************************************/
async function findAvailableAirplane(flightId, departureAirport) {
  for (const [airplaneId, airplane] of airplaneData) {
    if (airplane.status === "IDLE" && airplane.location === departureAirport) {
      console.log(
        `✅ Avion #${airplaneId} disponible pour le vol #${flightId}`
      );

      // Envoyer un message au worker pour lui affecter le vol
      assignFlightToWorker(airplaneId, flightId);
      return;
    }
  }

  console.log(`⚠️ Aucun avion disponible pour le vol #${flightId}`);
}

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
 * Réinitialisation de la base de données
 ***************************************************************/
async function resetDatabase() {
  try {
    const conn = await mysql.createConnection(dbConfig);

    console.log("[Orchestrator] 🔄 Réinitialisation de la base de données...");

    // Suppression des vols
    await conn.execute("DELETE FROM Flight_Status_Log");
    await conn.execute("DELETE FROM Flights");

    // Réinitialisation des avions
    await conn.execute("UPDATE Airplanes SET Status = 'IDLE'");

    await conn.end();

    console.log("[Orchestrator] ✅ Base de données réinitialisée !");
  } catch (err) {
    console.error(
      "[Orchestrator] ❌ Erreur lors de la réinitialisation de la DB",
      err
    );
  }
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
 * API Express - Routes
 ***************************************************************/

app.get("/api/simulated-time", (req, res) => {
  res.json({ simulatedTime: new Date(simulatedTime).toISOString() });
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

/* app.get("/api/get-flight-distance", async (req, res) => {
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
}); */

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
  const flightNumber = `FL${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute(
      `INSERT INTO Flights (Flight_Number, Departure_Airport_ID, Arrival_Airport_ID, Departure_Time, Status, Priority) 
       VALUES (?, ?, ?, ?, 'Pending', 0)`,
      [flightNumber, departureAirport, arrivalAirport, departureTime]
    );
    await conn.end();
    console.log(
      `✈️ Vol ${flightNumber} Pending 🕒:${departureTime} 🛫 ${departureAirport} -> 🛬${arrivalAirport}`
    );

    res.json({ message: "✈️ Vol planifié avec succès !" });
  } catch (err) {
    console.error("❌ Erreur planification du vol", err);
    res.status(500).json({ error: "Erreur planification du vol." });
  }
});

app.get("/api/airplanes", async (req, res) => {
  // Dédiée à l'intérogation des état des avions
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [airplanes] = await conn.execute(
      "SELECT Airplane_ID, Model, Capacity, Cruising_Speed, Current_Location, Registration, Status FROM Airplanes"
    );
    await conn.end();

    // Réinitialiser airplaneData avant de le remplir à nouveau
    airplaneData.clear();

    // Remplir airplaneData avec les informations des avions
    airplanes.forEach((airplane) => {
      airplaneData.set(airplane.Airplane_ID, {
        airplaneId: airplane.Airplane_ID,
        model: airplane.Model,
        capacity: airplane.Capacity,
        cruisingSpeed: airplane.Cruising_Speed,
        location: airplane.Current_Location,
        registration: airplane.Registration,
        status: airplane.Status || "IDLE", // Statut par défaut
      });
    });

    // Construction de la réponse avec les données mises à jour
    const response = Array.from(airplaneData.values()).map((airplane) => ({
      airplaneId: airplane.airplaneId,
      model: airplane.model,
      capacity: airplane.capacity,
      cruisingSpeed: airplane.cruisingSpeed,
      location: airplane.location,
      registration: airplane.registration,
      status: airplane.status,
    }));

    // Envoi de la réponse au client
    res.json(response);
  } catch (err) {
    console.error("❌ Erreur lors de la récupération des avions :", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des avions." });
  }
});

// Route pour récupérer les détails d'un avion en particulier
app.get("/api/airplane/:id", (req, res) => {
  const airplaneId = parseInt(req.params.id, 10);

  if (!airplaneData.has(airplaneId)) {
    return res.status(404).json({ error: "Avion non trouvé" });
  }

  const airplaneInfo = airplaneData.get(airplaneId);
  const worker = airplaneWorkers.get(airplaneId);
  const status = airplaneStatus.get(airplaneId) || "UNKNOWN";

  res.json({
    ...airplaneInfo,
    status: status, // Récupère le dernier statut connu
  });
});

// ERoute qui modifie un avion et met à jour airplaneData
app.post("/api/airplane/update/:id", async (req, res) => {
  const airplaneId = parseInt(req.params.id, 10);
  const columnName = Object.keys(req.body)[0]; // Récupère la première clé (colonne)
  const value = req.body[columnName]; // Récupère la valeur associée à la colonne
  let query = `UPDATE Airplanes SET ${columnName} = "${value}" WHERE Airplane_ID = ${airplaneId}`;

  try {
    const conn = await mysql.createConnection(dbConfig);
    // Met à jour le statut de l'avion dans la base de données
    // const query = `UPDATE Airplanes SET ${columnName} = ? WHERE Airplane_ID = ?`;
    await conn.execute(query, [value, airplaneId]);

    await conn.end();

    // Met à jour airplaneData avec les nouvelles informations
    if (airplaneData.has(airplaneId)) {
      const airplaneInfo = airplaneData.get(airplaneId);
      airplaneData.set(airplaneId, {
        ...airplaneInfo,
        status: status || "IDLE",
      });
    }

    res.json({ message: "Statut mis à jour avec succès" });
  } catch (err) {
    console.error("❌ Erreur lors de la mise à jour de l'avion :", err);
    console.error("[SQL] :", query);
    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour de l'avion." });
  }
});

/***************************************************************
 * RESET DATABASE
 ***************************************************************/
app.post("/api/reset-db", async (req, res) => {
  await resetDatabase();
  res.json({ message: "Base de données réinitialisée avec succès !" });
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
