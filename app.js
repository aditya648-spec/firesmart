import { db } from "./firebase-config.js";

import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// =====================================================
// CONFIGURATION
// =====================================================

const DEVICE_ID = "SF-003";

const DATA_PATH = `devices/${DEVICE_ID}`;

const GAS_THRESHOLD = 1600;

const HEAT_THRESHOLD = 5000;

const OFFLINE_THRESHOLD_SEC = 20;


// =====================================================
// HTML ELEMENTS
// =====================================================

const el = {

  // Top
  deviceTopDot: document.getElementById("deviceTopDot"),
  deviceTopStatus: document.getElementById("deviceTopStatus"),

  // Location
  location: document.getElementById("location"),
  deviceId: document.getElementById("deviceId"),
  zone: document.getElementById("zone"),
  building: document.getElementById("building"),
  floor: document.getElementById("floor"),

  floorInfo: document.getElementById("floorInfo"),
  zoneInfo: document.getElementById("zoneInfo"),

  // Main status
  mainStatusCard: document.getElementById("mainStatusCard"),
  mainStatus: document.getElementById("mainStatus"),
  statusDescription: document.getElementById("statusDescription"),
  statusDot: document.getElementById("statusDot"),

  // Sensors
  heatCard: document.getElementById("heatCard"),
  gasCard: document.getElementById("gasCard"),

  flame: document.getElementById("flame"),
  gas: document.getElementById("gas"),

  heatState: document.getElementById("heatState"),
  gasState: document.getElementById("gasState"),

  // Sequence
  stepHeat: document.getElementById("stepHeat"),
  stepHeatStatus: document.getElementById("stepHeatStatus"),

  stepSmoke: document.getElementById("stepSmoke"),
  stepSmokeStatus: document.getElementById("stepSmokeStatus"),

  stepFire: document.getElementById("stepFire"),
  stepFireStatus: document.getElementById("stepFireStatus"),

  // Alarm
  alarm: document.getElementById("alarm"),

  // Connection
  fbDot: document.getElementById("fbDot"),
  fbStatus: document.getElementById("fbStatus"),

  // Last update
  lastUpdate: document.getElementById("lastUpdate"),

  // Popup
  firePopup: document.getElementById("firePopup"),
  popupBuilding: document.getElementById("popupBuilding"),
  popupFloor: document.getElementById("popupFloor"),
  popupZone: document.getElementById("popupZone"),
  acknowledgeFire: document.getElementById("acknowledgeFire")

};


// =====================================================
// CURRENT STATE
// =====================================================

let latestData = null;

let lastFirebaseUpdateTime = 0;

let popupAcknowledged = false;


// =====================================================
// HELPER FUNCTIONS
// =====================================================

function numberValue(value, fallback = 0) {

  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;

}


function textValue(value, fallback = "--") {

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value);

}


function formatTime(date) {

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

}


// =====================================================
// FIRE POPUP
// =====================================================

function showFirePopup(data) {

  if (!el.firePopup) return;

  const building =
    textValue(data.building, "ABC Apartments");

  const floor =
    textValue(data.floor, "3");

  const zone =
    textValue(data.zone, "Room 302");


  el.popupBuilding.textContent = building;

  el.popupFloor.textContent = floor;

  el.popupZone.textContent = zone;


  el.firePopup.classList.remove("hidden");


  popupAcknowledged = false;

}


function hideFirePopup() {

  if (!el.firePopup) return;

  el.firePopup.classList.add("hidden");

}


// =====================================================
// FIRE POPUP BUTTON
// =====================================================

if (el.acknowledgeFire) {

  el.acknowledgeFire.addEventListener("click", () => {

    popupAcknowledged = true;

    hideFirePopup();

  });

}


// =====================================================
// UPDATE ONLINE STATUS
// =====================================================

function updateOnlineStatus() {

  if (!lastFirebaseUpdateTime) {

    el.deviceTopDot.className = "status-dot";

    el.deviceTopStatus.textContent = "Waiting...";

    return;

  }


  const ageSeconds =
    (Date.now() - lastFirebaseUpdateTime) / 1000;


  if (ageSeconds <= OFFLINE_THRESHOLD_SEC) {

    el.deviceTopDot.className = "status-dot online";

    el.deviceTopStatus.textContent = "Device Online";

  } else {

    el.deviceTopDot.className = "status-dot offline";

    el.deviceTopStatus.textContent = "Device Offline";

  }

}


// =====================================================
// UPDATE MAIN STATUS
// =====================================================

