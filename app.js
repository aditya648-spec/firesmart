import { db } from "./firebase-config.js";

import {
  ref,
  onValue,
  push,
  set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// ======================================================
// SMART FIRE GUARDIAN
// DASHBOARD APP
// ======================================================


// ======================================================
// DEVICE CONFIGURATION
// ======================================================

const DEVICE_ID = "SF-003";

const DATA_PATH = `devices/${DEVICE_ID}`;

const DEFAULT_GAS_THRESHOLD = 1600;

// 5 kΩ = 5000 Ω
const DEFAULT_FIRE_THRESHOLD = 5000;


// ======================================================
// FIXED LOCATIONS
// IMPORTANT:
// FIRE/DEVICE LOCATION MUST NEVER CHANGE
// ======================================================

const DEVICE_LOCATION = {

  lat: 15.855911401508786,

  lng: 74.57851857002846

};


// ======================================================
// POLICE LOCATION
// ======================================================

const POLICE_LOCATION = {

  lat: 15.881842260513212,

  lng: 74.52917008030238

};


// ======================================================
// FIRE STATION LOCATION
// ======================================================

const FIRE_STATION_LOCATION = {

  lat: 15.845029016505203,

  lng: 74.50745329043593

};


// ======================================================
// GLOBAL VARIABLES
// ======================================================

let map = null;

let deviceMarker = null;

let policeMarker = null;

let fireStationMarker = null;

let familyMarkers = {};

let fireLinePolice = null;

let fireLineStation = null;


// Popup map

let popupMap = null;

let popupFireMarker = null;

let popupPoliceMarker = null;

let popupFireStationMarker = null;

let popupPoliceLine = null;

let popupFireStationLine = null;


let lastFirebaseData = null;

let lastFireLogState = false;


// ======================================================
// HELPER
// ======================================================

function getElement(id) {

  return document.getElementById(id);

}


// ======================================================
// SET TEXT
// ======================================================

function setText(id, value) {

  const element = getElement(id);

  if (element) {

    element.textContent = value;

  }

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }

  return String(value)

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}


// ======================================================
// MARKER ICON
// ======================================================

function markerIcon(
  emoji,
  type = "safe"
) {

  const fireMarkup =
    type === "fire"

      ? `
        <span class="fire-pulse-ring"></span>

        <span class="fire-marker-emoji">
          ${emoji}
        </span>
      `

      : emoji;


  return L.divIcon({

    className: `sf-marker ${type}-marker-icon`,

    html: `

      <div class="sf-marker-pin ${type}">

        ${fireMarkup}

      </div>

    `,

    iconSize: [48, 48],

    iconAnchor: [24, 48],

    popupAnchor: [0, -48],

    tooltipAnchor: [0, -42]

  });

}


// ======================================================
// INITIALIZE MAIN MAP
// ======================================================

