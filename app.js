import { db } from "./firebase-config.js";

import {
  ref,
  onValue,
  push,
  set
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
   LOCATIONS
   ========================================================= */

/* YOUR LOCATION */

const DEFAULT_LAT =
  15.855881303189477;

const DEFAULT_LNG =
  74.57802140000477;


/* POLICE */

const POLICE_LAT =
  15.881842260513212;

const POLICE_LNG =
  74.52917008030238;


/* FIRE STATION */

const FIRE_STATION_LAT =
  15.845029016505203;

const FIRE_STATION_LNG =
  74.50745329043593;


/* =========================================================
   MAP VARIABLES
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

let popupPoliceMarker = null;

let popupFireStationMarker = null;

let popupPoliceLine = null;

let popupFireStationLine = null;


/* =========================================================
   CURRENT LOCATION
   ========================================================= */

let currentLat =
  DEFAULT_LAT;

let currentLng =
  DEFAULT_LNG;


/* =========================================================
   FIRE STATE
   ========================================================= */

let previousFireState = false;


/*
   Prevent duplicate fire logs.
*/

let lastLoggedFireKey =
  localStorage.getItem(
    `smartFireLastLog_${DEVICE_ID}`
  ) || "";


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
    $("deviceConn"),

  mapStatus:
    $("mapStatus"),

  recentFireLogs:
    $("recentFireLogs")

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
   DATE / TIME FOR LOG
   ========================================================= */

function currentDateTime() {

  return new Date().toLocaleString(
    [],
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
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
    Math.sin(dLat / 2) +

    Math.cos(
      lat1 * Math.PI / 180
    ) *

    Math.cos(
      lat2 * Math.PI / 180
    ) *

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
   ========================================================= */

function markerIcon(type) {

  let emoji = "📍";

  let className = "safe";


  if (type === "police") {

    emoji = "🚓";

    className = "police";

  }


  else if (type === "fireStation") {

    emoji = "🚒";

    className = "station";

  }


  else if (type === "fire") {

    emoji = "🔥";

    className = "fire";

  }


  return L.divIcon({

    className: "sf-marker",

    html: `
      <div class="sf-marker-pin ${className}">
        <span>${emoji}</span>
      </div>
    `,

    iconSize: [
      32,
      32
    ],

    iconAnchor: [
      16,
      32
    ],

    popupAnchor: [
      0,
      -32
    ]

  });

}


/* =========================================================
   PERMANENT MAP LABEL
   ========================================================= */

function addPermanentLabel(
  marker,
  text,
  className
) {

  marker.bindTooltip(
    text,
    {
      permanent: true,
      direction: "top",
      offset: [
        0,
        -28
      ],
      className
    }
  );

}


/* =========================================================
   INITIALIZE MAIN MAP
   ========================================================= */

function initMap() {

  const mapElement =
    $("map");


  if (!mapElement) {

    console.error(
      "ERROR: #map not found."
    );

    return;

  }


  if (
    typeof L === "undefined"
  ) {

    console.error(
      "ERROR: Leaflet is not loaded."
    );

    return;

  }


  /*
     Create map.

     IMPORTANT:
     We do NOT call fitBounds during Firebase updates.
  */

  map =
    L.map(
      "map",
      {
        zoomControl: true,
        attributionControl: true
      }
    ).setView(
      [
        DEFAULT_LAT,
        DEFAULT_LNG
      ],
      15
    );


  /*
     OpenStreetMap
  */

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; OpenStreetMap'
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


  deviceMarker.bindPopup(
    `
      <strong>
        📍 YOUR LOCATION
      </strong>

      <br><br>

      Device:
      ${DEVICE_ID}
    `
  );


  addPermanentLabel(
    deviceMarker,
    "📍 YOUR LOCATION",
    "your-location-label"
  );


  /* =======================================================
     POLICE
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


  policeMarker.bindPopup(
    `
      <strong>
        🚓 NEAREST POLICE STATION
      </strong>

      <br><br>

      Emergency response point
    `
  );


  addPermanentLabel(
    policeMarker,
    "🚓 NEAREST POLICE STATION",
    "police-location-label"
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


  fireStationMarker.bindPopup(
    `
      <strong>
        🚒 NEAREST FIRE STATION
      </strong>

      <br><br>

      Emergency response point
    `
  );


  addPermanentLabel(
    fireStationMarker,
    "🚒 NEAREST FIRE STATION",
    "fire-station-location-label"
  );


  /* =======================================================
     MAIN MAP POLICE LINE
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
        opacity: 0.85,
        dashArray: "10,8"
      }
    );


  /* =======================================================
     MAIN MAP FIRE STATION LINE
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
        opacity: 0.85,
        dashArray: "10,8"
      }
    );


  /*
     Lines start hidden.
  */

  if (
    $("mapStatus")
  ) {

    $("mapStatus").textContent =
      "Monitoring";

  }


  /*
     Initial view includes all three locations.
     This happens ONLY ONCE.
  */

  const bounds =
    L.latLngBounds([
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
    ]);


  map.fitBounds(
    bounds,
    {
      padding: [
        50,
        50
      ]
    }
  );


  /*
     Important for browser rendering.
  */

  setTimeout(
    () => {

      if (map) {

        map.invalidateSize();

      }

    },
    300
  );


  console.log(
    "SMART FIRE GUARDIAN MAP READY"
  );

}


/* =========================================================
   UPDATE MAIN MAP
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
     GET DEVICE COORDINATES
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
     MOVE DEVICE
     ======================================================= */

  deviceMarker.setLatLng(
    [
      currentLat,
      currentLng
    ]
  );


  deviceMarker.setIcon(
    markerIcon(
      fireAlert
        ? "fire"
        : "safe"
    )
  );


  /* =======================================================
     DEVICE POPUP
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


  if (fireAlert) {

    deviceMarker.setPopupContent(
      `
        <strong style="color:#b91c1c">
          🔥 FIRE ALERT
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

        🚓 Location sent to Police Station

        <br>

        🚒 Location sent to Fire Station
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
     UPDATE LINES
     ======================================================= */

  if (
    deviceToPoliceLine
  ) {

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


  if (
    deviceToFireStationLine
  ) {

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
     SHOW / HIDE RESPONSE LINES
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


    if (
      $("mapStatus")
    ) {

      $("mapStatus").textContent =
        "🚨 Emergency Response Active";

    }


    const mapElement =
      $("map");

    if (mapElement) {

      mapElement.classList.add(
        "fire-focus"
      );

    }

  }

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


    if (
      $("mapStatus")
    ) {

      $("mapStatus").textContent =
        "Monitoring";

    }


    const mapElement =
      $("map");

    if (mapElement) {

      mapElement.classList.remove(
        "fire-focus"
      );

    }

  }


  /*
     IMPORTANT:

     There is NO map.setView()
     and NO fitBounds() here.

     Therefore Firebase updates will NOT
     destroy the user's zoom.
  */

}


/* =========================================================
   CREATE POPUP
   ========================================================= */

function prepareFirePopup() {

  const popup =
    $("firePopup");


  if (!popup) {

    return;

  }


  const acknowledge =
    $("acknowledgeFire");


  if (
    acknowledge &&
    !acknowledge.dataset.bound
  ) {

    acknowledge.dataset.bound =
      "true";


    acknowledge.addEventListener(
      "click",
      () => {

        hideFirePopup();

      }
    );

  }

}


/* =========================================================
   INITIALIZE POPUP MAP
   ========================================================= */

function initPopupMap() {

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


  /* =======================================================
     POPUP DEVICE
     ======================================================= */

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
    "📍 YOUR LOCATION",
    {
      permanent: true,
      direction: "top",
      offset: [
        0,
        -30
      ],
      className:
        "popup-your-label"
    }
  );


  /* =======================================================
     POPUP POLICE
     ======================================================= */

  popupPoliceMarker =
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


  popupPoliceMarker.bindTooltip(
    "🚓 POLICE STATION",
    {
      permanent: true,
      direction: "top",
      offset: [
        0,
        -30
      ],
      className:
        "popup-police-label"
    }
  );


  /* =======================================================
     POPUP FIRE STATION
     ======================================================= */

  popupFireStationMarker =
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


  popupFireStationMarker.bindTooltip(
    "🚒 FIRE STATION",
    {
      permanent: true,
      direction: "top",
      offset: [
        0,
        -30
      ],
      className:
        "popup-fire-label"
    }
  );


  /* =======================================================
     POPUP → POLICE LINE
     ======================================================= */

  popupPoliceLine =
    L.polyline(
      [
        [
          currentLat,
          currentLng
        ],
        [
          POLICE_LAT,
          POLICE_LNG
        ]
      ],
      {
        weight: 4,
        opacity: 0.9,
        dashArray: "8,7"
      }
    ).addTo(
      popupMap
    );


  /* =======================================================
     POPUP → FIRE STATION LINE
     ======================================================= */

  popupFireStationLine =
    L.polyline(
      [
        [
          currentLat,
          currentLng
        ],
        [
          FIRE_STATION_LAT,
          FIRE_STATION_LNG
        ]
      ],
      {
        weight: 4,
        opacity: 0.9,
        dashArray: "8,7"
      }
    ).addTo(
      popupMap
    );


  /* =======================================================
     FIT POPUP MAP
     ======================================================= */

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
      padding: [
        35,
        35
      ]
    }
  );


  setTimeout(
    () => {

      if (popupMap) {

        popupMap.invalidateSize();

      }

    },
    300
  );

}


