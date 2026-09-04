import { db } from "./firebase-config.js";

import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


/* =========================================================
   SMART FIRE GUARDIAN
   ========================================================= */


/* =========================================================
   DEVICE
   ========================================================= */

const DEVICE_ID = "SF-003";

const DATA_PATH =
  `devices/${DEVICE_ID}`;


/* =========================================================
   THRESHOLDS
   ========================================================= */

const DEFAULT_GAS_THRESHOLD = 1600;

const DEFAULT_FIRE_THRESHOLD = 5000;


/* =========================================================
   YOUR LOCATION
   ========================================================= */

const DEFAULT_LAT =
  15.855881303189477;

const DEFAULT_LNG =
  74.57802140000477;


/* =========================================================
   POLICE STATION
   ========================================================= */

const POLICE_LAT =
  15.881842260513212;

const POLICE_LNG =
  74.52917008030238;


/* =========================================================
   FIRE STATION
   ========================================================= */

const FIRE_STATION_LAT =
  15.845029016505203;

const FIRE_STATION_LNG =
  74.50745329043593;


/* =========================================================
   MAP
   ========================================================= */

let map = null;

let deviceMarker = null;

let policeMarker = null;

let fireStationMarker = null;

let deviceToPoliceLine = null;

let deviceToFireStationLine = null;


/* =========================================================
   POPUP MAP
   ========================================================= */

let popupMap = null;

let popupDeviceMarker = null;


/* =========================================================
   CURRENT DEVICE POSITION
   ========================================================= */

let currentLat =
  DEFAULT_LAT;

let currentLng =
  DEFAULT_LNG;


/* =========================================================
   FIRE STATE
   ========================================================= */

let previousFireState =
  false;


/* =========================================================
   HELPER
   ========================================================= */

function $(id) {

  return document.getElementById(id);

}


/* =========================================================
   HTML ELEMENTS
   ========================================================= */

const elements = {

  deviceTopDot:
    $("deviceTopDot"),

  deviceTopStatus:
    $("deviceTopStatus"),

  lastUpdate:
    $("lastUpdate"),

  location:
    $("location"),

  mainStatus:
    $("mainStatus"),

  statusDot:
    $("statusDot"),

  statusValue:
    $("statusValue"),

  statusText:
    $("statusText"),

  statusDescription:
    $("statusDescription"),

  heatCard:
    $("heatCard"),

  flame:
    $("flame"),

  heatState:
    $("heatState"),

  gasCard:
    $("gasCard"),

  gas:
    $("gas"),

  gasState:
    $("gasState"),

  stepHeat:
    $("stepHeat"),

  stepHeatStatus:
    $("stepHeatStatus"),

  stepSmoke:
    $("stepSmoke"),

  stepSmokeStatus:
    $("stepSmokeStatus"),

  stepFire:
    $("stepFire"),

  stepFireStatus:
    $("stepFireStatus"),

  alarm:
    $("alarm"),

  deviceId:
    $("deviceId"),

  building:
    $("building"),

  floor:
    $("floor"),

  zone:
    $("zone"),

  fbDot:
    $("fbDot"),

  fbStatus:
    $("fbStatus"),

  deviceConn:
    $("deviceConn")

};


/* =========================================================
   NUMBER
   ========================================================= */

function numberValue(
  value,
  fallback = 0
) {

  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;

}


/* =========================================================
   COORDINATE
   ========================================================= */

function validCoordinate(
  value,
  fallback
) {

  const n =
    Number(value);

  if (
    Number.isFinite(n) &&
    n !== 0
  ) {

    return n;

  }

  return fallback;

}


/* =========================================================
   CURRENT TIME
   ========================================================= */

function currentTime() {

  return new Date().toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );

}


/* =========================================================
   DISTANCE
   ========================================================= */

function distanceKm(
  lat1,
  lng1,
  lat2,
  lng2
) {

  const R = 6371;

  const dLat =
    (lat2 - lat1) *
    Math.PI /
    180;

  const dLng =
    (lng2 - lng1) *
    Math.PI /
    180;

  const a =

    Math.sin(dLat / 2) *
    Math.sin(dLat / 2)

    +

    Math.cos(
      lat1 * Math.PI / 180
    )

    *

    Math.cos(
      lat2 * Math.PI / 180
    )

    *

    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;

}


/* =========================================================
   MAP MARKER ICON
   MATCHES YOUR EXISTING CSS
   ========================================================= */

