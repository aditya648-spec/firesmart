/* =========================================================
   SMARTFIRE GUARDIAN
   FIREBASE DASHBOARD
   ========================================================= */


import { db } from "./firebase-config.js";


import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";



/* =========================================================
   SETTINGS
   ========================================================= */


const DEVICE_ID = "SF-003";

const DATA_PATH =
  `devices/${DEVICE_ID}`;

const GAS_THRESHOLD = 1600;

const HEAT_THRESHOLD = 5000;

const OFFLINE_THRESHOLD_SEC = 20;



/* =========================================================
   ELEMENTS
   ========================================================= */


const el = {

  deviceTopDot:
    document.getElementById("deviceTopDot"),

  deviceTopStatus:
    document.getElementById("deviceTopStatus"),


  location:
    document.getElementById("location"),

  deviceId:
    document.getElementById("deviceId"),

  zone:
    document.getElementById("zone"),

  building:
    document.getElementById("building"),

  floor:
    document.getElementById("floor"),

  floorInfo:
    document.getElementById("floorInfo"),

  zoneInfo:
    document.getElementById("zoneInfo"),


  mainStatusCard:
    document.getElementById("mainStatusCard"),

  mainStatus:
    document.getElementById("mainStatus"),

  statusDescription:
    document.getElementById("statusDescription"),

  statusDot:
    document.getElementById("statusDot"),


  heatCard:
    document.getElementById("heatCard"),

  gasCard:
    document.getElementById("gasCard"),

  flame:
    document.getElementById("flame"),

  gas:
    document.getElementById("gas"),

  heatState:
    document.getElementById("heatState"),

  gasState:
    document.getElementById("gasState"),


  stepHeat:
    document.getElementById("stepHeat"),

  stepHeatStatus:
    document.getElementById("stepHeatStatus"),

  stepSmoke:
    document.getElementById("stepSmoke"),

  stepSmokeStatus:
    document.getElementById("stepSmokeStatus"),

  stepFire:
    document.getElementById("stepFire"),

  stepFireStatus:
    document.getElementById("stepFireStatus"),


  alarm:
    document.getElementById("alarm"),


  fbDot:
    document.getElementById("fbDot"),

  fbStatus:
    document.getElementById("fbStatus"),


  lastUpdate:
    document.getElementById("lastUpdate"),


  firePopup:
    document.getElementById("firePopup"),

  popupBuilding:
    document.getElementById("popupBuilding"),

  popupFloor:
    document.getElementById("popupFloor"),

  popupZone:
    document.getElementById("popupZone"),

  acknowledgeFire:
    document.getElementById("acknowledgeFire")

};



/* =========================================================
   STATE
   ========================================================= */


let lastFirebaseUpdateTime = 0;

let popupAcknowledged = false;

let currentFireState = false;



/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */


function numberValue(value, fallback = 0) {

  const number =
    Number(value);

  if (
    Number.isFinite(number)
  ) {

    return number;

  }

  return fallback;

}


function textValue(
  value,
  fallback = "--"
) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {

    return fallback;

  }

  return String(value);

}


function isTrue(value) {

  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );

}


function formatTime(date) {

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );

}



/* =========================================================
   FIRE POPUP
   ========================================================= */


function showFirePopup(data) {

  if (!el.firePopup) {

    return;

  }


  const building =
    textValue(
      data.building,
      "ABC Apartments"
    );


  const floor =
    textValue(
      data.floor,
      "3"
    );


  const zone =
    textValue(
      data.zone,
      "Room 302"
    );


  el.popupBuilding.textContent =
    building;

  el.popupFloor.textContent =
    floor;

  el.popupZone.textContent =
    zone;


  el.firePopup.classList.remove(
    "hidden"
  );

}


function hideFirePopup() {

  if (!el.firePopup) {

    return;

  }


  el.firePopup.classList.add(
    "hidden"
  );

}



/* =========================================================
   ACKNOWLEDGE BUTTON
   ========================================================= */


el.acknowledgeFire.addEventListener(
  "click",
  () => {

    popupAcknowledged = true;

    hideFirePopup();

  }
);



/* =========================================================
   DEVICE ONLINE STATUS
   ========================================================= */


