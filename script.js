async function updateData() {
  try {
    // Met à jour l'heure simulée
    const resTime = await fetch("/api/simulated-time");
    const timeData = await resTime.json();
    document.getElementById("simTime").innerText = new Date(
      timeData.simulatedTime
    ).toLocaleTimeString();

    // Met à jour la liste des vols
    await fetchFlights();

    // Met à jour la liste des avions
    await fetchAirplanes();
  } catch (err) {
    console.error("❌ Erreur lors de la récupération des données", err);
  }
}

async function fetchAirplanes() {
  try {
    const res = await fetch("/api/airplanes");
    const airplanes = await res.json();

    const airplanesTable = document
      .getElementById("airplanesTable")
      .querySelector("tbody");
    airplanesTable.innerHTML = airplanes
      .map(
        (airplane) => `
            <tr>
                <td>${airplane.airplaneId}</td>
                <td>${airplane.model}</td>
                <td>${airplane.capacity}</td>
                <td>${airplane.cruisingSpeed} km/h</td>
                <td>${airplane.location}</td>
                <td>${airplane.registration}</td>
                <td>${airplane.status}</td>
            </tr>
        `
      )
      .join("");
  } catch (err) {
    console.error("❌ Erreur lors de la récupération des avions", err);
  }
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
    // 🔹 Vérification et normalisation de la date et de l'heure
    const departureDateTimeStr = `${departureDate}T${departureTime}:00`;
    const departureDateTime = new Date(departureDateTimeStr);

    if (isNaN(departureDateTime.getTime())) {
      throw new Error(
        `Date ou heure de départ invalide : ${departureDateTimeStr}`
      );
    }

    // 🔹 Logs
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
      flightDistance,
      flightDuration,
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
  alert("Réinitialisation de la base non encore implémentée !");
}

setInterval(updateData, 5000);
updateData();
