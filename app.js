/* =========================================================
   SMARTFIRE GUARDIAN
   FIREBASE DASHBOARD
   Compatible with current index.html
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

const DATA_PATH = `devices/${DEVICE_ID}`;

const GAS_THRESHOLD = 1600;

const DEFAULT_HEAT_THRESHOLD = 5000;

const OFFLINE_THRESHOLD_SEC = 20;



/* =========================================================
   GET HTML ELEMENTS
   ========================================================= */

const deviceTopDot =
  document.getElementById("deviceTopDot");

const deviceTopStatus =
  document.getElementById("deviceTopStatus");


const lastUpdate =
  document.getElementById("lastUpdate");


const locationElement =
  document.getElementById("location");


const deviceIdElement =
  document.getElementById("deviceId");


const buildingElement =
  document.getElementById("building");


const floorElement =
  document.getElementById("floor");


const zoneElement =
  document.getElementById("zone");


const mainStatus =
  document.getElementById("mainStatus");


const statusDot =
  document.getElementById("statusDot");


const statusValue =
  document.getElementById("statusValue");


const statusText =
  document.getElementById("statusText");


const statusDescription =
  document.getElementById("statusDescription");


const heatCard =
  document.getElementById("heatCard");


const gasCard =
  document.getElementById("gasCard");


const flame =
  document.getElementById("flame");


const gas =
  document.getElementById("gas");


const heatState =
  document.getElementById("heatState");


const gasState =
  document.getElementById("gasState");


const stepHeat =
  document.getElementById("stepHeat");


const stepHeatStatus =
  document.getElementById("stepHeatStatus");


const stepSmoke =
  document.getElementById("stepSmoke");


const stepSmokeStatus =
  document.getElementById("stepSmokeStatus");


const stepFire =
  document.getElementById("stepFire");


const stepFireStatus =
  document.getElementById("stepFireStatus");


const alarm =
  document.getElementById("alarm");


const fbDot =
  document.getElementById("fbDot");


const fbStatus =
  document.getElementById("fbStatus");


const deviceConn =
  document.getElementById("deviceConn");



/* =========================================================
   STATE
   ========================================================= */

let lastFirebaseUpdateTime = 0;

let currentFireState = false;

let popupAcknowledged = false;

let firePopup = null;



/* =========================================================
   HELPERS
   ========================================================= */

function numberValue(value, fallback = 0) {

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;

}