function updateOnlineStatus() {

  if (
    lastFirebaseUpdateTime === 0
  ) {

    el.deviceTopDot.className =
      "status-dot";

    el.deviceTopStatus.textContent =
      "Waiting...";

    return;

  }


  const ageSeconds =
    (
      Date.now() -
      lastFirebaseUpdateTime
    ) / 1000;


  if (
    ageSeconds <=
    OFFLINE_THRESHOLD_SEC
  ) {

    el.deviceTopDot.className =
      "status-dot online";

    el.deviceTopStatus.textContent =
      "Device Online";

  } else {

    el.deviceTopDot.className =
      "status-dot offline";

    el.deviceTopStatus.textContent =
      "Device Offline";

  }

}



/* =========================================================
   MAIN STATUS
   ========================================================= */


function updateMainStatus(
  heatDetected,
  fireAlert
) {


  el.mainStatusCard.classList.remove(
    "safe",
    "heat",
    "alert"
  );


  /* ---------------- FIRE ---------------- */


  if (fireAlert) {

    el.mainStatusCard.classList.add(
      "alert"
    );

    el.mainStatus.textContent =
      "FIRE ALERT";

    el.statusDescription.textContent =
      "Heat and smoke have been confirmed.";

    el.alarm.textContent =
      "ACTIVE";

    return;

  }


  /* ---------------- HEAT ---------------- */


  if (heatDetected) {

    el.mainStatusCard.classList.add(
      "heat"
    );

    el.mainStatus.textContent =
      "HEAT DETECTED";

    el.statusDescription.textContent =
      "Heat detected. Checking smoke/gas sensor.";

    el.alarm.textContent =
      "STANDBY";

    return;

  }


  /* ---------------- SAFE ---------------- */


  el.mainStatusCard.classList.add(
    "safe"
  );

  el.mainStatus.textContent =
    "SAFE";

  el.statusDescription.textContent =
    "No fire detected. System is monitoring.";

  el.alarm.textContent =
    "OFF";

}



/* =========================================================
   HEAT SENSOR
   ========================================================= */


function updateHeatSensor(
  heatResistance,
  heatDetected
) {


  if (
    heatResistance > 0
  ) {

    el.flame.textContent =
      (
        heatResistance / 1000
      ).toFixed(2);

  } else {

    el.flame.textContent =
      "--";

  }


  el.heatCard.classList.remove(
    "warn",
    "alert"
  );


  if (heatDetected) {

    el.heatCard.classList.add(
      "warn"
    );

    el.heatState.textContent =
      "HEAT DETECTED";

  } else {

    el.heatState.textContent =
      "NORMAL";

  }

}



/* =========================================================
   MQ-2 SENSOR
   ========================================================= */


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
   * Smoke is only considered
   * after heat is detected.
   */


  if (!heatDetected) {

    el.gasState.textContent =
      "NOT CHECKED";

    return;

  }


  if (smokeDetected) {

    el.gasCard.classList.add(
      "alert"
    );

    el.gasState.textContent =
      "SMOKE DETECTED";

  } else {

    el.gasState.textContent =
      "NORMAL";

  }

}



/* =========================================================
   FIRE DETECTION SEQUENCE
   ========================================================= */


function updateSequence(
  heatDetected,
  smokeDetected,
  fireAlert,
  confirmationCount,
  requiredCount
) {


  /* Reset */

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


  /* =====================================================
     NO HEAT
     ===================================================== */


  if (!heatDetected) {

    el.stepHeat.classList.add(
      "confirmed"
    );

    el.stepHeatStatus.textContent =
      "Normal";

    el.stepSmokeStatus.textContent =
      "Waiting for heat";

    el.stepFireStatus.textContent =
      "Not confirmed";

    return;

  }


  /* =====================================================
     HEAT DETECTED
     ===================================================== */


  el.stepHeat.classList.add(
    "active"
  );

  el.stepHeatStatus.textContent =
    "Heat detected";


  /* =====================================================
     HEAT + SMOKE
     ===================================================== */


  if (smokeDetected) {


    el.stepSmoke.classList.add(
      "active"
    );


    /* ---------------- FIRE ---------------- */


    if (fireAlert) {

      el.stepHeat.classList.remove(
        "active"
      );

      el.stepHeat.classList.add(
        "confirmed"
      );


      el.stepSmoke.classList.remove(
        "active"
      );

      el.stepSmoke.classList.add(
        "confirmed"
      );


      el.stepFire.classList.add(
        "fire"
      );


      el.stepHeatStatus.textContent =
        "Confirmed";

      el.stepSmokeStatus.textContent =
        "Confirmed";

      el.stepFireStatus.textContent =
        "🔥 FIRE CONFIRMED";

      return;

    }


    /* ---------------- CONFIRMING ---------------- */


    el.stepSmokeStatus.textContent =
      `Confirming ${confirmationCount}/${requiredCount}`;

    el.stepFireStatus.textContent =
      "Checking...";

    return;

  }


  /* =====================================================
     HEAT WITHOUT SMOKE
     ===================================================== */


  el.stepSmokeStatus.textContent =
    "No smoke detected";

  el.stepFireStatus.textContent =
    "Not confirmed";

}