function markerIcon(type) {

  let emoji = "📍";

  let className = "safe";


  if (
    type === "police"
  ) {

    emoji = "🚓";

    className = "police";

  }


  else if (
    type === "fireStation"
  ) {

    emoji = "🚒";

    className = "station";

  }


  else if (
    type === "fire"
  ) {

    emoji = "🔥";

    className = "fire";

  }


  return L.divIcon({

    className:
      "sf-marker",

    html: `

      <div class="sf-marker-pin ${className}">

        <span>
          ${emoji}
        </span>

      </div>

    `,

    iconSize:
      [32, 32],

    iconAnchor:
      [16, 32],

    popupAnchor:
      [0, -32]

  });

}


/* =========================================================
   INITIALIZE MAP
   ========================================================= */

function initMap() {

  const mapElement =
    $("map");


  if (!mapElement) {

    console.error(
      "Map element not found."
    );

    return;

  }


  if (
    typeof L === "undefined"
  ) {

    console.error(
      "Leaflet is not loaded."
    );

    return;

  }


  /* =======================================================
     CREATE MAP
     ======================================================= */

  map =
    L.map(
      "map",
      {
        zoomControl: true
      }
    );


  /* =======================================================
     OPEN STREET MAP
     ======================================================= */

  L.tileLayer(

    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    {

      maxZoom: 19,

      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

    }

  ).addTo(map);


  /* =======================================================
     YOUR LOCATION
     ======================================================= */

  deviceMarker =
    L.marker(

      [
        DEFAULT_LAT,
        DEFAULT_LNG
      ],

      {
        icon:
          markerIcon("safe")
      }

    ).addTo(map);


  deviceMarker.bindTooltip(

    "📍 YOUR LOCATION",

    {

      permanent: true,

      direction: "top",

      offset:
        [0, -30],

      className:
        "your-location-label"

    }

  );


  deviceMarker.bindPopup(

    `
      <strong>
        📍 YOUR LOCATION
      </strong>

      <br><br>

      Smart Fire Guardian

      <br>

      Device: ${DEVICE_ID}

      <br>

      ABC Apartments

      <br>

      Floor 3 • Room 302
    `

  );


  /* =======================================================
     POLICE STATION
     ======================================================= */

  policeMarker =
    L.marker(

      [
        POLICE_LAT,
        POLICE_LNG
      ],

      {
        icon:
          markerIcon("police")
      }

    ).addTo(map);


  policeMarker.bindTooltip(

    "🚓 NEAREST POLICE STATION",

    {

      permanent: true,

      direction: "top",

      offset:
        [0, -30],

      className:
        "police-location-label"

    }

  );


  policeMarker.bindPopup(

    `
      <strong>
        🚓 NEAREST POLICE STATION
      </strong>

      <br><br>

      Emergency Police Response Point
    `

  );


  /* =======================================================
     FIRE STATION
     ======================================================= */

  fireStationMarker =
    L.marker(

      [
        FIRE_STATION_LAT,
        FIRE_STATION_LNG
      ],

      {
        icon:
          markerIcon("fireStation")
      }

    ).addTo(map);


  fireStationMarker.bindTooltip(

    "🚒 NEAREST FIRE STATION",

    {

      permanent: true,

      direction: "top",

      offset:
        [0, -30],

      className:
        "fire-station-location-label"

    }

  );


  fireStationMarker.bindPopup(

    `
      <strong>
        🚒 NEAREST FIRE STATION
      </strong>

      <br><br>

      Emergency Fire Response Point
    `

  );


  /* =======================================================
     RESPONSE LINE → POLICE
     ======================================================= */

  deviceToPoliceLine =
    L.polyline(

      [

        [
          DEFAULT_LAT,
          DEFAULT_LNG
        ],

        [
          POLICE_LAT,
          POLICE_LNG
        ]

      ],

      {

        weight: 4,

        opacity: 0.8,

        dashArray:
          "8,8"

      }

    );


  /* =======================================================
     RESPONSE LINE → FIRE STATION
     ======================================================= */

  deviceToFireStationLine =
    L.polyline(

      [

        [
          DEFAULT_LAT,
          DEFAULT_LNG
        ],

        [
          FIRE_STATION_LAT,
          FIRE_STATION_LNG
        ]

      ],

      {

        weight: 4,

        opacity: 0.8,

        dashArray:
          "8,8"

      }

    );


  /* =======================================================
     INITIAL VIEW ONLY
     
     THIS IS THE ONLY PLACE WE USE fitBounds().
     
     Firebase WILL NOT CALL IT AGAIN.
     ======================================================= */

  const bounds =
    L.latLngBounds(

      [

        [
          DEFAULT_LAT,
          DEFAULT_LNG
        ],

        [
          POLICE_LAT,
          POLICE_LNG
        ],

        [
          FIRE_STATION_LAT,
          FIRE_STATION_LNG
        ]

      ]

    );


  map.fitBounds(

    bounds,

    {
      padding:
        [70, 70]
    }

  );


  console.log(
    "MAP INITIALIZED"
  );

}