function textValue(value, fallback = "—") {

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
   CREATE FIRE POPUP
   ========================================================= */

/*
   The popup is created here instead of requiring you
   to change index.html.
*/

function createFirePopup() {

  if (document.getElementById("firePopup")) {

    return document.getElementById("firePopup");

  }


  const popup =
    document.createElement("div");


  popup.id = "firePopup";

  popup.className = "fire-popup hidden";


  popup.innerHTML = `

    <div class="fire-popup-box">

      <div class="fire-icon">
        🔥
      </div>

      <h1>
        FIRE ALERT
      </h1>

      <p class="fire-message">
        Fire has been detected!
      </p>


      <div class="fire-details">

        <div class="fire-detail">

          <span>
            BUILDING
          </span>

          <strong id="popupBuilding">
            —
          </strong>

        </div>


        <div class="fire-detail">

          <span>
            FLOOR
          </span>

          <strong id="popupFloor">
            —
          </strong>

        </div>


        <div class="fire-detail">

          <span>
            ZONE
          </span>

          <strong id="popupZone">
            —
          </strong>

        </div>

      </div>


      <div class="fire-confirmation">

        🔥 Heat + Smoke confirmed

      </div>


      <button
        id="acknowledgeFire"
        class="acknowledge-button"
      >
        ACKNOWLEDGE
      </button>

    </div>

  `;


  document.body.appendChild(popup);


  const acknowledge =
    document.getElementById(
      "acknowledgeFire"
    );


  acknowledge.addEventListener(
    "click",
    () => {

      popupAcknowledged = true;

      hideFirePopup();

    }
  );


  return popup;

}


firePopup =
  createFirePopup();



/* =========================================================
   SHOW FIRE POPUP
   ========================================================= */

function showFirePopup(data) {

  const popup =
    document.getElementById(
      "firePopup"
    );


  if (!popup) {

    return;

  }


  const popupBuilding =
    document.getElementById(
      "popupBuilding"
    );


  const popupFloor =
    document.getElementById(
      "popupFloor"
    );


  const popupZone =
    document.getElementById(
      "popupZone"
    );


  popupBuilding.textContent =
    textValue(
      data.building,
      "ABC Apartments"
    );


  popupFloor.textContent =
    textValue(
      data.floor,
      "3"
    );


  popupZone.textContent =
    textValue(
      data.zone,
      "Room 302"
    );


  popup.classList.remove(
    "hidden"
  );

}


function hideFirePopup() {

  const popup =
    document.getElementById(
      "firePopup"
    );


  if (!popup) {

    return;

  }


  popup.classList.add(
    "hidden"
  );

}



/* =========================================================
   DEVICE ONLINE STATUS
   ========================================================= */

function updateOnlineStatus() {

  if (
    lastFirebaseUpdateTime === 0
  ) {

    deviceTopDot.className =
      "dot off";

    deviceTopStatus.textContent =
      "CONNECTING";

    return;

  }


  const age =
    (
      Date.now() -
      lastFirebaseUpdateTime
    ) / 1000;


  if (
    age <= OFFLINE_THRESHOLD_SEC
  ) {

    deviceTopDot.className =
      "dot online";

    deviceTopStatus.textContent =
      "ONLINE";


    if (deviceConn) {

      deviceConn.textContent =
        "ONLINE";

    }

  } else {

    deviceTopDot.className =
      "dot off";

    deviceTopStatus.textContent =
      "OFFLINE";


    if (deviceConn) {

      deviceConn.textContent =
        "OFFLINE";

    }

  }

}



/* =========================================================
   MAIN STATUS
   ========================================================= */

function updateMainStatus(
  status,
  heatDetected,
  fireAlert
) {


  /*
     Remove old status classes.
  */

  mainStatus.classList.remove(
    "safe",
    "heat",
    "alert",
    "fire"
  );


  statusValue.classList.remove(
    "safe",
    "heat",
    "alert",
    "fire"
  );


  statusDot.classList.remove(
    "safe",
    "heat",
    "alert",
    "fire"
  );



  /* =======================================================
     FIRE
     ======================================================= */

  if (
    fireAlert ||
    status === "FIRE"
  ) {

    mainStatus.classList.add(
      "alert"
    );

    statusValue.classList.add(
      "alert"
    );

    statusDot.classList.add(
      "alert"
    );


    statusText.textContent =
      "FIRE ALERT";


    statusDescription.textContent =
      "Heat and smoke have been confirmed.";


    alarm.textContent =
      "ACTIVE";


    return;

  }



  /* =======================================================
     HEAT
     ======================================================= */

  if (
    heatDetected ||
    status === "HEAT DETECTED"
  ) {

    mainStatus.classList.add(
      "heat"
    );

    statusValue.classList.add(
      "heat"
    );

    statusDot.classList.add(
      "heat"
    );


    statusText.textContent =
      "HEAT DETECTED";


    statusDescription.textContent =
      "Heat detected. Checking smoke/gas sensor.";


    alarm.textContent =
      "STANDBY";


    return;

  }



  /* =======================================================
     SAFE
     ======================================================= */

  mainStatus.classList.add(
    "safe"
  );

  statusValue.classList.add(
    "safe"
  );

  statusDot.classList.add(
    "safe"
  );


  statusText.textContent =
    "SAFE";


  statusDescription.textContent =
    "No fire detected. System is monitoring.";


  alarm.textContent =
    "OFF";

}



/* =========================================================
   HEAT SENSOR
   ========================================================= */

function updateHeatSensor(
  resistance,
  heatThreshold,
  heatDetected
) {


  if (
    resistance > 0
  ) {

    flame.textContent =
      (
        resistance / 1000
      ).toFixed(2) + " kΩ";

  } else {

    flame.textContent =
      "—";

  }


  heatCard.classList.remove(
    "safe",
    "heat",
    "warn",
    "alert"
  );


  heatState.classList.remove(
    "normal",
    "warn",
    "alert"
  );


  if (heatDetected) {

    heatCard.classList.add(
      "warn"
    );

    heatState.classList.add(
      "warn"
    );

    heatState.textContent =
      "● HEAT DETECTED";

  } else {

    heatState.classList.add(
      "normal"
    );

    heatState.textContent =
      "● NORMAL";

  }

}



/* =========================================================
   MQ-2 SENSOR
   ========================================================= */

function updateGasSensor(
  gasRaw,
  gasThreshold,
  heatDetected,
  smokeDetected
) {


  gas.textContent =
    Math.round(gasRaw);


  gasCard.classList.remove(
    "safe",
    "heat",
    "warn",
    "alert"
  );


  gasState.classList.remove(
    "normal",
    "warn",
    "alert"
  );


  /*
     IMPORTANT:

     Smoke is only considered after
     heat has been detected.
  */


  if (!heatDetected) {

    gasState.classList.add(
      "normal"
    );

    gasState.textContent =
      "● NOT CHECKED";

    return;

  }


  if (smokeDetected) {

    gasCard.classList.add(
      "alert"
    );

    gasState.classList.add(
      "alert"
    );

    gasState.textContent =
      "● SMOKE DETECTED";

  } else {

    gasState.classList.add(
      "normal"
    );

    gasState.textContent =
      "● NORMAL";

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


  /*
     Remove old classes.
  */

  stepHeat.classList.remove(
    "active",
    "confirmed",
    "fire"
  );

  stepSmoke.classList.remove(
    "active",
    "confirmed",
    "fire"
  );

  stepFire.classList.remove(
    "active",
    "confirmed",
    "fire"
  );



  /* =======================================================
     SAFE / NO HEAT
     ======================================================= */

  if (!heatDetected) {

    stepHeat.classList.add(
      "confirmed"
    );


    stepHeatStatus.textContent =
      "NORMAL";


    stepSmokeStatus.textContent =
      "WAITING";


    stepFireStatus.textContent =
      "WAITING";


    return;

  }



  /* =======================================================
     HEAT DETECTED
     ======================================================= */

  stepHeat.classList.add(
    "active"
  );


  stepHeatStatus.textContent =
    "DETECTED";



  /* =======================================================
     HEAT + SMOKE
     ======================================================= */

  if (smokeDetected) {

    stepSmoke.classList.add(
      "active"
    );


    /* -----------------------------------------------------
       FIRE CONFIRMED
       ----------------------------------------------------- */

    if (fireAlert) {

      stepHeat.classList.remove(
        "active"
      );

      stepHeat.classList.add(
        "confirmed"
      );


      stepSmoke.classList.remove(
        "active"
      );

      stepSmoke.classList.add(
        "confirmed"
      );


      stepFire.classList.add(
        "fire"
      );


      stepHeatStatus.textContent =
        "CONFIRMED";


      stepSmokeStatus.textContent =
        "CONFIRMED";


      stepFireStatus.textContent =
        "🔥 FIRE CONFIRMED";


      return;

    }



    /* -----------------------------------------------------
       CONFIRMING
       ----------------------------------------------------- */

    stepSmokeStatus.textContent =
      `CONFIRMING ${confirmationCount}/${requiredCount}`;


    stepFireStatus.textContent =
      "CHECKING";


    return;

  }



  /* =======================================================
     HEAT WITHOUT SMOKE
     ======================================================= */

  stepSmokeStatus.textContent =
    "NO SMOKE";


  stepFireStatus.textContent =
    "WAITING";

}



/* =========================================================
   UPDATE DASHBOARD
   ========================================================= */

function updateDashboard(data) {


  console.log(
    "Firebase data received:",
    data
  );



  /* =======================================================
     DEVICE INFORMATION
     ======================================================= */

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


  deviceIdElement.textContent =
    deviceId;


  buildingElement.textContent =
    building;


  floorElement.textContent =
    floor;


  zoneElement.textContent =
    zone;


  locationElement.textContent =
    `${building} • Floor ${floor} • ${zone}`;



  /* =======================================================
     GAS
     ======================================================= */

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



  /* =======================================================
     HEAT
     ======================================================= */

  const heatData =
    data.sensors?.heat || {};


  const heatResistance =
    numberValue(
      heatData.resistance
    );


  const heatThreshold =
    numberValue(
      heatData.fireThreshold,
      DEFAULT_HEAT_THRESHOLD
    );



  /* =======================================================
     CONFIRMATION
     ======================================================= */

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



  /* =======================================================
     FIRE ALERT
     ======================================================= */

  const fireAlert =
    isTrue(
      data.fireAlert
    );



  /* =======================================================
     HEAT DETECTION
     ======================================================= */

  const heatDetected =
    isTrue(
      heatData.alert
    ) ||
    (
      heatResistance > 0 &&
      heatResistance <= heatThreshold
    );



  /* =======================================================
     SMOKE DETECTION
     ======================================================= */

  const smokeDetected =
    isTrue(
      gasData.alert
    ) ||
    gasRaw >= gasThreshold;



  /*
     Smoke is only valid when heat
     has already been detected.
  */

  const validSmoke =
    heatDetected &&
    smokeDetected;



  /* =======================================================
     STATUS
     ======================================================= */

  let status =
    textValue(
      data.status,
      "SAFE"
    );


  if (fireAlert) {

    status =
      "FIRE";

  } else if (heatDetected) {

    status =
      "HEAT DETECTED";

  } else {

    status =
      "SAFE";

  }



  /* =======================================================
     UPDATE UI
     ======================================================= */

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
    gasThreshold,
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



  /* =======================================================
     LAST UPDATE
     ======================================================= */

  lastUpdate.textContent =
    `Last update: ${formatTime(new Date())}`;



  /* =======================================================
     FIRE POPUP
     ======================================================= */

  if (fireAlert) {


    /*
       Detect a new FIRE event.
    */

    if (!currentFireState) {

      popupAcknowledged =
        false;

    }


    currentFireState =
      true;


    if (!popupAcknowledged) {

      showFirePopup(
        data
      );

    }

  } else {

    currentFireState =
      false;

    popupAcknowledged =
      false;

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


    console.log(
      "Firebase snapshot:",
      data
    );


    if (!data) {

      console.warn(
        "No data found at:",
        DATA_PATH
      );

      return;

    }


    lastFirebaseUpdateTime =
      Date.now();


    updateDashboard(
      data
    );

  },


  (error) => {


    console.error(
      "Firebase device error:",
      error
    );


    fbDot.className =
      "dot off";


    fbStatus.textContent =
      "ERROR";


    deviceTopDot.className =
      "dot off";


    deviceTopStatus.textContent =
      "ERROR";

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

      fbDot.className =
        "dot online";


      fbStatus.textContent =
        "connected";

    } else {

      fbDot.className =
        "dot off";


      fbStatus.textContent =
        "disconnected";

    }

  }

);



/* =========================================================
   DEVICE ONLINE TIMER
   ========================================================= */

setInterval(
  updateOnlineStatus,
  1000
);


updateOnlineStatus();



/* =========================================================
   STARTUP
   ========================================================= */

console.log(
  "===================================="
);

console.log(
  "SmartFire Guardian"
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
  "MQ-2 threshold:",
  GAS_THRESHOLD
);

console.log(
  "Default heat threshold:",
  DEFAULT_HEAT_THRESHOLD
);

console.log(
  "===================================="
);