function initMap() {

  const mapElement =
    getElement("map");


  if (!mapElement) {

    console.warn(
      "Main map element not found."
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


  if (map) {

    return;

  }


  map = L.map("map", {

    zoomControl: true,

    scrollWheelZoom: true,

    doubleClickZoom: true,

    dragging: true,

    touchZoom: true

  });


  L.tileLayer(

    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    {

      maxZoom: 19,

      attribution:
        "&copy; OpenStreetMap contributors"

    }

  ).addTo(map);


  // ====================================================
  // DEVICE / FIRE LOCATION
  // ====================================================

  deviceMarker = L.marker(

    [

      DEVICE_LOCATION.lat,

      DEVICE_LOCATION.lng

    ],

    {

      icon:
        markerIcon(
          "📍",
          "safe"
        )

    }

  ).addTo(map);


  deviceMarker.bindPopup(`

    <div class="map-popup-content">

      <strong>
        📍 SMART FIRE GUARDIAN
      </strong>

      <br><br>

      <b>Device:</b>
      ${DEVICE_ID}

      <br>

      <b>Building:</b>
      ABC Apartments

      <br>

      <b>Floor:</b>
      3

      <br>

      <b>Room:</b>
      302

      <br><br>

      <b>Coordinates:</b>

      <br>

      ${DEVICE_LOCATION.lat},

      ${DEVICE_LOCATION.lng}

    </div>

  `);


  // ====================================================
  // POLICE
  // ====================================================

  policeMarker = L.marker(

    [

      POLICE_LOCATION.lat,

      POLICE_LOCATION.lng

    ],

    {

      icon:
        markerIcon(
          "🚓",
          "police"
        )

    }

  ).addTo(map);


  policeMarker.bindTooltip(

    "🚓 NEAREST POLICE STATION",

    {

      permanent: true,

      direction: "top",

      className:
        "police-location-label"

    }

  );


  policeMarker.bindPopup(`

    <strong>
      🚓 NEAREST POLICE STATION
    </strong>

    <br><br>

    Emergency police response location.

  `);


  // ====================================================
  // FIRE STATION
  // ====================================================

  fireStationMarker = L.marker(

    [

      FIRE_STATION_LOCATION.lat,

      FIRE_STATION_LOCATION.lng

    ],

    {

      icon:
        markerIcon(
          "🚒",
          "station"
        )

    }

  ).addTo(map);


  fireStationMarker.bindTooltip(

    "🚒 NEAREST FIRE STATION",

    {

      permanent: true,

      direction: "top",

      className:
        "fire-station-location-label"

    }

  );


  fireStationMarker.bindPopup(`

    <strong>
      🚒 NEAREST FIRE STATION
    </strong>

    <br><br>

    Emergency fire response location.

  `);


  // ====================================================
  // DEVICE LABEL
  // ====================================================

  deviceMarker.bindTooltip(

    "📍 YOUR LOCATION",

    {

      permanent: true,

      direction: "top",

      className:
        "your-location-label"

    }

  );


  // ====================================================
  // INITIAL MAP VIEW
  // ====================================================

  const bounds =
    L.latLngBounds([

      [

        DEVICE_LOCATION.lat,

        DEVICE_LOCATION.lng

      ],

      [

        POLICE_LOCATION.lat,

        POLICE_LOCATION.lng

      ],

      [

        FIRE_STATION_LOCATION.lat,

        FIRE_STATION_LOCATION.lng

      ]

    ]);


  map.fitBounds(

    bounds,

    {

      padding: [40, 40]

    }

  );

}


// ======================================================
// UPDATE MAIN MAP
// ======================================================

function updateMap(data) {

  if (
    !map ||
    !data
  ) {

    return;

  }


  const status =
    String(
      data.status || "SAFE"
    ).toUpperCase();


  const fireAlert =

    data.fireAlert === true ||

    status === "FIRE";


  // ====================================================
  // CHANGE DEVICE MARKER
  // ====================================================

  if (deviceMarker) {

    deviceMarker.setIcon(

      markerIcon(

        fireAlert
          ? "🔥"
          : "📍",

        fireAlert
          ? "fire"
          : "safe"

      )

    );

  }


  // ====================================================
  // FIRE RESPONSE LINES
  // ====================================================

  if (fireAlert) {


    if (!fireLinePolice) {

      fireLinePolice =
        L.polyline(

          [

            [

              DEVICE_LOCATION.lat,

              DEVICE_LOCATION.lng

            ],

            [

              POLICE_LOCATION.lat,

              POLICE_LOCATION.lng

            ]

          ],

          {

            className:
              "fire-response-line",

            weight: 4,

            dashArray: "8, 8",

            opacity: 0.9

          }

        ).addTo(map);

    }


    if (!fireLineStation) {

      fireLineStation =
        L.polyline(

          [

            [

              DEVICE_LOCATION.lat,

              DEVICE_LOCATION.lng

            ],

            [

              FIRE_STATION_LOCATION.lat,

              FIRE_STATION_LOCATION.lng

            ]

          ],

          {

            className:
              "fire-response-line",

            weight: 4,

            dashArray: "8, 8",

            opacity: 0.9

          }

        ).addTo(map);

    }


    setText(

      "mapStatus",

      "🚨 FIRE LOCATION ACTIVE"

    );


  } else {


    if (fireLinePolice) {

      map.removeLayer(
        fireLinePolice
      );

      fireLinePolice = null;

    }


    if (fireLineStation) {

      map.removeLayer(
        fireLineStation
      );

      fireLineStation = null;

    }


    setText(

      "mapStatus",

      "LIVE LOCATION"

    );

  }

}


// ======================================================
// FAMILY MEMBERS ON MAP
// ======================================================

function loadFamilyMembers() {

  const familyRef =
    ref(

      db,

      `familyMembers/${DEVICE_ID}`

    );


  onValue(

    familyRef,

    snapshot => {

      const members =
        snapshot.val() || {};


      // Remove previous markers

      Object.values(
        familyMarkers
      ).forEach(

        marker => {

          if (
            map &&
            map.hasLayer(marker)
          ) {

            map.removeLayer(
              marker
            );

          }

        }

      );


      familyMarkers = {};


      // Add family members

      Object.entries(
        members
      ).forEach(

        ([memberId, member]) => {


          if (
            !member ||
            typeof member !== "object"
          ) {

            return;

          }


          const latitude =
            Number(
              member.latitude
            );


          const longitude =
            Number(
              member.longitude
            );


          if (

            !Number.isFinite(
              latitude
            ) ||

            !Number.isFinite(
              longitude
            )

          ) {

            return;

          }


          if (!map) {

            return;

          }


          const marker =
            L.marker(

              [

                latitude,

                longitude

              ],

              {

                icon:
                  markerIcon(
                    "🏠",
                    "safe"
                  )

              }

            ).addTo(map);


          marker.bindTooltip(

            `🏠 ${escapeHTML(
              member.name ||
              "Family Home"
            )}`,

            {

              direction: "top"

            }

          );


          marker.bindPopup(`

            <strong>
              🏠 FAMILY MEMBER
            </strong>

            <br><br>

            <b>Name:</b>
            ${escapeHTML(
              member.name || "—"
            )}

            <br>

            <b>Relation:</b>
            ${escapeHTML(
              member.relation || "—"
            )}

            <br>

            <b>Phone:</b>
            ${escapeHTML(
              member.phone || "—"
            )}

            <br><br>

            ${
              member.isPrimary

                ? "<strong>⭐ Primary Contact</strong>"

                : ""

            }

          `);


          familyMarkers[
            memberId
          ] = marker;

        }

      );

    },

    error => {

      console.error(

        "Family member Firebase error:",

        error

      );

    }

  );

}


// ======================================================
// SYSTEM STATUS
// ======================================================

function updateStatus(data) {

  const status =
    String(
      data.status || "SAFE"
    ).toUpperCase();


  const fireAlert =

    data.fireAlert === true ||

    status === "FIRE";


  const mainStatus =
    getElement(
      "mainStatus"
    );


  const statusValue =
    getElement(
      "statusValue"
    );


  const statusDot =
    getElement(
      "statusDot"
    );


  const statusText =
    getElement(
      "statusText"
    );


  const statusDescription =
    getElement(
      "statusDescription"
    );


  if (statusValue) {

    statusValue.textContent =

      fireAlert

        ? "FIRE"

        : status;

  }


  if (statusText) {

    statusText.textContent =

      fireAlert

        ? "FIRE DETECTED"

        : status === "HEAT DETECTED"

          ? "HEAT DETECTED"

          : "SYSTEM SAFE";

  }


  if (statusDescription) {

    statusDescription.textContent =

      fireAlert

        ? "🔥 FIRE CONFIRMED"

        : status === "HEAT DETECTED"

          ? "Heat detected. Checking for smoke."

          : "No fire detected.";

  }


  if (statusDot) {

    statusDot.classList.toggle(

      "fire",

      fireAlert

    );

  }


  if (statusValue) {

    statusValue.classList.toggle(

      "fire",

      fireAlert

    );

  }


  if (mainStatus) {

    mainStatus.classList.toggle(

      "fire",

      fireAlert

    );

  }

}


// ======================================================
// HEAT SENSOR
// ======================================================

function updateHeat(data) {

  const heat =
    data.sensors?.heat || {};


  const resistance =
    Number(
      heat.resistance || 0
    );


  const threshold =
    Number(

      heat.fireThreshold ||

      DEFAULT_FIRE_THRESHOLD

    );


  const heatDetected =

    resistance > 0 &&

    resistance <= threshold;


  // Main resistance

  setText(

    "flame",

    resistance > 0

      ? `${(
          resistance / 1000
        ).toFixed(2)} kΩ`

      : "—"

  );


  // ADC

  setText(

    "heatAdc",

    heat.rawADC !== undefined

      ? heat.rawADC

      : "—"

  );


  // Voltage

  const voltage =
    Number(
      heat.voltage || 0
    );


  setText(

    "heatVoltage",

    voltage > 0

      ? `${voltage.toFixed(3)} V`

      : "—"

  );


  // Threshold

  setText(

    "heatThreshold",

    `${(
      threshold / 1000
    ).toFixed(2)} kΩ`

  );


  // Heat state

  setText(

    "heatState",

    heatDetected

      ? "🔥 HEAT DETECTED"

      : "🟢 SAFE"

  );


  const heatCard =
    getElement(
      "heatCard"
    );


  if (heatCard) {

    heatCard.classList.toggle(

      "danger",

      heatDetected

    );

    heatCard.classList.toggle(

      "fire",

      heatDetected

    );

  }


  // Sequence

  setText(

    "stepHeatStatus",

    heatDetected

      ? "HEAT DETECTED"

      : "SAFE"

  );


  const stepHeat =
    getElement(
      "stepHeat"
    );


  if (stepHeat) {

    stepHeat.classList.toggle(

      "active",

      heatDetected

    );

  }

}


// ======================================================
// GAS / SMOKE SENSOR
// ======================================================

function updateGas(data) {

  const gas =
    data.sensors?.gas || {};


  const raw =
    Number(
      gas.raw || 0
    );


  const threshold =
    Number(

      gas.threshold ||

      DEFAULT_GAS_THRESHOLD

    );


  const gasAlert =

    gas.alert === true ||

    raw >= threshold;


  setText(

    "gas",

    raw > 0

      ? String(raw)

      : "—"

  );


  setText(

    "gasRaw",

    raw > 0

      ? String(raw)

      : "—"

  );


  setText(

    "gasThreshold",

    String(threshold)

  );


  setText(

    "gasDetection",

    gasAlert

      ? "Smoke / Gas Detected"

      : "Normal"

  );


  setText(

    "gasState",

    gasAlert

      ? "🔥 SMOKE / GAS"

      : "🟢 SAFE"

  );


  const gasCard =
    getElement(
      "gasCard"
    );


  if (gasCard) {

    gasCard.classList.toggle(

      "danger",

      gasAlert

    );

    gasCard.classList.toggle(

      "fire",

      gasAlert

    );

  }


  setText(

    "stepSmokeStatus",

    gasAlert

      ? "SMOKE DETECTED"

      : "SAFE"

  );


  const stepSmoke =
    getElement(
      "stepSmoke"
    );


  if (stepSmoke) {

    stepSmoke.classList.toggle(

      "active",

      gasAlert

    );

  }

}


// ======================================================
// FIRE DETECTION SEQUENCE
// ======================================================

function updateFireSequence(data) {

  const status =
    String(
      data.status || "SAFE"
    ).toUpperCase();


  const fireAlert =

    data.fireAlert === true ||

    status === "FIRE";


  const heat =
    data.sensors?.heat || {};


  const gas =
    data.sensors?.gas || {};


  const fireThreshold =
    Number(

      heat.fireThreshold ||

      DEFAULT_FIRE_THRESHOLD

    );


  const gasThreshold =
    Number(

      gas.threshold ||

      DEFAULT_GAS_THRESHOLD

    );


  const resistance =
    Number(

      heat.resistance || 0

    );


  const gasRaw =
    Number(

      gas.raw || 0

    );


  // Heat must be detected first

  const heatDetected =

    resistance > 0 &&

    resistance <= fireThreshold;


  // Smoke only matters after heat

  const smokeDetected =

    heatDetected &&

    gasRaw >= gasThreshold;


  // Firebase confirmation count

  const confirmation =
    data.fireConfirmation || {};


  const count =
    Number(
      confirmation.count || 0
    );


  const required =
    Number(

      confirmation.required || 3

    );


  if (fireAlert) {

    setText(

      "stepFireStatus",

      "🔥 FIRE CONFIRMED"

    );

  }

  else if (smokeDetected) {

    setText(

      "stepFireStatus",

      count > 0

        ? `CHECKING ${count}/${required}`

        : "CHECKING..."

    );

  }

  else {

    setText(

      "stepFireStatus",

      "WAITING"

    );

  }


  const stepFire =
    getElement(
      "stepFire"
    );


  if (stepFire) {

    stepFire.classList.toggle(

      "active",

      heatDetected

    );

    stepFire.classList.toggle(

      "fire",

      fireAlert

    );

  }


  setText(

    "alarm",

    fireAlert

      ? "🚨 FIRE ALARM ACTIVE"

      : "🟢 Alarm OFF"

  );

}


// ======================================================
// DEVICE INFORMATION
// ======================================================

function updateDeviceInfo(data) {

  setText(

    "deviceId",

    data.deviceId ||

    DEVICE_ID

  );


  setText(

    "building",

    data.building ||

    "ABC Apartments"

  );


  setText(

    "floor",

    data.floor !== undefined

      ? data.floor

      : "3"

  );


  setText(

    "zone",

    data.zone ||

    "Room 302"

  );


  setText(

    "location",

    data.zone

      ? `${data.building || "ABC Apartments"} • Floor ${data.floor || "3"} • ${data.zone}`

      : "ABC Apartments • Floor 3 • Room 302"

  );

}


// ======================================================
// CONNECTION
// ======================================================

function updateConnection() {

  setText(

    "fbStatus",

    "Firebase Connected"

  );


  setText(

    "deviceConn",

    "Online"

  );


  const fbDot =
    getElement(
      "fbDot"
    );


  const deviceTopDot =
    getElement(
      "deviceTopDot"
    );


  if (fbDot) {

    fbDot.classList.add(
      "online"
    );

    fbDot.classList.remove(
      "offline"
    );

  }


  if (deviceTopDot) {

    deviceTopDot.classList.add(
      "online"
    );

    deviceTopDot.classList.remove(
      "offline"
    );

  }


  setText(

    "deviceTopStatus",

    "DEVICE ONLINE"

  );

}


// ======================================================
// LAST UPDATE
// ======================================================

function updateLastUpdate() {

  const now =
    new Date();


  setText(

    "lastUpdate",

    `Last update: ${now.toLocaleTimeString()}`

  );

}


// ======================================================
// SAVE FIRE LOG
// ======================================================

function saveFireLog(data) {

  const fireAlert =

    data.fireAlert === true ||

    String(
      data.status || ""
    ).toUpperCase() === "FIRE";


  if (!fireAlert) {

    return;

  }


  // Prevent saving the same live Firebase
  // state continuously every update

  if (lastFireLogState) {

    return;

  }


  lastFireLogState = true;


  const logsRef =
    ref(

      db,

      `fireLogs/${DEVICE_ID}`

    );


  const newLog =
    push(logsRef);


  set(

    newLog,

    {

      deviceId:
        DEVICE_ID,

      building:
        data.building ||
        "ABC Apartments",

      floor:
        data.floor ??
        3,

      zone:
        data.zone ||
        "Room 302",

      latitude:
        DEVICE_LOCATION.lat,

      longitude:
        DEVICE_LOCATION.lng,

      gasRaw:
        Number(
          data.sensors?.gas?.raw || 0
        ),

      heatResistance:
        Number(
          data.sensors?.heat?.resistance || 0
        ),

      timestamp:
        Date.now()

    }

  ).catch(

    error => {

      console.error(

        "Unable to save fire log:",

        error

      );

    }

  );

}


// ======================================================
// RESET FIRE LOG STATE
// ======================================================

function resetFireLogState(data) {

  const fireAlert =

    data.fireAlert === true ||

    String(
      data.status || ""
    ).toUpperCase() === "FIRE";


  if (!fireAlert) {

    lastFireLogState = false;

  }

}


// ======================================================
// FIRE POPUP
// ======================================================

function updateFirePopup(data) {

  const popup =
    getElement(
      "firePopup"
    );


  if (!popup) {

    return;

  }


  const status =
    String(
      data.status || "SAFE"
    ).toUpperCase();


  const fireAlert =

    data.fireAlert === true ||

    status === "FIRE";


  // ====================================================
  // FIRE DETECTED
  // ====================================================

  if (fireAlert) {


    setText(

      "popupBuilding",

      data.building ||

      "ABC Apartments"

    );


    setText(

      "popupFloor",

      data.floor !== undefined

        ? data.floor

        : "3"

    );


    setText(

      "popupZone",

      data.zone ||

      "Room 302"

    );


    popup.classList.add(
      "show"
    );


    popup.setAttribute(
      "aria-hidden",
      "false"
    );


    // Initialize/update popup map
    // AFTER popup is visible.

    setTimeout(

      () => {

        initPopupMap();

        updatePopupMap();

        if (popupMap) {

          setTimeout(

            () => {

              popupMap.invalidateSize(
                true
              );

            },

            100

          );

        }

      },

      150

    );


    saveFireLog(data);


  }

  // ====================================================
  // SAFE AGAIN
  // ====================================================

  else {

    popup.classList.remove(
      "show"
    );


    popup.setAttribute(
      "aria-hidden",
      "true"
    );


    lastFireLogState = false;

  }

}


// ======================================================
// INITIALIZE POPUP MAP
// ======================================================

function initPopupMap() {

  const mapElement =
    getElement(
      "popupMap"
    );


  if (!mapElement) {

    console.warn(
      "Popup map element not found."
    );

    return;

  }


  if (
    typeof L === "undefined"
  ) {

    console.error(
      "Leaflet is not loaded for popup map."
    );

    return;

  }


  // If map already exists,
  // just refresh its size.

  if (popupMap) {

    popupMap.invalidateSize(
      true
    );

    return;

  }


  popupMap =
    L.map(

      "popupMap",

      {

        zoomControl: true,

        scrollWheelZoom: true,

        dragging: true,

        doubleClickZoom: true,

        touchZoom: true

      }

    );


  L.tileLayer(

    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    {

      maxZoom: 19,

      attribution:
        "&copy; OpenStreetMap contributors"

    }

  ).addTo(
    popupMap
  );


  // ====================================================
  // FIRE MARKER
  // EXACT FIXED COORDINATE
  // ====================================================

  popupFireMarker =
    L.marker(

      [

        DEVICE_LOCATION.lat,

        DEVICE_LOCATION.lng

      ],

      {

        icon:
          markerIcon(
            "🔥",
            "fire"
          ),

        zIndexOffset:
          1000

      }

    ).addTo(
      popupMap
    );


  popupFireMarker.bindPopup(`

    <div class="fire-map-marker-popup">

      <strong>
        🔥 FIRE DETECTED
      </strong>

      <br><br>

      <b>Fire Location</b>

      <br>

      ${DEVICE_LOCATION.lat},

      ${DEVICE_LOCATION.lng}

    </div>

  `);


  popupFireMarker.bindTooltip(

    "🔥 FIRE LOCATION",

    {

      permanent: true,

      direction: "top",

      className:
        "popup-fire-location-label",

      offset: [0, -35]

    }

  );


  // ====================================================
  // POLICE MARKER
  // ====================================================

  popupPoliceMarker =
    L.marker(

      [

        POLICE_LOCATION.lat,

        POLICE_LOCATION.lng

      ],

      {

        icon:
          markerIcon(
            "🚓",
            "police"
          )

      }

    ).addTo(
      popupMap
    );


  popupPoliceMarker.bindTooltip(

    "🚓 NEAREST POLICE STATION",

    {

      permanent: true,

      direction: "top",

      className:
        "police-location-label"

    }

  );


  popupPoliceMarker.bindPopup(`

    <strong>
      🚓 NEAREST POLICE STATION
    </strong>

    <br><br>

    Emergency police response location.

  `);


  // ====================================================
  // FIRE STATION MARKER
  // ====================================================

  popupFireStationMarker =
    L.marker(

      [

        FIRE_STATION_LOCATION.lat,

        FIRE_STATION_LOCATION.lng

      ],

      {

        icon:
          markerIcon(
            "🚒",
            "station"
          )

      }

    ).addTo(
      popupMap
    );


  popupFireStationMarker.bindTooltip(

    "🚒 NEAREST FIRE STATION",

    {

      permanent: true,

      direction: "top",

      className:
        "fire-station-location-label"

    }

  );


  popupFireStationMarker.bindPopup(`

    <strong>
      🚒 NEAREST FIRE STATION
    </strong>

    <br><br>

    Emergency fire response location.

  `);


  // ====================================================
  // RESPONSE LINE TO POLICE
  // ====================================================

  popupPoliceLine =
    L.polyline(

      [

        [

          DEVICE_LOCATION.lat,

          DEVICE_LOCATION.lng

        ],

        [

          POLICE_LOCATION.lat,

          POLICE_LOCATION.lng

        ]

      ],

      {

        className:
          "fire-response-line",

        weight: 4,

        dashArray: "8, 8",

        opacity: 0.9

      }

    ).addTo(
      popupMap
    );


  // ====================================================
  // RESPONSE LINE TO FIRE STATION
  // ====================================================

  popupFireStationLine =
    L.polyline(

      [

        [

          DEVICE_LOCATION.lat,

          DEVICE_LOCATION.lng

        ],

        [

          FIRE_STATION_LOCATION.lat,

          FIRE_STATION_LOCATION.lng

        ]

      ],

      {

        className:
          "fire-response-line",

        weight: 4,

        dashArray: "8, 8",

        opacity: 0.9

      }

    ).addTo(
      popupMap
    );


  // ====================================================
  // FIT POPUP MAP
  // ====================================================

  fitPopupMap();

}


// ======================================================
// UPDATE POPUP MAP
// ======================================================
//
// IMPORTANT:
// We DO NOT read data.lat / data.lng here.
//
// The fire location is ALWAYS:
// 15.855911401508786
// 74.57851857002846
//
// Firebase cannot change it.
// ======================================================

function updatePopupMap() {

  if (!popupMap) {

    return;

  }


  // ALWAYS use fixed location

  const fireLat =
    DEVICE_LOCATION.lat;


  const fireLng =
    DEVICE_LOCATION.lng;


  // ====================================================
  // MOVE FIRE MARKER TO EXACT LOCATION
  // ====================================================

  if (popupFireMarker) {

    popupFireMarker.setLatLng(

      [

        fireLat,

        fireLng

      ]

    );


    popupFireMarker.setIcon(

      markerIcon(
        "🔥",
        "fire"
      )

    );

  }


  // ====================================================
  // UPDATE POLICE LINE
  // ====================================================

  if (popupPoliceLine) {

    popupPoliceLine.setLatLngs(

      [

        [

          fireLat,

          fireLng

        ],

        [

          POLICE_LOCATION.lat,

          POLICE_LOCATION.lng

        ]

      ]

    );

  }


  // ====================================================
  // UPDATE FIRE STATION LINE
  // ====================================================

  if (popupFireStationLine) {

    popupFireStationLine.setLatLngs(

      [

        [

          fireLat,

          fireLng

        ],

        [

          FIRE_STATION_LOCATION.lat,

          FIRE_STATION_LOCATION.lng

        ]

      ]

    );

  }


  // ====================================================
  // KEEP ALL 3 EMERGENCY LOCATIONS VISIBLE
  // ====================================================

  fitPopupMap();

}


// ======================================================
// FIT POPUP MAP
// ======================================================

function fitPopupMap() {

  if (!popupMap) {

    return;

  }


  const bounds =
    L.latLngBounds([

      [

        DEVICE_LOCATION.lat,

        DEVICE_LOCATION.lng

      ],

      [

        POLICE_LOCATION.lat,

        POLICE_LOCATION.lng

      ],

      [

        FIRE_STATION_LOCATION.lat,

        FIRE_STATION_LOCATION.lng

      ]

    ]);


  popupMap.fitBounds(

    bounds,

    {

      padding: [35, 35],

      maxZoom: 14

    }

  );

}


// ======================================================
// ACKNOWLEDGE FIRE BUTTON
// ======================================================

function setupAcknowledgeButton() {

  const button =
    getElement(
      "acknowledgeFire"
    );


  if (!button) {

    return;

  }


  button.addEventListener(

    "click",

    () => {

      const popup =
        getElement(
          "firePopup"
        );


      if (!popup) {

        return;

      }


      popup.classList.remove(
        "show"
      );


      popup.setAttribute(
        "aria-hidden",
        "true"
      );

    }

  );

}


// ======================================================
// ESC KEY CLOSE POPUP
// ======================================================

function setupEscapeKey() {

  document.addEventListener(

    "keydown",

    event => {

      if (
        event.key !== "Escape"
      ) {

        return;

      }


      const popup =
        getElement(
          "firePopup"
        );


      if (!popup) {

        return;

      }


      popup.classList.remove(
        "show"
      );


      popup.setAttribute(
        "aria-hidden",
        "true"
      );

    }

  );

}


// ======================================================
// PROCESS FIREBASE DATA
// ======================================================

function processFirebaseData(data) {

  if (!data) {

    return;

  }


  lastFirebaseData =
    data;


  updateStatus(data);

  updateHeat(data);

  updateGas(data);

  updateFireSequence(data);

  updateDeviceInfo(data);

  updateConnection();

  updateLastUpdate();

  updateMap(data);

  updateFirePopup(data);

  resetFireLogState(data);

}


// ======================================================
// FIREBASE LISTENER
// ======================================================

function listenToFirebase() {

  const deviceRef =
    ref(

      db,

      DATA_PATH

    );


  onValue(

    deviceRef,

    snapshot => {

      const data =
        snapshot.val();


      if (!data) {

        console.warn(

          "No Firebase data found at:",

          DATA_PATH

        );

        return;

      }


      console.log(

        "Firebase update:",

        data

      );


      processFirebaseData(
        data
      );

    },

    error => {

      console.error(

        "Firebase listener error:",

        error

      );


      setText(

        "fbStatus",

        "Firebase Error"

      );


      setText(

        "deviceConn",

        "Offline"

      );


      const fbDot =
        getElement(
          "fbDot"
        );


      const deviceTopDot =
        getElement(
          "deviceTopDot"
        );


      if (fbDot) {

        fbDot.classList.remove(
          "online"
        );

        fbDot.classList.add(
          "offline"
        );

      }


      if (deviceTopDot) {

        deviceTopDot.classList.remove(
          "online"
        );

        deviceTopDot.classList.add(
          "offline"
        );

      }


      setText(

        "deviceTopStatus",

        "DEVICE OFFLINE"

      );

    }

  );

}


// ======================================================
// START APPLICATION
// ======================================================

function startApplication() {

  console.log(
    "========================================"
  );

  console.log(
    "SMART FIRE GUARDIAN"
  );

  console.log(
    "Starting dashboard..."
  );

  console.log(
    "Fixed Fire Location:"
  );

  console.log(
    DEVICE_LOCATION.lat,
    DEVICE_LOCATION.lng
  );

  console.log(
    "========================================"
  );


  // Main map

  initMap();


  // Firebase

  listenToFirebase();


  // Family members

  loadFamilyMembers();


  // Popup controls

  setupAcknowledgeButton();

  setupEscapeKey();


  // Give Leaflet time to render

  setTimeout(

    () => {

      if (map) {

        map.invalidateSize(
          true
        );

      }

    },

    500

  );

}


// ======================================================
// DOM READY
// ======================================================

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(

    "DOMContentLoaded",

    startApplication

  );

} else {

  startApplication();

}