/* =========================================================
   UPDATE MAP
   ========================================================= */

function updateMap(
  data,
  fireAlert
) {

  if (
    !map ||
    !deviceMarker
  ) {

    return;

  }


  /* =======================================================
     GET CURRENT DEVICE LOCATION
     ======================================================= */

  currentLat =
    validCoordinate(

      data?.lat ??
      data?.location?.lat ??
      data?.coordinates?.lat,

      DEFAULT_LAT

    );


  currentLng =
    validCoordinate(

      data?.lng ??
      data?.location?.lng ??
      data?.coordinates?.lng,

      DEFAULT_LNG

    );


  /* =======================================================
     MOVE DEVICE MARKER
     
     ONLY MOVE MARKER.
     
     DO NOT CHANGE MAP VIEW.
     ======================================================= */

  deviceMarker.setLatLng(

    [
      currentLat,
      currentLng
    ]

  );


  /* =======================================================
     DEVICE ICON
     ======================================================= */

  deviceMarker.setIcon(

    markerIcon(

      fireAlert
        ? "fire"
        : "safe"

    )

  );


  /* =======================================================
     DEVICE LABEL
     ======================================================= */

  if (fireAlert) {

    deviceMarker.setTooltipContent(
      "🔥 FIRE LOCATION"
    );

  }

  else {

    deviceMarker.setTooltipContent(
      "📍 YOUR LOCATION"
    );

  }


  /* =======================================================
     DEVICE INFORMATION
     ======================================================= */

  const building =
    data?.building ??
    "ABC Apartments";


  const floor =
    data?.floor ??
    "3";


  const zone =
    data?.zone ??
    "Room 302";


  /* =======================================================
     DEVICE POPUP
     ======================================================= */

  if (fireAlert) {

    deviceMarker.setPopupContent(

      `

        <strong
          style="color:#b91c1c"
        >

          🔥 FIRE LOCATION

        </strong>

        <br><br>

        <b>
          ${building}
        </b>

        <br>

        Floor ${floor}

        <br>

        ${zone}

        <br><br>

        🚓 Police Station notified

        <br>

        🚒 Fire Station notified

      `

    );

  }

  else {

    deviceMarker.setPopupContent(

      `

        <strong>
          📍 YOUR LOCATION
        </strong>

        <br><br>

        <b>
          ${building}
        </b>

        <br>

        Floor ${floor}

        <br>

        ${zone}

      `

    );

  }


  /* =======================================================
     POLICE MARKER
     ======================================================= */

  if (policeMarker) {

    policeMarker.setLatLng(

      [
        POLICE_LAT,
        POLICE_LNG
      ]

    );

  }


  /* =======================================================
     FIRE STATION MARKER
     ======================================================= */

  if (fireStationMarker) {

    fireStationMarker.setLatLng(

      [
        FIRE_STATION_LAT,
        FIRE_STATION_LNG
      ]

    );

  }


  /* =======================================================
     UPDATE POLICE LINE
     ======================================================= */

  if (deviceToPoliceLine) {

    deviceToPoliceLine.setLatLngs(

      [

        [
          currentLat,
          currentLng
        ],

        [
          POLICE_LAT,
          POLICE_LNG
        ]

      ]

    );

  }


  /* =======================================================
     UPDATE FIRE STATION LINE
     ======================================================= */

  if (deviceToFireStationLine) {

    deviceToFireStationLine.setLatLngs(

      [

        [
          currentLat,
          currentLng
        ],

        [
          FIRE_STATION_LAT,
          FIRE_STATION_LNG
        ]

      ]

    );

  }


  /* =======================================================
     FIRE
     
     SHOW RESPONSE LINES.
     
     NO fitBounds().
     ======================================================= */

  if (fireAlert) {

    if (
      deviceToPoliceLine &&
      !map.hasLayer(
        deviceToPoliceLine
      )
    ) {

      deviceToPoliceLine.addTo(
        map
      );

    }


    if (
      deviceToFireStationLine &&
      !map.hasLayer(
        deviceToFireStationLine
      )
    ) {

      deviceToFireStationLine.addTo(
        map
      );

    }

  }


  /* =======================================================
     SAFE / HEAT
     
     HIDE RESPONSE LINES.
     
     NO fitBounds().
     ======================================================= */

  else {

    if (
      deviceToPoliceLine &&
      map.hasLayer(
        deviceToPoliceLine
      )
    ) {

      map.removeLayer(
        deviceToPoliceLine
      );

    }


    if (
      deviceToFireStationLine &&
      map.hasLayer(
        deviceToFireStationLine
      )
    ) {

      map.removeLayer(
        deviceToFireStationLine
      );

    }

  }


  /* =======================================================
     FIRE MAP BORDER
     ======================================================= */

  const mapElement =
    $("map");


  if (mapElement) {

    mapElement.classList.toggle(
      "fire-focus",
      fireAlert
    );

  }

}