/* =========================================================
   UPDATE DASHBOARD
   ========================================================= */


function updateDashboard(data) {


  /* =====================================================
     DEVICE INFORMATION
     ===================================================== */


  const deviceId =
    textValue(
      data.deviceId,
      DEVICE_ID
    );


  const building =
    textValue(
      data.building,
      "ABC Apartments"
    );


  const floor =
    textValue(
      data.floor,
      "3"
    );


  const zone =
    textValue(
      data.zone,
      "Room 302"
    );


  el.deviceId.textContent =
    deviceId;

  el.building.textContent =
    building;

  el.floorInfo.textContent =
    floor;

  el.zoneInfo.textContent =
    zone;


  el.location.textContent =
    building;

  el.floor.textContent =
    floor;

  el.zone.textContent =
    zone;



  /* =====================================================
     GAS
     ===================================================== */


  const gasData =
    data.sensors?.gas || {};


  const gasRaw =
    numberValue(
      gasData.raw
    );


  const gasThreshold =
    numberValue(
      gasData.threshold,
      GAS_THRESHOLD
    );



  /* =====================================================
     HEAT
     ===================================================== */


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



  /* =====================================================
     FIRE CONFIRMATION
     ===================================================== */


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



  /* =====================================================
     FIRE ALERT
     ===================================================== */


  const fireAlert =
    isTrue(
      data.fireAlert
    );



  /* =====================================================
     DETECTION
     ===================================================== */


  const heatDetected =
    isTrue(
      heatData.alert
    ) ||
    (
      heatResistance > 0 &&
      heatResistance <= heatThreshold
    );


  const smokeDetected =
    isTrue(
      gasData.alert
    ) ||
    gasRaw >= gasThreshold;


  /*
   * IMPORTANT:
   *
   * Smoke is ignored unless
   * heat is already detected.
   */


  const validSmoke =
    heatDetected &&
    smokeDetected;



  /* =====================================================
     UPDATE UI
     ===================================================== */


  updateMainStatus(
    heatDetected,
    fireAlert
  );


  updateHeatSensor(
    heatResistance,
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



  /* =====================================================
     LAST UPDATE
     ===================================================== */


  el.lastUpdate.textContent =
    formatTime(
      new Date()
    );



  /* =====================================================
     FIRE POPUP
     ===================================================== */


  if (fireAlert) {


    /*
     * Only show popup when entering
     * a new FIRE state.
     */


    if (!currentFireState) {

      popupAcknowledged = false;

    }


    currentFireState = true;


    if (!popupAcknowledged) {

      showFirePopup(data);

    }

  } else {


    currentFireState = false;

    popupAcknowledged = false;

    hideFirePopup();

  }

}



/* =========================================================
   FIREBASE DEVICE LISTENER
   ========================================================= */


const deviceRef =
  ref(
    db,
    DATA_PATH
  );


onValue(

  deviceRef,

  (snapshot) => {


    const data =
      snapshot.val();


    if (!data) {

      console.warn(
        "No SmartFire Guardian data found."
      );

      return;

    }


    /* Record browser receipt time */

    lastFirebaseUpdateTime =
      Date.now();


    /* Update dashboard */

    updateDashboard(
      data
    );


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



/* =========================================================
   FIREBASE CONNECTION LISTENER
   ========================================================= */


const connectionRef =
  ref(
    db,
    ".info/connected"
  );


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



/* =========================================================
   ONLINE CHECK
   ========================================================= */


setInterval(

  updateOnlineStatus,

  1000

);


updateOnlineStatus();



/* =========================================================
   STARTUP MESSAGE
   ========================================================= */


console.log(
  "===================================="
);

console.log(
  "SmartFire Guardian started"
);

console.log(
  "Device:",
  DEVICE_ID
);

console.log(
  "Firebase path:",
  DATA_PATH
);

console.log(
  "Heat threshold:",
  HEAT_THRESHOLD,
  "ohms"
);

console.log(
  "Gas threshold:",
  GAS_THRESHOLD,
  "ADC"
);

console.log(
  "===================================="
);
