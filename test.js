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
    airplaneStatus.set(airplane.Airplane_ID, airplane.Status || "IDLE");
  });

  console.log(`🚀 ${airplanes.length} avions initialisés.`);
}

/***************************************************************
 * API Express - Routes
 ***************************************************************/

// Route pour récupérer les données des avions

// Route pour récupérer les données des avions
app.get("/api/airplanes", async (req, res) => {
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

    console.log("💬 /api/airplanes exécutée");

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
 * Lancement du Serveur et simulation
 ***************************************************************/
const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`🌍 Orchestrateur en écoute sur http://localhost:${PORT}`);
  await initializeAirplaneWorkers();
});