/* =========================================================
   LOCATION
   ========================================================= */

function updateLocation(data) {

  const building =
    data?.building ??
    "ABC Apartments";


  const floor =
    data?.floor ??
    "3";


  const zone =
    data?.zone ??
    "Room 302";


  if (elements.location) {

    elements.location.textContent =
      `${building} • Floor ${floor} • ${zone}`;

  }

}


/* =========================================================
   DEVICE INFO
   ========================================================= */

function updateDeviceInfo(data) {

  if (elements.deviceId) {

    elements.deviceId.textContent =
      data?.deviceId ??
      DEVICE_ID;

  }


  if (elements.building) {

    elements.building.textContent =
      data?.building ??
      "ABC Apartments";

  }


  if (elements.floor) {

    elements.floor.textContent =
      data?.floor ??
      "3";

  }


  if (elements.zone) {

    elements.zone.textContent =
      data?.zone ??
      "Room 302";

  }

}


/* =========================================================
   TOP BAR
   ========================================================= */

function updateTopBar() {

  if (elements.lastUpdate) {

    elements.lastUpdate.textContent =
      currentTime();

  }


  if (elements.deviceTopDot) {

    elements.deviceTopDot.classList.add(
      "online"
    );

    elements.deviceTopDot.classList.remove(
      "offline"
    );

  }


  if (elements.deviceTopStatus) {

    elements.deviceTopStatus.textContent =
      "Device Online";

  }


  if (elements.deviceConn) {

    elements.deviceConn.textContent =
      "Online";

  }

}


/* =========================================================
   HEAT SENSOR
   ========================================================= */

function updateHeat(
  heatData
) {

  const resistance =
    numberValue(

      heatData?.resistance,

      0

    );


  const threshold =
    numberValue(

      heatData?.fireThreshold,

      DEFAULT_FIRE_THRESHOLD

    );


  const heatDetected =

    heatData?.alert === true

    ||

    (
      resistance > 0 &&
      resistance <= threshold
    );


  /* -------------------------------------------------------
     DISPLAY
     ------------------------------------------------------- */

  if (elements.flame) {

    if (resistance > 0) {

      elements.flame.textContent =

        `${(
          resistance / 1000
        ).toFixed(2)} kΩ`;

    }

    else {

      elements.flame.textContent =
        "—";

    }

  }


  /* -------------------------------------------------------
     STATE
     ------------------------------------------------------- */

  if (elements.heatState) {

    elements.heatState.textContent =

      heatDetected
        ? "HEAT DETECTED"
        : "SAFE";

  }


  /* -------------------------------------------------------
     CARD
     ------------------------------------------------------- */

  if (elements.heatCard) {

    elements.heatCard.classList.toggle(
      "alert",
      heatDetected
    );

    elements.heatCard.classList.toggle(
      "safe",
      !heatDetected
    );

  }


  return {

    resistance,

    threshold,

    heatDetected

  };

}


/* =========================================================
   MQ-2
   ========================================================= */

function updateGas(
  gasData,
  heatDetected
) {

  const gasRaw =
    numberValue(

      gasData?.raw,

      0

    );


  const gasThreshold =
    numberValue(

      gasData?.threshold,

      DEFAULT_GAS_THRESHOLD

    );


  const gasDetected =

    gasData?.alert === true

    ||

    gasRaw >= gasThreshold;


  /* -------------------------------------------------------
     DISPLAY
     ------------------------------------------------------- */

  if (elements.gas) {

    elements.gas.textContent =
      gasRaw;

  }


  /* -------------------------------------------------------
     STATUS
     ------------------------------------------------------- */

  if (elements.gasState) {

    if (!heatDetected) {

      elements.gasState.textContent =
        "WAITING FOR HEAT";

    }

    else if (gasDetected) {

      elements.gasState.textContent =
        "SMOKE DETECTED";

    }

    else {

      elements.gasState.textContent =
        "SAFE";

    }

  }


  const gasAlert =
    heatDetected &&
    gasDetected;


  /* -------------------------------------------------------
     CARD
     ------------------------------------------------------- */

  if (elements.gasCard) {

    elements.gasCard.classList.toggle(
      "alert",
      gasAlert
    );

    elements.gasCard.classList.toggle(
      "safe",
      !gasAlert
    );

  }


  return {

    gasRaw,

    gasThreshold,

    gasDetected

  };

}