/* =========================================================
   UPDATE POPUP MAP
   ========================================================= */

function updatePopupMap() {

  if (
    !popupMap
  ) {

    return;

  }


  if (
    popupDeviceMarker
  ) {

    popupDeviceMarker.setLatLng(
      [
        currentLat,
        currentLng
      ]
    );

  }


  if (
    popupPoliceLine
  ) {

    popupPoliceLine.setLatLngs(
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


  if (
    popupFireStationLine
  ) {

    popupFireStationLine.setLatLngs(
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


  setTimeout(
    () => {

      if (popupMap) {

        popupMap.invalidateSize();

      }

    },
    100
  );

}


/* =========================================================
   SHOW FIRE POPUP
   ========================================================= */

function showFirePopup(
  data
) {

  prepareFirePopup();


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


  /*
     Wait until popup becomes visible,
     then Leaflet can calculate its size.
  */

  setTimeout(
    () => {

      initPopupMap();

      updatePopupMap();

    },
    150
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


  /*
     IMPORTANT:

     We DO NOT remove recent fire logs.
  */

}


/* =========================================================
   LOCATION
   ========================================================= */

function updateLocation(
  data
) {

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
    elements.location
  ) {

    elements.location.textContent =
      `${building} • Floor ${floor} • ${zone}`;

  }

}


/* =========================================================
   DEVICE INFO
   ========================================================= */

function updateDeviceInfo(
  data
) {

  if (
    elements.deviceId
  ) {

    elements.deviceId.textContent =
      data?.deviceId ??
      DEVICE_ID;

  }


  if (
    elements.building
  ) {

    elements.building.textContent =
      data?.building ??
      "ABC Apartments";

  }


  if (
    elements.floor
  ) {

    elements.floor.textContent =
      data?.floor ??
      "3";

  }


  if (
    elements.zone
  ) {

    elements.zone.textContent =
      data?.zone ??
      "Room 302";

  }

}


/* =========================================================
   TOP BAR
   ========================================================= */

function updateTopBar() {

  if (
    elements.lastUpdate
  ) {

    elements.lastUpdate.textContent =
      currentTime();

  }


  if (
    elements.deviceTopDot
  ) {

    elements.deviceTopDot.classList.add(
      "online"
    );

    elements.deviceTopDot.classList.remove(
      "offline"
    );

  }


  if (
    elements.deviceTopStatus
  ) {

    elements.deviceTopStatus.textContent =
      "Device Online";

  }


  if (
    elements.deviceConn
  ) {

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
    resistance > 0 &&
    resistance <= threshold;


  if (
    elements.flame
  ) {

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


  if (
    elements.heatState
  ) {

    elements.heatState.textContent =
      heatDetected
        ? "🔥 HEAT DETECTED"
        : "🟢 SAFE";

  }


  if (
    elements.heatCard
  ) {

    elements.heatCard.classList.toggle(
      "alert",
      heatDetected
    );

  }


  return {

    heatDetected,

    resistance,

    threshold

  };

}


/* =========================================================
   GAS SENSOR
   ========================================================= */

function updateGas(
  gasData,
  heatDetected
) {

  const raw =
    numberValue(
      gasData?.raw,
      0
    );


  const threshold =
    numberValue(
      gasData?.threshold,
      DEFAULT_GAS_THRESHOLD
    );


  /*
     Smoke is considered for FIRE
     only after heat is detected.
  */

  const gasDetected =
    heatDetected &&
    raw >= threshold;


  if (
    elements.gas
  ) {

    elements.gas.textContent =
      raw;

  }


  if (
    elements.gasState
  ) {

    if (!heatDetected) {

      elements.gasState.textContent =
        "Waiting for heat";

    }

    else if (gasDetected) {

      elements.gasState.textContent =
        "🚨 SMOKE / GAS DETECTED";

    }

    else {

      elements.gasState.textContent =
        "🟢 SAFE";

    }

  }


  if (
    elements.gasCard
  ) {

    elements.gasCard.classList.toggle(
      "alert",
      gasDetected
    );

  }


  return {

    gasDetected,

    raw,

    threshold

  };

}


/* =========================================================
   FIRE SEQUENCE
   ========================================================= */

function updateSequence(
  heatDetected,
  gasDetected,
  fireAlert,
  confirmationCount,
  requiredCount
) {


  /* =======================================================
     STEP 1
     ======================================================= */

  if (
    elements.stepHeat
  ) {

    elements.stepHeat.classList.toggle(
      "active",
      heatDetected
    );

  }


  if (
    elements.stepHeatStatus
  ) {

    elements.stepHeatStatus.textContent =
      heatDetected
        ? "✓ Heat detected"
        : "✓ No dangerous heat";

  }


  /* =======================================================
     STEP 2
     ======================================================= */

  if (
    elements.stepSmoke
  ) {

    elements.stepSmoke.classList.toggle(
      "active",
      gasDetected
    );

  }


  if (
    elements.stepSmokeStatus
  ) {

    if (!heatDetected) {

      elements.stepSmokeStatus.textContent =
        "Waiting for heat";

    }

    else if (gasDetected) {

      elements.stepSmokeStatus.textContent =
        "✓ Smoke detected";

    }

    else {

      elements.stepSmokeStatus.textContent =
        "✓ No smoke";

    }

  }


  /* =======================================================
     STEP 3
     ======================================================= */

  if (
    elements.stepFire
  ) {

    elements.stepFire.classList.toggle(
      "active",
      fireAlert
    );

  }


  if (
    elements.stepFireStatus
  ) {

    if (fireAlert) {

      elements.stepFireStatus.textContent =
        "🔥 FIRE CONFIRMED";

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
        "Waiting";

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

    if (
      elements.statusValue
    ) {

      elements.statusValue.textContent =
        "FIRE";

    }


    if (
      elements.statusText
    ) {

      elements.statusText.textContent =
        "FIRE CONFIRMED";

    }


    if (
      elements.statusDescription
    ) {

      elements.statusDescription.textContent =
        "Heat and smoke conditions confirmed.";

    }


    if (
      elements.mainStatus
    ) {

      elements.mainStatus.classList.add(
        "fire"
      );

      elements.mainStatus.classList.remove(
        "safe",
        "heat"
      );

    }


    if (
      elements.statusDot
    ) {

      elements.statusDot.classList.add(
        "fire"
      );

      elements.statusDot.classList.remove(
        "safe",
        "heat"
      );

    }


    if (
      elements.alarm
    ) {

      elements.alarm.textContent =
        "🚨 FIRE ALARM ACTIVE";

      elements.alarm.classList.add(
        "active"
      );

    }

    return;

  }


  /* =======================================================
     HEAT ONLY
     ======================================================= */

  if (heatDetected) {

    if (
      elements.statusValue
    ) {

      elements.statusValue.textContent =
        "HEAT";

    }


    if (
      elements.statusText
    ) {

      elements.statusText.textContent =
        "HEAT DETECTED";

    }


    if (
      elements.statusDescription
    ) {

      elements.statusDescription.textContent =
        gasDetected
          ? "Smoke detected — confirming fire."
          : "Monitoring for smoke.";

    }


    if (
      elements.mainStatus
    ) {

      elements.mainStatus.classList.add(
        "heat"
      );

      elements.mainStatus.classList.remove(
        "safe",
        "fire"
      );

    }


    if (
      elements.statusDot
    ) {

      elements.statusDot.classList.add(
        "heat"
      );

      elements.statusDot.classList.remove(
        "safe",
        "fire"
      );

    }


    if (
      elements.alarm
    ) {

      elements.alarm.textContent =
        "Heat detected — monitoring";

      elements.alarm.classList.remove(
        "active"
      );

    }

    return;

  }


  /* =======================================================
     SAFE
     ======================================================= */

  if (
    elements.statusValue
  ) {

    elements.statusValue.textContent =
      "SAFE";

  }


  if (
    elements.statusText
  ) {

    elements.statusText.textContent =
      "SYSTEM SAFE";

  }


  if (
    elements.statusDescription
  ) {

    elements.statusDescription.textContent =
      "No fire conditions detected.";

  }


  if (
    elements.mainStatus
  ) {

    elements.mainStatus.classList.add(
      "safe"
    );

    elements.mainStatus.classList.remove(
      "fire",
      "heat"
    );

  }


  if (
    elements.statusDot
  ) {

    elements.statusDot.classList.add(
      "safe"
    );

    elements.statusDot.classList.remove(
      "fire",
      "heat"
    );

  }


  if (
    elements.alarm
  ) {

    elements.alarm.textContent =
      "No alarm";

    elements.alarm.classList.remove(
      "active"
    );

  }

}


/* =========================================================
   CREATE FIRE LOG
   ========================================================= */

async function createFireLog(
  data
) {

  const timestamp =
    Date.now();


  const logKey =
    `${DEVICE_ID}_${timestamp}`;


  /*
     Prevent duplicate log creation.
  */

  if (
    lastLoggedFireKey
  ) {

    /*
       Firebase may call the listener
       several times during one FIRE event.
    */

    const previousTimestamp =
      Number(
        lastLoggedFireKey.split("_")[1]
      );


    if (
      Number.isFinite(
        previousTimestamp
      ) &&
      timestamp -
        previousTimestamp <
        5000
    ) {

      return;

    }

  }


  lastLoggedFireKey =
    logKey;


  localStorage.setItem(
    `smartFireLastLog_${DEVICE_ID}`,
    logKey
  );


  const log = {

    deviceId:
      data?.deviceId ??
      DEVICE_ID,

    building:
      data?.building ??
      "ABC Apartments",

    floor:
      data?.floor ??
      "3",

    zone:
      data?.zone ??
      "Room 302",

    status:
      "FIRE",

    time:
      currentDateTime(),

    timestamp,

    latitude:
      currentLat,

    longitude:
      currentLng,

    gasRaw:
      numberValue(
        data?.sensors?.gas?.raw,
        0
      ),

    heatResistance:
      numberValue(
        data?.sensors?.heat?.resistance,
        0
      ),

    policeResponse:
      "Location sent to Police Station",

    fireStationResponse:
      "Location sent to Fire Station"

  };


  /*
     SAVE IN BROWSER TOO.

     This means the log remains visible
     even if Firebase write fails.
  */

  saveLocalFireLog(log);


  /*
     Save to Firebase.

     Path:
     /fireLogs/SF-003/<generated-key>
  */

  try {

    const logsRef =
      ref(
        db,
        `fireLogs/${DEVICE_ID}`
      );


    const newLogRef =
      push(logsRef);


    await set(
      newLogRef,
      log
    );


    console.log(
      "Fire log saved to Firebase:",
      log
    );

  }

  catch (error) {

    console.error(
      "Could not save fire log to Firebase:",
      error
    );

  }


  renderRecentFireLogs();

}


/* =========================================================
   SAVE LOCAL FIRE LOG
   ========================================================= */

function saveLocalFireLog(
  log
) {

  let logs = [];


  try {

    logs =
      JSON.parse(
        localStorage.getItem(
          `smartFireLogs_${DEVICE_ID}`
        ) || "[]"
      );

  }

  catch {

    logs = [];

  }


  logs.unshift(
    log
  );


  /*
     Keep only latest 10 locally.
  */

  logs =
    logs.slice(
      0,
      10
    );


  localStorage.setItem(
    `smartFireLogs_${DEVICE_ID}`,
    JSON.stringify(
      logs
    )
  );

}


/* =========================================================
   GET LOCAL FIRE LOGS
   ========================================================= */

function getLocalFireLogs() {

  try {

    return JSON.parse(
      localStorage.getItem(
        `smartFireLogs_${DEVICE_ID}`
      ) || "[]"
    );

  }

  catch {

    return [];

  }

}


/* =========================================================
   RENDER FIRE LOGS
   ========================================================= */

function renderRecentFireLogs() {

  const container =
    elements.recentFireLogs;


  if (!container) {

    return;

  }


  const logs =
    getLocalFireLogs();


  if (
    logs.length === 0
  ) {

    container.innerHTML = `
      <div class="no-fire-logs">
        No fire incidents recorded.
      </div>
    `;

    return;

  }


  container.innerHTML =
    logs
      .slice(0, 5)
      .map(
        (log) => {

          const heat =
            log.heatResistance > 0
              ? `${(
                  log.heatResistance /
                  1000
                ).toFixed(2)} kΩ`
              : "—";


          return `
            <div class="fire-log-item">

              <div class="fire-log-icon">
                🔥
              </div>

              <div class="fire-log-main">

                <div class="fire-log-title">
                  FIRE CONFIRMED
                </div>

                <div class="fire-log-location">
                  ${log.building}
                  • Floor ${log.floor}
                  • ${log.zone}
                </div>

                <div class="fire-log-meta">

                  <span>
                    🕒 ${log.time}
                  </span>

                  <span>
                    💨 MQ-2: ${log.gasRaw}
                  </span>

                  <span>
                    🌡️ ${heat}
                  </span>

                </div>

              </div>

            </div>
          `;

        }
      )
      .join("");

}


/* =========================================================
   PROCESS FIREBASE DATA
   ========================================================= */

function processFirebaseData(
  data
) {

  if (!data) {

    console.warn(
      "No Firebase data at:",
      DATA_PATH
    );

    return;

  }


  console.log(
    "Firebase data received:",
    data
  );


  /* =======================================================
     BASIC INFO
     ======================================================= */

  updateLocation(
    data
  );


  updateDeviceInfo(
    data
  );


  updateTopBar();


  /* =======================================================
     HEAT FIRST
     ======================================================= */

  const heat =
    updateHeat(
      data.sensors?.heat
    );


  /* =======================================================
     GAS SECOND
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
    data.fireAlert === true ||
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
     MAIN MAP
     ======================================================= */

  updateMap(
    data,
    fireAlert
  );


  /* =======================================================
     FIRE LOG
     ======================================================= */

  if (
    fireAlert &&
    !previousFireState
  ) {

    /*
       FIRE has just started.

       Create ONE log.
    */

    createFireLog(
      data
    );

  }


  /* =======================================================
     POPUP
     ======================================================= */

  if (fireAlert) {

    showFirePopup(
      data
    );

  }

  else if (
    previousFireState
  ) {

    /*
       FIRE ended.

       Close popup automatically.

       Recent Fire Logs remain.
    */

    hideFirePopup();

  }


  previousFireState =
    fireAlert;

}


/* =========================================================
   FIREBASE CONNECTION
   ========================================================= */

const deviceRef =
  ref(
    db,
    DATA_PATH
  );


onValue(
  deviceRef,

  (snapshot) => {

    try {

      const data =
        snapshot.val();


      processFirebaseData(
        data
      );


      if (
        elements.fbDot
      ) {

        elements.fbDot.classList.add(
          "online"
        );

        elements.fbDot.classList.remove(
          "offline"
        );

      }


      if (
        elements.fbStatus
      ) {

        elements.fbStatus.textContent =
          "Connected";

      }

    }

    catch (error) {

      console.error(
        "Dashboard processing error:",
        error
      );

    }

  },

  (error) => {

    console.error(
      "Firebase connection error:",
      error
    );


    if (
      elements.fbDot
    ) {

      elements.fbDot.classList.add(
        "offline"
      );

      elements.fbDot.classList.remove(
        "online"
      );

    }


    if (
      elements.fbStatus
    ) {

      elements.fbStatus.textContent =
        "Connection Error";

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

prepareFirePopup();

renderRecentFireLogs();

initMap();


console.log(
  "======================================="
);

console.log(
  "SMART FIRE GUARDIAN"
);

console.log(
  "Dashboard started successfully"
);

console.log(
  `Firebase path: /${DATA_PATH}`
);

console.log(
  "======================================="
);
