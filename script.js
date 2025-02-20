async function updateData() {
  try {
    // Met à jour l'heure simulée
    const resTime = await fetch("/api/simulated-time");
    const timeData = await resTime.json();
    document.getElementById("simTime").innerText = new Date(
      timeData.simulatedTime
    ).toLocaleTimeString();

    // Met à jour les vols et les avions
    await fetchFlights();
    await fetchAirplanes();
  } catch (err) {
    console.error("❌ Erreur lors de la récupération des données", err);
  }
}

async function fetchAirplanes() {
  try {
    const res = await fetch("/api/airplanes");
    const airplanes = await res.json();

    // Nettoyage des colonnes avant de les remplir
    const columns = {
      IDLE: document.getElementById("idle"),
      Scheduled: document.getElementById("scheduled"),
      "In-Flight": document.getElementById("in-flight"),
      "On-Ground": document.getElementById("on-ground"),
    };

    // Réinitialiser les colonnes en conservant le titre
    Object.values(columns).forEach((column) => {
      column.innerHTML = column.querySelector("h2").outerHTML;
    });

    airplanes.forEach((airplane) => {
      const div = document.createElement("div");
      div.className = "airplane";
      div.textContent = `✈️ ${airplane.registration} (${airplane.model})`;
      div.onclick = () => showFlightDetails(airplane);

      if (columns[airplane.status]) {
        columns[airplane.status].appendChild(div);
      }
    });
  } catch (err) {
    console.error("❌ Erreur lors de la récupération des avions", err);
  }
}

async function fetchFlights() {
  try {
    const res = await fetch("/api/flights");
    const flights = await res.json();

    const flightsTable = document
      .getElementById("flightsTable")
      .querySelector("tbody");
    flightsTable.innerHTML = flights
      .map(
        (flight) => `
            <tr>
                <td>${flight.Flight_ID}</td>
                <td>${flight.Flight_Number}</td>
                <td>${flight.Departure_Airport_ID}</td>
                <td>${flight.Arrival_Airport_ID}</td>
                <td>${flight.Status}</td>
            </tr>
        `
      )
      .join("");
  } catch (err) {
    console.error("❌ Erreur lors de la récupération des vols", err);
  }
}

function showFlightDetails(airplane) {
  document.getElementById("planeInfo").textContent = airplane.registration;
  document.getElementById("flightId").textContent =
    airplane.flightId || "Aucun";
  document.getElementById("departure").textContent = airplane.departure || "-";
  document.getElementById("arrival").textContent = airplane.arrival || "-";
  document.getElementById("flightStatus").textContent = airplane.status;

  document.getElementById("flightDetails").classList.add("active");
}

async function fetchAirports() {
  try {
    const res = await fetch("/api/airports");
    const airports = await res.json();
    const departureSelect = document.getElementById("departureAirport");
    const arrivalSelect = document.getElementById("arrivalAirport");

    departureSelect.innerHTML = airports
      .map(
        (a) =>
          `<option value="${a.Airport_ID}">${a.Name} (${a.OACI_Code})</option>`
      )
      .join("");
    arrivalSelect.innerHTML = departureSelect.innerHTML;
  } catch (err) {
    console.error("Erreur lors de la récupération des aéroports", err);
  }
}

async function calculateFlightDetails() {
  const departureAirport = document.getElementById("departureAirport").value;
  const arrivalAirport = document.getElementById("arrivalAirport").value;
  const departureDate = document.getElementById("departureDate").value;
  const departureTime = document.getElementById("departureTime").value;

  if (
    !departureAirport ||
    !arrivalAirport ||
    !departureDate ||
    !departureTime
  ) {
    alert("Veuillez remplir tous les champs.");
    return;
  }

  try {
    const departureDateTimeStr = `${departureDate}T${departureTime}:00`;
    const departureDateTime = new Date(departureDateTimeStr);

    if (isNaN(departureDateTime.getTime())) {
      throw new Error(
        `Date ou heure de départ invalide : ${departureDateTimeStr}`
      );
    }

    console.log("✈️ Détails du vol planifié :");
    console.log(
      `🛫 Départ prévu : ${departureDateTime
        .toISOString()
        .replace("T", " ")
        .substring(0, 19)}`
    );
    console.log(`📍 Aéroport de départ ID : ${departureAirport}`);
    console.log(`📍 Aéroport d'arrivée ID : ${arrivalAirport}`);
  } catch (err) {
    console.error("❌ Erreur lors du calcul des détails du vol :", err);
    alert("Une erreur est survenue lors du calcul des détails du vol.");
  }
}

function openFlightModal() {
  fetchAirports();
  document.getElementById("flightModal").style.display = "block";
}

function closeFlightModal() {
  document.getElementById("flightModal").style.display = "none";
}

async function scheduleFlight() {
  const departureAirport = document.getElementById("departureAirport").value;
  const arrivalAirport = document.getElementById("arrivalAirport").value;
  const departureDate = document.getElementById("departureDate").value;
  const departureTime = document.getElementById("departureTime").value;
  const arrivalTime = document.getElementById("arrivalTime").innerText;

  if (
    !departureAirport ||
    !arrivalAirport ||
    !departureDate ||
    !departureTime
  ) {
    alert("Veuillez remplir tous les champs.");
    return;
  }

  try {
    console.log("Données envoyées à l'API :", {
      departureAirport,
      arrivalAirport,
      departureTime: `${departureDate} ${departureTime}`,
      arrivalTime,
    });

    const res = await fetch("/api/schedule-flight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        departureAirport,
        arrivalAirport,
        departureTime: `${departureDate}T${departureTime}:00`,
        arrivalTime,
      }),
    });

    if (res.ok) {
      alert("Vol planifié avec succès !");
      closeFlightModal();
    } else {
      alert("Erreur lors de la planification du vol.");
    }
  } catch (err) {
    console.error("Erreur lors de la planification du vol", err);
  }
}

async function resetDatabase() {
  try {
    const statusText = document.getElementById("status");
    statusText.textContent = "⏳ Réinitialisation en cours...";

    const res = await fetch("/api/reset-db", { method: "POST" });
    const data = await res.json();
    statusText.textContent = `✅ ${data.message}`;

    fetchAirplanes();
  } catch (error) {
    document.getElementById("status").textContent =
      "❌ Erreur lors de la réinitialisation.";
    console.error("Erreur :", error);
  }
}

setInterval(updateData, 5000);
updateData();