/* =========================================================
   FIRE DETECTION SEQUENCE
   ========================================================= */

function updateSequence(

  heatDetected,

  gasDetected,

  fireAlert,

  confirmationCount,

  requiredCount

) {

  /* =======================================================
     HEAT
     ======================================================= */

  if (elements.stepHeat) {

    elements.stepHeat.classList.toggle(
      "active",
      heatDetected
    );

    elements.stepHeat.classList.toggle(
      "complete",
      heatDetected
    );

  }


  if (elements.stepHeatStatus) {

    elements.stepHeatStatus.textContent =

      heatDetected
        ? "Heat detected"
        : "Waiting";

  }


  /* =======================================================
     SMOKE
     ======================================================= */

  const smokeCheck =
    heatDetected &&
    gasDetected;


  if (elements.stepSmoke) {

    elements.stepSmoke.classList.toggle(
      "active",
      smokeCheck
    );

    elements.stepSmoke.classList.toggle(
      "complete",
      smokeCheck
    );

  }


  if (elements.stepSmokeStatus) {

    if (!heatDetected) {

      elements.stepSmokeStatus.textContent =
        "Waiting for heat";

    }

    else if (!gasDetected) {

      elements.stepSmokeStatus.textContent =
        "Smoke not detected";

    }

    else {

      elements.stepSmokeStatus.textContent =
        "Smoke detected";

    }

  }


  /* =======================================================
     FIRE
     ======================================================= */

  if (elements.stepFire) {

    elements.stepFire.classList.toggle(
      "active",
      fireAlert
    );

    elements.stepFire.classList.toggle(
      "complete",
      fireAlert
    );

  }


  if (elements.stepFireStatus) {

    if (fireAlert) {

      elements.stepFireStatus.textContent =
        "FIRE CONFIRMED";

    }

    else if (
      heatDetected &&
      gasDetected
    ) {

      elements.stepFireStatus.textContent =
        `Confirming ${confirmationCount}/${requiredCount}`;

    }

    else {

      elements.stepFireStatus.textContent =
        "Not confirmed";

    }

  }

}


/* =========================================================
   MAIN STATUS
   ========================================================= */

function updateMainStatus(

  fireAlert,

  heatDetected,

  gasDetected

) {

  /* =======================================================
     FIRE
     ======================================================= */

  if (fireAlert) {

    if (elements.statusValue) {

      elements.statusValue.textContent =
        "FIRE";

    }


    if (elements.statusText) {

      elements.statusText.textContent =
        "FIRE CONFIRMED";

    }


    if (elements.statusDescription) {

      elements.statusDescription.textContent =
        "Heat and smoke detected. Immediate attention required.";

    }


    if (elements.mainStatus) {

      elements.mainStatus.classList.add(
        "fire"
      );

      elements.mainStatus.classList.remove(
        "safe",
        "heat"
      );

    }


    if (elements.statusDot) {

      elements.statusDot.classList.add(
        "fire"
      );

      elements.statusDot.classList.remove(
        "safe",
        "heat"
      );

    }


    if (elements.alarm) {

      elements.alarm.textContent =
        "🔥 FIRE ALARM ACTIVE";

      elements.alarm.classList.add(
        "active"
      );

    }

  }


  /* =======================================================
     HEAT
     ======================================================= */

  else if (heatDetected) {

    if (elements.statusValue) {

      elements.statusValue.textContent =
        "HEAT";

    }


    if (elements.statusText) {

      elements.statusText.textContent =
        "HEAT DETECTED";

    }


    if (elements.statusDescription) {

      elements.statusDescription.textContent =

        gasDetected

          ? "Smoke detected. Checking for fire confirmation..."

          : "High temperature detected. Monitoring for smoke.";

    }


    if (elements.mainStatus) {

      elements.mainStatus.classList.add(
        "heat"
      );

      elements.mainStatus.classList.remove(
        "safe",
        "fire"
      );

    }


    if (elements.statusDot) {

      elements.statusDot.classList.add(
        "heat"
      );

      elements.statusDot.classList.remove(
        "safe",
        "fire"
      );

    }


    if (elements.alarm) {

      elements.alarm.textContent =
        "Heat detected — monitoring";

      elements.alarm.classList.remove(
        "active"
      );

    }

  }


  /* =======================================================
     SAFE
     ======================================================= */

  else {

    if (elements.statusValue) {

      elements.statusValue.textContent =
        "SAFE";

    }


    if (elements.statusText) {

      elements.statusText.textContent =
        "SYSTEM SAFE";

    }


    if (elements.statusDescription) {

      elements.statusDescription.textContent =
        "No fire conditions detected.";

    }


    if (elements.mainStatus) {

      elements.mainStatus.classList.add(
        "safe"
      );

      elements.mainStatus.classList.remove(
        "heat",
        "fire"
      );

    }


    if (elements.statusDot) {

      elements.statusDot.classList.add(
        "safe"
      );

      elements.statusDot.classList.remove(
        "heat",
        "fire"
      );

    }


    if (elements.alarm) {

      elements.alarm.textContent =
        "No alarm";

      elements.alarm.classList.remove(
        "active"
      );

    }

  }

}


