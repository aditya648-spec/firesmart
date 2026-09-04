// ============================================================
// SmartFire Guardian - app.js
// ============================================================

import { db } from "./firebase-config.js";

import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// ============================================================
// CONFIGURATION
// ============================================================

const DEVICE_ID = "SF-003";

// Must match the ESP32 Firebase path:
// /devices/SF-003
const DATA_PATH = `devices/${DEVICE_ID}`;

// If no Firebase update is received for this long,
// show the ESP32 as offline.
const OFFLINE_THRESHOLD_SEC = 20;


// ============================================================
// HTML ELEMENT HELPER
// ============================================================

const el = (id) => document.getElementById(id);


// ============================================================
// LAST UPDATE
// ============================================================

let lastUpdatedMs = null;


// ============================================================
// FORMAT NUMBER
// ============================================================

function formatNumber(value, decimals = 2) {

  if (value === undefined || value === null) {
    return "—";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toFixed(decimals);
}


// ============================================================
// FORMAT RESISTANCE
// ============================================================

function formatResistance(ohms) {

  if (ohms === undefined || ohms === null) {
    return "—";
  }

  const value = Number(ohms);

  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} kΩ`;
  }

  return `${value.toFixed(1)} Ω`;
}


// ============================================================
// TIME FORMAT
// ============================================================

function formatAgo(seconds) {

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }

  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  return `${Math.floor(seconds / 86400)}d ago`;
}


// ============================================================
// SET SYSTEM STATUS
// ============================================================

function setSystemStatus(isFire) {

  const statusText = el("statusText");
  const statusValue = el("statusValue");
  const statusDot = el("statusDot");

  if (isFire) {

    statusText.textContent = "FIRE ALERT";

    statusValue.className =
      "status-value alert";

    statusDot.className =
      "status-indicator alert";

  } else {

    statusText.textContent = "SAFE";

    statusValue.className =
      "status-value safe";

    statusDot.className =
      "status-indicator safe";
  }
}


// ============================================================
// RENDER FIREBASE DATA
// ============================================================

function render(data) {

  // ----------------------------------------------------------
  // No data
  // ----------------------------------------------------------

  if (!data) {

    el("statusText").textContent = "NO DATA";

    el("statusValue").className =
      "status-value unknown";

    el("statusDot").className =
      "status-indicator unknown";

    el("location").textContent = "—";

    return;
  }


  // ==========================================================
  // DEVICE INFORMATION
  // ==========================================================

  el("deviceId").textContent =
    data.deviceId ?? DEVICE_ID;

  el("zone").textContent =
    data.zone ?? "—";

  el("building").textContent =
    data.building ?? "—";

  el("floor").textContent =
    data.floor ?? "—";


  // ==========================================================
  // LOCATION
  // ==========================================================

  const locationParts = [

    data.building,

    data.floor
      ? `Floor ${data.floor}`
      : null,

    data.zone

  ].filter(Boolean);


  el("location").textContent =
    locationParts.length
      ? locationParts.join(" · ")
      : "—";


  // ==========================================================
  // GET GAS DATA
  // ==========================================================

  const gasData =
    data.sensors?.gas ?? {};

  const gasRaw =
    gasData.raw ?? null;

  const gasThreshold =
    gasData.threshold ?? 1600;

  const gasAlert =
    gasData.alert === true;


  // ==========================================================
  // GET HEAT SENSOR DATA
  // ==========================================================

  const heatData =
    data.sensors?.heat ?? {};

  const heatRaw =
    heatData.rawADC ?? null;

  const heatVoltage =
    heatData.voltage ?? null;

  const heatResistance =
    heatData.resistance ?? null;

  const heatThreshold =
    heatData.fireThreshold ?? 10000;

  const heatAlert =
    heatData.alert === true;


  // ==========================================================
  // OVERALL FIRE STATUS
  // ==========================================================

  const fireAlert =
    data.fireAlert === true ||
    gasAlert ||
    heatAlert;


  // ==========================================================
  // SYSTEM STATUS
  // ==========================================================

  setSystemStatus(fireAlert);


  // ==========================================================
  // MQ-2 GAS READING
  // ==========================================================

  if (gasRaw !== null) {

    el("gas").textContent =
      `${gasRaw} / ${gasThreshold}`;

  } else {

    el("gas").textContent =
      "—";
  }


  el("gas").className =
    "v" + (gasAlert ? " warn" : "");


  // ==========================================================
  // MQ-2 SMOKE STATUS
  // ==========================================================
  //
  // The current ESP32 uses the MQ-2 as a combined
  // gas/smoke sensor.
  //
  // Therefore the dashboard displays the MQ-2 alert
  // state here.
  // ==========================================================

  if (gasRaw === null) {

    el("smoke").textContent =
      "—";

  } else if (gasAlert) {

    el("smoke").textContent =
      "DETECTED";

  } else {

    el("smoke").textContent =
      "NORMAL";
  }


  el("smoke").className =
    "v" + (gasAlert ? " warn" : "");


  // ==========================================================
  // HEAT / FLAME SENSOR
  // ==========================================================
  //
  // Current sensor logic:
  //
  // >= 10 kΩ = SAFE
  // <  10 kΩ = FIRE
  //
  // We display resistance rather than pretending it is
  // a temperature because the exact thermistor Beta/R25
  // values have not been confirmed.
  // ==========================================================

  if (heatResistance !== null) {

    el("flame").textContent =
      formatResistance(heatResistance);

  } else {

    el("flame").textContent =
      "—";
  }


  el("flame").className =
    "v" + (heatAlert ? " warn" : "");


  // ==========================================================
  // ALARM STATE
  // ==========================================================

  if (fireAlert) {

    el("alarm").textContent =
      "ACTIVE";

    el("alarm").className =
      "v warn";

  } else {

    el("alarm").textContent =
      "OFF";

    el("alarm").className =
      "v";
  }


  // ==========================================================
  // TEMPERATURE FIELD
  // ==========================================================
  //
  // We don't have confirmed thermistor calibration data,
  // so this field displays the resistance.
  // ==========================================================

  if (heatResistance !== null) {

    el("temperature").textContent =
      formatResistance(heatResistance);

    el("temperature").className =
      "v" + (heatAlert ? " warn" : "");

  } else {

    el("temperature").textContent =
      "NOT CONNECTED";

    el("temperature").className =
      "v dim";
  }


  // ==========================================================
  // SAVE UPDATE TIME
  // ==========================================================
  //
  // The ESP32 currently sends millis(), which is uptime,
  // NOT Unix time.
  //
  // Therefore we use the browser's Firebase reception time
  // for the ONLINE/OFFLINE display.
  // ==========================================================

  lastUpdatedMs =
    Date.now();

  tickClock();


  // ==========================================================
  // DEBUG INFORMATION
  // ==========================================================

  console.log(
    "SmartFire Guardian data:",
    data
  );

  console.log(
    "Gas:",
    gasRaw,
    "Alert:",
    gasAlert
  );

  console.log(
    "Heat ADC:",
    heatRaw,
    "Voltage:",
    heatVoltage,
    "Resistance:",
    heatResistance,
    "Threshold:",
    heatThreshold,
    "Alert:",
    heatAlert
  );

  console.log(
    "Overall Fire Alert:",
    fireAlert
  );
}


// ============================================================
// DEVICE ONLINE / OFFLINE
// ============================================================

function tickClock() {

  if (!lastUpdatedMs) {

    el("lastUpdate").textContent =
      "last update: —";

    el("deviceConn").textContent =
      "UNKNOWN";

    el("deviceConn").className =
      "v dim";

    return;
  }


  const seconds =
    Math.max(
      0,
      Math.floor(
        (Date.now() - lastUpdatedMs) / 1000
      )
    );


  // ----------------------------------------------------------
  // Last update text
  // ----------------------------------------------------------

  el("lastUpdate").textContent =
    `last update: ${formatAgo(seconds)}`;


  // ----------------------------------------------------------
  // Online / Offline
  // ----------------------------------------------------------

  const online =
    seconds <= OFFLINE_THRESHOLD_SEC;


  if (online) {

    el("deviceConn").textContent =
      "ONLINE";

    el("deviceConn").className =
      "v";

  } else {

    el("deviceConn").textContent =
      "OFFLINE";

    el("deviceConn").className =
      "v warn";
  }
}


// ============================================================
// UPDATE CLOCK EVERY SECOND
// ============================================================

setInterval(
  tickClock,
  1000
);


// ============================================================
// FIREBASE LIVE DEVICE DATA
// ============================================================

const deviceRef =
  ref(db, DATA_PATH);


onValue(

  deviceRef,

  (snapshot) => {

    console.log(
      "Firebase snapshot received:"
    );

    console.log(
      snapshot.val()
    );


    const data =
      snapshot.val();


    render(data);
  },


  (error) => {

    console.error(
      "Firebase database error:",
      error
    );


    el("statusText").textContent =
      "DATABASE ERROR";

    el("statusValue").className =
      "status-value unknown";

    el("statusDot").className =
      "status-indicator unknown";

    el("deviceConn").textContent =
      "DATABASE ERROR";

    el("deviceConn").className =
      "v warn";
  }
);


// ============================================================
// FIREBASE CONNECTION STATUS
// ============================================================

const connectionRef =
  ref(db, ".info/connected");


onValue(

  connectionRef,

  (snapshot) => {

    const connected =
      snapshot.val() === true;


    // --------------------------------------------------------
    // Text
    // --------------------------------------------------------

    el("fbStatus").textContent =
      connected
        ? "connected"
        : "disconnected";


    // --------------------------------------------------------
    // Dot
    // --------------------------------------------------------

    el("fbDot").className =
      "dot " +
      (connected ? "on" : "off");
  },


  (error) => {

    console.error(
      "Firebase connection error:",
      error
    );

    el("fbStatus").textContent =
      "error";

    el("fbDot").className =
      "dot off";
  }
);