function updateMainStatus(status, heatDetected, fireAlert) {

  el.mainStatusCard.classList.remove(
    "safe",
    "heat",
    "alert"
  );


  if (fireAlert || status === "FIRE") {

    el.mainStatusCard.classList.add("alert");

    el.mainStatus.textContent = "FIRE ALERT";

    el.statusDescription.textContent =
      "Heat and smoke have been confirmed.";

    el.statusDot.className =
      "large-status-dot";

    el.alarm.textContent = "ACTIVE";

    return;

  }


  if (heatDetected || status === "HEAT DETECTED") {

    el.mainStatusCard.classList.add("heat");

    el.mainStatus.textContent =
      "HEAT DETECTED";

    el.statusDescription.textContent =
      "Heat detected. Checking smoke/gas sensor.";

    el.statusDot.className =
      "large-status-dot";

    el.alarm.textContent = "STANDBY";

    return;

  }


  el.mainStatusCard.classList.add("safe");

  el.mainStatus.textContent = "SAFE";

  el.statusDescription.textContent =
    "No fire detected. System is monitoring.";

  el.statusDot.className =
    "large-status-dot";

  el.alarm.textContent = "OFF";

}


// =====================================================
// UPDATE HEAT SENSOR
// =====================================================

function updateHeatSensor(heatResistance, heatThreshold, heatDetected) {

  if (heatResistance > 0) {

    el.flame.textContent =
      (heatResistance / 1000).toFixed(2);

  } else {

    el.flame.textContent = "--";

  }


  el.heatCard.classList.remove(
    "warn",
    "alert"
  );


  if (heatDetected) {

    el.heatCard.classList.add("warn");

    el.heatState.textContent =
      "HEAT DETECTED";

  } else {

    el.heatState.textContent =
      "NORMAL";

  }

}


// =====================================================
// UPDATE MQ2 SENSOR
// =====================================================

function updateGasSensor(
  gasRaw,
  heatDetected,
  smokeDetected
) {

  el.gas.textContent =
    Math.round(gasRaw);


  el.gasCard.classList.remove(
    "warn",
    "alert"
  );


  /*
   * IMPORTANT:
   *
   * Smoke is only considered when heat
   * has already been detected.
   */

  if (!heatDetected) {

    el.gasState.textContent =
      "NOT CHECKED";

    return;

  }


  if (smokeDetected) {

    el.gasCard.classList.add("alert");

    el.gasState.textContent =
      "SMOKE DETECTED";

  } else {

    el.gasState.textContent =
      "NORMAL";

  }

}


// =====================================================
// UPDATE DETECTION SEQUENCE
// =====================================================

function updateSequence(
  heatDetected,
  smokeDetected,
  fireAlert,
  confirmationCount,
  requiredCount
) {

  // Reset all classes

  el.stepHeat.classList.remove(
    "active",
    "confirmed",
    "fire"
  );

  el.stepSmoke.classList.remove(
    "active",
    "confirmed",
    "fire"
  );

  el.stepFire.classList.remove(
    "active",
    "confirmed",
    "fire"
  );


  // ===================================================
  // NO HEAT
  // ===================================================

  if (!heatDetected) {

    el.stepHeat.classList.add("confirmed");

    el.stepHeatStatus.textContent =
      "Normal";

    el.stepSmokeStatus.textContent =
      "Waiting for heat";

    el.stepFireStatus.textContent =
      "Not confirmed";

    return;

  }


  // ===================================================
  // HEAT DETECTED
  // ===================================================

  el.stepHeat.classList.add("active");

  el.stepHeatStatus.textContent =
    "Heat detected";


  // ===================================================
  // HEAT + SMOKE
  // ===================================================

  if (smokeDetected) {

    el.stepSmoke.classList.add("active");


    if (fireAlert) {

      el.stepSmoke.classList.add("confirmed");

      el.stepFire.classList.add("fire");

      el.stepHeat.classList.add("confirmed");

      el.stepHeatStatus.textContent =
        "Confirmed";

      el.stepSmokeStatus.textContent =
        "Confirmed";

      el.stepFireStatus.textContent =
        "🔥 FIRE CONFIRMED";

      return;

    }


    el.stepSmokeStatus.textContent =
      `Confirming ${confirmationCount}/${requiredCount}`;

    el.stepFireStatus.textContent =
      "Checking...";

    return;

  }


  // ===================================================
  // HEAT WITHOUT SMOKE
  // ===================================================

  el.stepSmokeStatus.textContent =
    "No smoke detected";

  el.stepFireStatus.textContent =
    "Not confirmed";

}


// =====================================================
// UPDATE ALL DASHBOARD DATA
// =====================================================