/* =========================================================
   EMERGENCY PANEL
   ========================================================= */

function createEmergencyPanel() {

  if (
    $("emergencyResponsePanel")
  ) {

    return;

  }


  const panel =
    document.createElement("div");


  panel.id =
    "emergencyResponsePanel";


  panel.innerHTML = `

    <div class="emergency-response-inner">

      <div class="emergency-response-header">

        <div class="emergency-response-icon">
          🚨
        </div>

        <div>

          <div class="emergency-response-title">
            EMERGENCY RESPONSE
          </div>

          <div class="emergency-response-subtitle">
            Fire location response
          </div>

        </div>

      </div>


      <div class="response-status">

        <div class="response-check">
          ✓
        </div>

        <div class="response-content">

          <div class="response-title">
            Location sent to Police Station
          </div>

          <div class="response-detail">
            🚓 Police response point
          </div>

        </div>

      </div>


      <div class="response-status">

        <div class="response-check">
          ✓
        </div>

        <div class="response-content">

          <div class="response-title">
            Location sent to Fire Station
          </div>

          <div class="response-detail">
            🚒 Fire response point
          </div>

        </div>

      </div>


      <div class="response-location">

        <div class="response-location-title">
          📍 FIRE LOCATION
        </div>

        <div
          id="responseBuilding"
          class="response-location-value"
        >
          —
        </div>

        <div
          id="responseFloorZone"
          class="response-location-detail"
        >
          —
        </div>

      </div>


      <div class="response-distance">

        <div>

          Police distance:

          <strong id="policeDistance">
            —
          </strong>

        </div>


        <div>

          Fire station distance:

          <strong id="fireStationDistance">
            —
          </strong>

        </div>

      </div>

    </div>

  `;


  const mapElement =
    $("map");


  if (
    mapElement
  ) {

    const mapCard =
      mapElement.closest(
        ".map-card"
      );


    if (
      mapCard &&
      mapCard.parentElement
    ) {

      mapCard.parentElement.insertBefore(
        panel,
        mapCard
      );

    }

  }

}


/* =========================================================
   SHOW EMERGENCY PANEL
   ========================================================= */

function showEmergencyPanel(
  data
) {

  createEmergencyPanel();


  const panel =
    $("emergencyResponsePanel");


  if (!panel) {

    return;

  }


  const building =
    data?.building ??
    "ABC Apartments";


  const floor =
    data?.floor ??
    "3";


  const zone =
    data?.zone ??
    "Room 302";


  if (
    $("responseBuilding")
  ) {

    $("responseBuilding").textContent =
      building;

  }


  if (
    $("responseFloorZone")
  ) {

    $("responseFloorZone").textContent =
      `Floor ${floor} • ${zone}`;

  }


  const policeDistance =
    distanceKm(

      currentLat,
      currentLng,

      POLICE_LAT,
      POLICE_LNG

    );


  const fireDistance =
    distanceKm(

      currentLat,
      currentLng,

      FIRE_STATION_LAT,
      FIRE_STATION_LNG

    );


  if (
    $("policeDistance")
  ) {

    $("policeDistance").textContent =
      `${policeDistance.toFixed(2)} km`;

  }


  if (
    $("fireStationDistance")
  ) {

    $("fireStationDistance").textContent =
      `${fireDistance.toFixed(2)} km`;

  }


  panel.classList.add(
    "show"
  );

}


