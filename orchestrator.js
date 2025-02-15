/***************************************************************
 * orchestrator.js - Gestion de la simulation de vols aériens
 ***************************************************************/

const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

/***************************************************************
 * 🔧 Configuration
 ***************************************************************/
const dbConfig = {
  host: "localhost",
  user: "admin",
  password: "admin",
  database: "airline_DB_V3",
};

const SIM_INTERVAL = 10000; // Simulation toutes les 10 secondes
let timeStep = 10; // Avancer de 10 minutes par tick
const PORT = 3000;
let isPaused = false;

// Heure simulée initiale
let simulatedTime = new Date("2025-02-15T07:00:00");

// Seuils en minutes
const BOARDING_THRESHOLD = 20; // Temps avant le départ pour passer en "Boarding"
const APPROACHING_THRESHOLD = 15; // Temps restant avant l'arrivée pour passer en "Approaching"
const DEBOARDING_THRESHOLD = 15; // Temps après l'arrivée pendant lequel le vol reste en "Deboarding"

const app = express();

// Sert les fichiers statiques (HTML, CSS, JS, etc.)
app.use(express.static(path.join(__dirname)));

/***************************************************************
 * 📌 API: Consultation des vols
 ***************************************************************/
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
        TIME_FORMAT(f.Arrival_Time, '%H:%i')   AS Arrival_Time, 
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

/***************************************************************
 * 📌 API: Récupération de l'heure simulée
 ***************************************************************/
app.get("/api/simulated-time", (req, res) => {
  res.json({
    simulatedTime: simulatedTime.toISOString().slice(0, 19).replace("T", " "),
  });
});

/***************************************************************
 * 📌 API: Status des avions
 ***************************************************************/
app.get("/api/airplanes-status", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    // Convertir simulatedTime en format MySQL : "YYYY-MM-DD HH:MM:SS"
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
              SELECT 1 FROM Flights f2
              WHERE (f2.CDB = e.Employee_ID OR f2.OPL = e.Employee_ID)
                AND f2.Status IN ('On-Time','Boarding','In-Flight','Approaching','Deboarding')
            )
        ) AS Available_Pilots
      FROM Airplanes a
      JOIN Airports ap ON a.Current_Location = ap.Airport_ID;
    `,
      [simTimeStr, simTimeStr]
    );
    await conn.end();
    res.json(rows);
  } catch (err) {
    console.error("❌ Erreur dans /api/airplanes-status:", err);
    res.status(500).send("Erreur serveur");
  }
});

/***************************************************************
 * 📌 API: Dashboard Stats
 ***************************************************************/
app.get("/api/dashboard-stats", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [availablePlanes] = await conn.execute(`
      SELECT COUNT(*) AS count
      FROM Airplanes A
      WHERE NOT EXISTS (
        SELECT 1 
        FROM Flights F 
        WHERE F.Airplane_ID = A.Airplane_ID 
          AND F.Status IN ('On-Time', 'Boarding', 'In-Flight', 'Approaching', 'Deboarding')
      )
    `);
    const [engagedPlanes] = await conn.execute(`
      SELECT COUNT(DISTINCT Airplane_ID) AS count
      FROM Flights
      WHERE Status IN ('On-Time', 'Boarding', 'In-Flight', 'Approaching', 'Deboarding')
    `);
    const [availablePilots] = await conn.execute(`
      SELECT COUNT(*) AS count
      FROM Employees E
      WHERE E.Role = 'Pilot'
      AND NOT EXISTS (
        SELECT 1 
        FROM Flights F 
        WHERE (F.CDB = E.Employee_ID OR F.OPL = E.Employee_ID)
          AND F.Status IN ('On-Time', 'Boarding', 'In-Flight', 'Approaching', 'Deboarding')
      )
    `);
    const [engagedPilots] = await conn.execute(`
      SELECT COUNT(DISTINCT Employee_ID) AS count
      FROM (
        SELECT CDB AS Employee_ID FROM Flights WHERE Status IN ('On-Time', 'Boarding', 'In-Flight', 'Approaching', 'Deboarding')
        UNION
        SELECT OPL AS Employee_ID FROM Flights WHERE Status IN ('On-Time', 'Boarding', 'In-Flight', 'Approaching', 'Deboarding')
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
    console.error("❌ Erreur dans /api/dashboard-stats:", err);
    res.status(500).send("Erreur serveur");
  }
});