function updateDashboard(data) {

  latestData = data;


  // ---------------------------------------------------
  // DEVICE INFORMATION
  // ---------------------------------------------------

  const deviceId =
    textValue(data.deviceId, DEVICE_ID);

  const building =
    textValue(data.building, "ABC Apartments");

  const floor =
    textValue(data.floor, "3");

  const zone =
    textValue(data.zone, "Room 302");


  el.deviceId.textContent = deviceId;

  el.building.textContent = building;

  el.floorInfo.textContent = floor;

  el.zoneInfo.textContent = zone;


  el.location.textContent =
    building;

  el.floor.textContent =
    floor;

  el.zone.textContent =
    zone;


  // ---------------------------------------------------
  // GAS
  // ---------------------------------------------------

  const gasData =
    data.sensors?.gas || {};

  const gasRaw =
    numberValue(gasData.raw);

  const gasThreshold =
    numberValue(
      gasData.threshold,
      GAS_THRESHOLD
    );


  // ---------------------------------------------------
  // HEAT
  // ---------------------------------------------------

  const heatData =
    data.sensors?.heat || {};

  const heatResistance =
    numberValue(
      heatData.resistance
    );

  const heatThreshold =
    numberValue(
      heatData.fireThreshold,
      HEAT_THRESHOLD
    );


  // ---------------------------------------------------
  // FIRE CONFIRMATION
  // ---------------------------------------------------

  const confirmation =
    data.fireConfirmation || {};

  const confirmationCount =
    numberValue(
      confirmation.count
    );

  const requiredCount =
    numberValue(
      confirmation.required,
      3
    );


  // ---------------------------------------------------
  // FIRE ALERT
  // ---------------------------------------------------

  const fireAlert =
    data.fireAlert === true ||
    data.fireAlert === "true" ||
    data.fireAlert === 1;


  // ---------------------------------------------------
  // DETECTION
  // ---------------------------------------------------

  const heatDetected =
    heatData.alert === true ||
    heatData.alert === "true" ||
    heatResistance <= heatThreshold;


  const smokeDetected =
    gasData.alert === true ||
    gasData.alert === "true" ||
    gasRaw >= gasThreshold;


  /*
   * IMPORTANT:
   *
   * Smoke is ignored unless heat is present.
   */

  const validSmoke =
    heatDetected && smokeDetected;


  // ---------------------------------------------------
  // STATUS
  // ---------------------------------------------------

  let status =
    textValue(data.status, "SAFE");


  if (fireAlert) {

    status = "FIRE";

  } else if (heatDetected) {

    status = "HEAT DETECTED";

  } else {

    status = "SAFE";

  }


  // ---------------------------------------------------
  // UPDATE UI
  // ---------------------------------------------------

  updateMainStatus(
    status,
    heatDetected,
    fireAlert
  );


  updateHeatSensor(
    heatResistance,
    heatThreshold,
    heatDetected
  );


  updateGasSensor(
    gasRaw,
    heatDetected,
    validSmoke
  );


  updateSequence(
    heatDetected,
    validSmoke,
    fireAlert,
    confirmationCount,
    requiredCount
  );


  // ---------------------------------------------------
  // LAST UPDATE
  // ---------------------------------------------------

  el.lastUpdate.textContent =
    formatTime(new Date());

}


// =====================================================
// FIREBASE DEVICE LISTENER
// =====================================================

const deviceRef =
  ref(db, DATA_PATH);


onValue(

  deviceRef,

  (snapshot) => {

    const data =
      snapshot.val();


    if (!data) {

      console.warn(
        "No device data found."
      );

      return;

    }


    lastFirebaseUpdateTime =
      Date.now();


    updateDashboard(data);


    // -------------------------------------------------
    // FIRE POPUP
    // -------------------------------------------------

    const fireAlert =
      data.fireAlert === true ||
      data.fireAlert === "true" ||
      data.fireAlert === 1;


    if (fireAlert) {

      /*
       * Show the popup every time a FIRE state
       * is received, unless user has acknowledged it.
       */

      if (!popupAcknowledged) {

        showFirePopup(data);

      }

    } else {

      /*
       * Once FIRE is cleared, reset acknowledgement
       * so the next fire can produce a new popup.
       */

      popupAcknowledged = false;

      hideFirePopup();

    }

  },

  (error) => {

    console.error(
      "Firebase error:",
      error
    );

    el.fbDot.className =
      "status-dot offline";

    el.fbStatus.textContent =
      "Firebase Error";

  }

);


// =====================================================
// FIREBASE CONNECTION STATUS
// =====================================================

const connectionRef =
  ref(db, ".info/connected");


onValue(

  connectionRef,

  (snapshot) => {

    const connected =
      snapshot.val() === true;


    if (connected) {

      el.fbDot.className =
        "status-dot online";

      el.fbStatus.textContent =
        "Firebase Connected";

    } else {

      el.fbDot.className =
        "status-dot offline";

      el.fbStatus.textContent =
        "Firebase Disconnected";

    }

  }

);


// =====================================================
// CHECK DEVICE ONLINE STATUS
// =====================================================

setInterval(

  updateOnlineStatus,

  1000

);


// Initial status

updateOnlineStatus();


// =====================================================
// CONSOLE
// =====================================================

console.log(
  "SmartFire Guardian started."
);

console.log(
  "Monitoring:",
  DATA_PATH
);