/* =========================================================
   HIDE EMERGENCY PANEL
   ========================================================= */

function hideEmergencyPanel() {

  const panel =
    $("emergencyResponsePanel");


  if (panel) {

    panel.classList.remove(
      "show"
    );

  }

}


/* =========================================================
   FIRE POPUP
   ========================================================= */

function createFirePopup() {

  if (
    $("firePopup")
  ) {

    return;

  }


  const popup =
    document.createElement("div");


  popup.id =
    "firePopup";


  popup.innerHTML = `

    <div class="fire-popup-overlay">

      <div class="fire-popup-box">

        <div class="fire-popup-icon">
          🔥
        </div>

        <div class="fire-popup-title">
          FIRE ALERT
        </div>

        <div class="fire-popup-message">
          Fire conditions detected!
        </div>


        <div class="fire-popup-details">

          <div>

            <strong>
              Building
            </strong>

            <span id="popupBuilding">
              —
            </span>

          </div>


          <div>

            <strong>
              Floor
            </strong>

            <span id="popupFloor">
              —
            </span>

          </div>


          <div>

            <strong>
              Zone
            </strong>

            <span id="popupZone">
              —
            </span>

          </div>

        </div>


        <div class="fire-popup-map-wrap">

          <div
            id="popupMap"
            class="fire-popup-map"
          ></div>

        </div>


        <div class="popup-dispatch-message">

          <div class="popup-dispatch-title">
            🚨 EMERGENCY RESPONSE
          </div>

          <div class="popup-dispatch-item">
            ✓ Location sent to Police Station
          </div>

          <div class="popup-dispatch-item">
            ✓ Location sent to Fire Station
          </div>

        </div>


        <button
          id="acknowledgeFire"
          type="button"
        >
          ACKNOWLEDGE
        </button>

      </div>

    </div>

  `;


  document.body.appendChild(
    popup
  );


  const button =
    $("acknowledgeFire");


  if (button) {

    button.addEventListener(
      "click",
      hideFirePopup
    );

  }

}


/* =========================================================
   POPUP MAP
   ========================================================= */

function createPopupMap() {

  const popupMapElement =
    $("popupMap");


  if (
    !popupMapElement ||
    typeof L === "undefined"
  ) {

    return;

  }


  if (popupMap) {

    popupMap.invalidateSize();

    return;

  }


  popupMap =
    L.map(
      "popupMap",
      {
        zoomControl: true,

        attributionControl: false
      }
    );


  L.tileLayer(

    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    {
      maxZoom: 19
    }

  ).addTo(
    popupMap
  );


  popupDeviceMarker =
    L.marker(

      [
        currentLat,
        currentLng
      ],

      {
        icon:
          markerIcon("fire")
      }

    ).addTo(
      popupMap
    );


  popupDeviceMarker.bindTooltip(
    "🔥 FIRE LOCATION",
    {
      permanent: true,
      direction: "top"
    }
  );


  const police =
    L.marker(

      [
        POLICE_LAT,
        POLICE_LNG
      ],

      {
        icon:
          markerIcon("police")
      }

    ).addTo(
      popupMap
    );


  police.bindTooltip(
    "🚓 POLICE STATION",
    {
      permanent: true,
      direction: "top"
    }
  );


  const fireStation =
    L.marker(

      [
        FIRE_STATION_LAT,
        FIRE_STATION_LNG
      ],

      {
        icon:
          markerIcon("fireStation")
      }

    ).addTo(
      popupMap
    );


  fireStation.bindTooltip(
    "🚒 FIRE STATION",
    {
      permanent: true,
      direction: "top"
    }
  );


  const bounds =
    L.latLngBounds([

      [
        currentLat,
        currentLng
      ],

      [
        POLICE_LAT,
        POLICE_LNG
      ],

      [
        FIRE_STATION_LAT,
        FIRE_STATION_LNG
      ]

    ]);


  popupMap.fitBounds(

    bounds,

    {
      padding:
        [35, 35]
    }

  );

}


/* =========================================================
   SHOW FIRE POPUP
   ========================================================= */