/***************************************************************
 * 🚀 PLANIFICATION DES VOLS (enchaînés, 1 avion par tick)
 ***************************************************************/
async function planifierVols() {
  if (isPaused) return;
  try {
    const conn = await mysql.createConnection(dbConfig);
    console.log("🔄 Tentative de planification pour 1 avion...");
    const [availablePlane] = await conn.execute(`
      SELECT A.Airplane_ID, A.Current_Location
      FROM Airplanes A
      WHERE NOT EXISTS (
        SELECT 1 
        FROM Flights F 
        WHERE F.Airplane_ID = A.Airplane_ID 
          AND F.Status IN ('On-Time', 'Boarding', 'In-Flight', 'Approaching', 'Deboarding')
      )
      ORDER BY RAND()
      LIMIT 1
    `);
    if (availablePlane.length === 0) {
      await conn.end();
      console.log("Aucun avion libre à planifier pour le moment.");
      return;
    }
    const plane = availablePlane[0];
    const airplaneId = plane.Airplane_ID;
    console.log(
      `Avion sélectionné : ID ${airplaneId}, localisation initiale : ${plane.Current_Location}`
    );
    const [lastFlight] = await conn.execute(
      `
      SELECT Arrival_Airport_ID, Arrival_Time
      FROM Flights
      WHERE Airplane_ID = ?
      ORDER BY Arrival_Time DESC
      LIMIT 1
    `,
      [airplaneId]
    );
    let departureAirportId;
    let departureTime;
    if (lastFlight.length === 0) {
      departureAirportId = plane.Current_Location;
      const randomDelay = Math.floor(Math.random() * 91) + 30; // 30 à 120 min
      departureTime = new Date(simulatedTime.getTime() + randomDelay * 60000);
      console.log(
        `Avion ${airplaneId} vierge, randomDelay = ${randomDelay} min, départ prévu à ${departureTime.toISOString()}`
      );
    } else {
      const { Arrival_Airport_ID, Arrival_Time } = lastFlight[0];
      departureAirportId = Arrival_Airport_ID;
      const arrivalDate = new Date(Arrival_Time);
      const baseTime =
        arrivalDate > simulatedTime ? arrivalDate : simulatedTime;
      const randomTurnaround = Math.floor(Math.random() * 31) + 30; // 30 à 60 min
      departureTime = new Date(baseTime.getTime() + randomTurnaround * 60000);
      console.log(
        `Avion ${airplaneId} déjà utilisé, randomTurnaround = ${randomTurnaround} min, départ prévu à ${departureTime.toISOString()}`
      );
    }
    const [dest] = await conn.execute(
      `
      SELECT Airport_ID
      FROM Airports
      WHERE Airport_ID <> ?
      ORDER BY RAND()
      LIMIT 1
    `,
      [departureAirportId]
    );
    if (dest.length === 0) {
      console.log(`🚨 Aucune destination trouvée pour avion ${airplaneId}`);
      await conn.end();
      return;
    }
    const arrivalAirportId = dest[0].Airport_ID;
    const flightDuration = Math.floor(Math.random() * 121) + 60; // 60 à 180 min
    const arrivalTime = new Date(
      departureTime.getTime() + flightDuration * 60000
    );
    console.log(
      `Durée du vol = ${flightDuration} min, arrivée prévue à ${arrivalTime.toISOString()}`
    );
    const [crew] = await conn.execute(
      `
      SELECT E1.Employee_ID AS CDB, E2.Employee_ID AS OPL
      FROM Employees E1
      JOIN Employees E2 ON E1.Location = E2.Location AND E1.Employee_ID <> E2.Employee_ID
      WHERE E1.Role = 'Pilot'
        AND E2.Role = 'Pilot'
        AND E1.Location = ?
        AND NOT EXISTS (
          SELECT 1
          FROM Flights F
          WHERE (F.CDB = E1.Employee_ID OR F.OPL = E2.Employee_ID)
            AND F.Status IN ('On-Time', 'Boarding', 'In-Flight', 'Approaching', 'Deboarding')
        )
      ORDER BY RAND()
      LIMIT 1
    `,
      [departureAirportId]
    );
    if (crew.length === 0) {
      console.log(`🚨 Aucun équipage disponible pour avion ${airplaneId}`);
      await conn.end();
      return;
    }
    try {
      await conn.execute(
        `
        INSERT INTO Flights (
          Flight_Number, Departure_Airport_ID, Arrival_Airport_ID,
          Departure_Time, Arrival_Time, Airplane_ID, CDB, OPL, Status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'On-Time')
      `,
        [
          `FL${Math.floor(Math.random() * 10000)}`,
          departureAirportId,
          arrivalAirportId,
          departureTime,
          arrivalTime,
          airplaneId,
          crew[0].CDB,
          crew[0].OPL,
        ]
      );
      console.log(`✅ Nouveau vol planifié pour avion ${airplaneId}`);
    } catch (err) {
      console.error("❌ Erreur lors de l'insertion du vol:", err);
    }
    await conn.end();
  } catch (err) {
    console.error("❌ Erreur dans planifierVols:", err);
  }
}

