// ==========================================
// SMARTFIRE GUARDIAN
// Firebase Realtime Database Dashboard
// ==========================================

const FIREBASE_URL =
  "https://smartfire-guardian-default-rtdb.firebaseio.com";

const FIREBASE_PATH = "/smartfire.json";


// ------------------------------------------
// GET ELEMENTS
// ------------------------------------------

const statusCard = document.getElementById("statusCard");
const statusIcon = document.getElementById("statusIcon");
const statusText = document.getElementById("statusText");
const statusMessage = document.getElementById("statusMessage");

const connection = document.getElementById("connection");

const deviceId = document.getElementById("deviceId");
const building = document.getElementById("building");
const floor = document.getElementById("floor");
const zone = document.getElementById("zone");

const gasStatus = document.getElementById("gasStatus");
const gasValue = document.getElementById("gasValue");
const gasIndicator = document.getElementById("gasIndicator");

const alarmStatus = document.getElementById("alarmStatus");
const alarmIndicator = document.getElementById("alarmIndicator");

const deviceStatus = document.getElementById("deviceStatus");
const lastUpdate = document.getElementById("lastUpdate");

const alertPanel = document.getElementById("alertPanel");
const alertMessage = document.getElementById("alertMessage");


// ------------------------------------------
// READ FIREBASE
// ------------------------------------------

async function readFirebase() {

  try {

    const response = await fetch(
      FIREBASE_URL + FIREBASE_PATH + "?t=" + Date.now()
    );

    if (!response.ok) {
      throw new Error("Firebase connection failed");
    }

    const data = await response.json();

    if (!data) {
      throw new Error("No data received");
    }

    connection.textContent = "● Firebase Connected";
    connection.className = "connection online";

    deviceStatus.textContent = "ONLINE";

    updateDashboard(data);

  } catch (error) {

    console.error(error);

    connection.textContent = "● Firebase Offline";
    connection.className = "connection offline";

    deviceStatus.textContent = "OFFLINE";
  }
}


// ------------------------------------------
// UPDATE DASHBOARD
// ------------------------------------------

function updateDashboard(data) {

  // DEVICE DETAILS

  deviceId.textContent =
    data.device_id || "SF-003";

  building.textContent =
    data.building || "ABC Apartments";

  floor.textContent =
    data.floor !== undefined
      ? data.floor
      : "3";

  zone.textContent =
    data.zone || "Room 302";


  // GAS / CO

  const gas = Number(data.gas || 0);

  if (gas === 1) {

    gasStatus.textContent = "DANGER";

    gasIndicator.className = "dot danger";

    gasValue.textContent =
      "CO/Gas hazard detected";

  } else {

    gasStatus.textContent = "NORMAL";

    gasIndicator.className = "dot normal";

    gasValue.textContent =
      "No CO/Gas hazard detected";
  }


  // ALARM

  const alarm =
    data.alarm === true ||
    data.alarm === 1;

  if (alarm) {

    alarmStatus.textContent = "ON";

    alarmIndicator.className = "dot danger";

  } else {

    alarmStatus.textContent = "OFF";

    alarmIndicator.className = "dot normal";
  }


  // OVERALL STATUS

  const danger =
    alarm || gas === 1 || data.status === "alert";

  if (danger) {

    statusCard.className = "status-card alert";

    statusIcon.textContent = "⚠";

    statusText.textContent = "ALERT";

    statusMessage.textContent =
      "CO/Gas hazard detected. Immediate attention required.";

    alertPanel.classList.remove("hidden");

    alertMessage.textContent =
      "CO/Gas hazard detected in " +
      (data.zone || "the monitored area") +
      ". Check the area immediately.";

  } else {

    statusCard.className = "status-card safe";

    statusIcon.textContent = "✓";

    statusText.textContent = "SAFE";

    statusMessage.textContent =
      "No CO/gas hazard detected";

    alertPanel.classList.add("hidden");
  }


  // LAST UPDATE

  lastUpdate.textContent =
    new Date().toLocaleString();
}


// ------------------------------------------
// START
// ------------------------------------------

readFirebase();


// Refresh every 2 seconds
setInterval(readFirebase, 2000);