function showFirePopup(
  data
) {

  createFirePopup();


  const popup =
    $("firePopup");


  if (!popup) {

    return;

  }


  const building =
    data?.building ??
    "ABC Apartments";


  const floor =
    data?.floor ??
    "3";


  const zone =
    data?.zone ??
    "Room 302";


  if (
    $("popupBuilding")
  ) {

    $("popupBuilding").textContent =
      building;

  }


  if (
    $("popupFloor")
  ) {

    $("popupFloor").textContent =
      floor;

  }


  if (
    $("popupZone")
  ) {

    $("popupZone").textContent =
      zone;

  }


  popup.classList.add(
    "show"
  );


  document.body.classList.add(
    "fire-active"
  );


  setTimeout(

    () => {

      createPopupMap();


      if (
        popupMap &&
        popupDeviceMarker
      ) {

        popupDeviceMarker.setLatLng(

          [
            currentLat,
            currentLng
          ]

        );


        popupMap.invalidateSize();

      }

    },

    200

  );

}


/* =========================================================
   HIDE FIRE POPUP
   ========================================================= */

function hideFirePopup() {

  const popup =
    $("firePopup");


  if (popup) {

    popup.classList.remove(
      "show"
    );

  }


  document.body.classList.remove(
    "fire-active"
  );

}


/* =========================================================
   PROCESS FIREBASE DATA
   ========================================================= */

function processFirebaseData(
  data
) {

  if (!data) {

    console.warn(
      "No Firebase data found:",
      DATA_PATH
    );

    return;

  }


  console.log(
    "Firebase data:",
    data
  );


  /* =======================================================
     LOCATION
     ======================================================= */

  updateLocation(
    data
  );


  /* =======================================================
     DEVICE
     ======================================================= */

  updateDeviceInfo(
    data
  );


  /* =======================================================
     TOP BAR
     ======================================================= */

  updateTopBar();


  /* =======================================================
     HEAT FIRST
     ======================================================= */

  const heat =
    updateHeat(
      data.sensors?.heat
    );


  /* =======================================================
     MQ-2 SECOND
     ======================================================= */

  const gas =
    updateGas(

      data.sensors?.gas,

      heat.heatDetected

    );


  /* =======================================================
     FIRE
     ======================================================= */

  const fireAlert =

    data.fireAlert === true

    ||

    data.status === "FIRE";


  /* =======================================================
     CONFIRMATION
     ======================================================= */

  const confirmationCount =
    numberValue(

      data.fireConfirmation?.count,

      0

    );


  const requiredCount =
    numberValue(

      data.fireConfirmation?.required,

      3

    );


  /* =======================================================
     SEQUENCE
     ======================================================= */

  updateSequence(

    heat.heatDetected,

    gas.gasDetected,

    fireAlert,

    confirmationCount,

    requiredCount

  );


  /* =======================================================
     MAIN STATUS
     ======================================================= */

  updateMainStatus(

    fireAlert,

    heat.heatDetected,

    gas.gasDetected

  );


  /* =======================================================
     MAP
     ======================================================= */

  updateMap(

    data,

    fireAlert

  );


  /* =======================================================
     EMERGENCY RESPONSE
     ======================================================= */

  if (fireAlert) {

    showEmergencyPanel(
      data
    );


    showFirePopup(
      data
    );

  }

  else {

    hideEmergencyPanel();


    if (previousFireState) {

      hideFirePopup();

    }

  }


  previousFireState =
    fireAlert;

}


/* =========================================================
   FIREBASE CONNECTION
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


    if (elements.fbDot) {

      elements.fbDot.classList.toggle(
        "online",
        connected
      );

      elements.fbDot.classList.toggle(
        "offline",
        !connected
      );

    }


    if (elements.fbStatus) {

      elements.fbStatus.textContent =

        connected
          ? "Connected"
          : "Disconnected";

    }

  },

  (error) => {

    console.error(
      "Firebase connection error:",
      error
    );


    if (elements.fbStatus) {

      elements.fbStatus.textContent =
        "Connection Error";

    }

  }

);


/* =========================================================
   DEVICE LISTENER
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


    processFirebaseData(
      data
    );

  },

  (error) => {

    console.error(
      "Firebase device error:",
      error
    );


    if (
      elements.deviceTopStatus
    ) {

      elements.deviceTopStatus.textContent =
        "Firebase Error";

    }


    if (
      elements.deviceConn
    ) {

      elements.deviceConn.textContent =
        "Connection Error";

    }

  }

);


/* =========================================================
   START
   ========================================================= */

createFirePopup();

createEmergencyPanel();

initMap();


console.log(
  "SMART FIRE GUARDIAN STARTED"
);

console.log(
  `Database: /${DATA_PATH}`
);

console.log(
  "Map zoom is controlled by user."
);