/***************************************************************
 * 🚀 MISE À JOUR DES STATUTS DES VOLS
 ***************************************************************/
async function mettreAJourStatutDesVols() {
  if (isPaused) return;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [flights] = await conn.execute(`
      SELECT Flight_ID, Departure_Time, Arrival_Time, Status
      FROM Flights
      WHERE Status NOT IN ('Completed', 'Canceled')
    `);
    for (const flight of flights) {
      const dep = new Date(flight.Departure_Time);
      const arr = new Date(flight.Arrival_Time);
      let newStatus = flight.Status;

      // Log pour debug
      console.log(
        `Vol #${
          flight.Flight_ID
        } : dep=${dep.toISOString()}, arr=${arr.toISOString()}, now=${simulatedTime.toISOString()}`
      );

      if (simulatedTime < dep) {
        // Avant le départ
        const diffBeforeDeparture = (dep - simulatedTime) / 60000;
        newStatus =
          diffBeforeDeparture <= BOARDING_THRESHOLD ? "Boarding" : "On-Time";
      } else if (simulatedTime >= dep && simulatedTime < arr) {
        // Pendant le vol
        const diffBeforeArrival = (arr - simulatedTime) / 60000;
        newStatus =
          diffBeforeArrival <= APPROACHING_THRESHOLD
            ? "Approaching"
            : "In-Flight";
      } else {
        // Après l'arrivée
        const diffAfterArrival = (simulatedTime - arr) / 60000;
        newStatus =
          diffAfterArrival <= DEBOARDING_THRESHOLD ? "Deboarding" : "Completed";
      }

      if (newStatus !== flight.Status) {
        await conn.execute(
          `UPDATE Flights SET Status = ? WHERE Flight_ID = ?`,
          [newStatus, flight.Flight_ID]
        );
        console.log(
          `Vol #${flight.Flight_ID}: ${flight.Status} => ${newStatus}`
        );
      }
    }
    await conn.end();
  } catch (err) {
    console.error("❌ Erreur dans mettreAJourStatutDesVols:", err);
  }
}

/***************************************************************
 * 📌 API: Modifier la vitesse et pause/reprise
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
 * ⏳ Boucle de simulation
 ***************************************************************/
setInterval(async () => {
  if (!isPaused) {
    await planifierVols();
    await mettreAJourStatutDesVols();
    simulatedTime.setMinutes(simulatedTime.getMinutes() + timeStep);
    console.log(`🕒 Heure simulée mise à jour : ${simulatedTime}`);
  } else {
    console.log("⏸️ Simulation en pause...");
  }
}, SIM_INTERVAL);

/***************************************************************
 * 🌍 Démarrage du serveur
 ***************************************************************/
app.listen(PORT, () => {
  console.log(`🌍 Serveur en ligne sur http://localhost:${PORT}`);
  console.log(`🔄 Mise à jour toutes les ${SIM_INTERVAL / 1000} secondes`);
});
