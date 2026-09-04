import { db } from "./firebase-config.js";

import {
  ref,
  onValue,
  push,
  set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// ======================================================
// SMART FIRE GUARDIAN - DASHBOARD APP
// ======================================================

const DEVICE_ID = "SF-003";
const DATA_PATH = `devices/${DEVICE_ID}`;

const DEFAULT_GAS_THRESHOLD = 1600;
const DEFAULT_FIRE_THRESHOLD = 5000;


// ======================================================
// LOCATIONS
// ======================================================

const DEVICE_LOCATION = {
  lat: 15.855881303189477,
  lng: 74.57802140000477
};

const POLICE_LOCATION = {
  lat: 15.881842260513212,
  lng: 74.52917008030238
};

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

let popupMap = null;

let lastFirebaseData = null;


// ======================================================
// HELPER
// ======================================================

function getElement(id) {
  return document.getElementById(id);
}


function setText(id, value) {
  const element = getElement(id);

  if (element) {
    element.textContent = value;
  }
}


function escapeHTML(value) {
  if (value === null || value === undefined) {
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
// MAP ICON
// ======================================================

function markerIcon(emoji, type = "safe") {

  return L.divIcon({

    className: "sf-marker",

    html: `
      <div class="sf-marker-pin ${type}">
        ${emoji}
      </div>
    `,

    iconSize: [42, 42],

    iconAnchor: [21, 42],

    popupAnchor: [0, -42]

  });

}


// ======================================================
// INITIALIZE MAP
// ======================================================

function initMap() {

  const mapElement = getElement("map");

  if (!mapElement) {
    return;
  }

  if (typeof L === "undefined") {
    console.error("Leaflet is not loaded.");
    return;
  }


  map = L.map("map");


  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);


  // --------------------------------------------------
  // DEVICE
  // --------------------------------------------------

  deviceMarker = L.marker(
    [
      DEVICE_LOCATION.lat,
      DEVICE_LOCATION.lng
    ],
    {
      icon: markerIcon("📍", "safe")
    }
  ).addTo(map);


  deviceMarker.bindPopup(`
    <b>📍 SMART FIRE GUARDIAN</b><br>
    Device: ${DEVICE_ID}<br>
    ABC Apartments<br>
    Floor 3<br>
    Room 302
  `);


  // --------------------------------------------------
  // POLICE
  // --------------------------------------------------

  policeMarker = L.marker(
    [
      POLICE_LOCATION.lat,
      POLICE_LOCATION.lng
    ],
    {
      icon: markerIcon("🚓", "police")
    }
  ).addTo(map);


  policeMarker.bindTooltip(
    "🚓 NEAREST POLICE STATION",
    {
      permanent: true,
      direction: "top",
      className: "police-location-label"
    }
  );


  policeMarker.bindPopup(`
    <b>🚓 NEAREST POLICE STATION</b><br>
    Emergency response location
  `);


  // --------------------------------------------------
  // FIRE STATION
  // --------------------------------------------------

  fireStationMarker = L.marker(
    [
      FIRE_STATION_LOCATION.lat,
      FIRE_STATION_LOCATION.lng
    ],
    {
      icon: markerIcon("🚒", "station")
    }
  ).addTo(map);


  fireStationMarker.bindTooltip(
    "🚒 NEAREST FIRE STATION",
    {
      permanent: true,
      direction: "top",
      className: "fire-station-location-label"
    }
  );


  fireStationMarker.bindPopup(`
    <b>🚒 NEAREST FIRE STATION</b><br>
    Emergency fire response location
  `);


  // --------------------------------------------------
  // DEVICE LABEL
  // --------------------------------------------------

  deviceMarker.bindTooltip(
    "📍 YOUR LOCATION",
    {
      permanent: true,
      direction: "top",
      className: "your-location-label"
    }
  );


  // --------------------------------------------------
  // INITIAL VIEW
  // --------------------------------------------------

  const bounds = L.latLngBounds([
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


  map.fitBounds(bounds, {
    padding: [40, 40]
  });

}


// ======================================================
// UPDATE MAIN MAP
// ======================================================

function updateMap(data) {

  if (!map || !data) {
    return;
  }


  const fireAlert =
    data.fireAlert === true ||
    data.status === "FIRE";


  // --------------------------------------------------
  // DEVICE MARKER
  // --------------------------------------------------

  if (deviceMarker) {

    deviceMarker.setIcon(
      markerIcon(
        fireAlert ? "🔥" : "📍",
        fireAlert ? "fire" : "safe"
      )
    );

  }


  // --------------------------------------------------
  // FIRE RESPONSE LINES
  // --------------------------------------------------

  if (fireAlert) {

    if (!fireLinePolice) {

      fireLinePolice = L.polyline(
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
          className: "fire-response-line",
          weight: 4,
          dashArray: "8, 8"
        }
      ).addTo(map);

    }


    if (!fireLineStation) {

      fireLineStation = L.polyline(
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
          className: "fire-response-line",
          weight: 4,
          dashArray: "8, 8"
        }
      ).addTo(map);

    }

  } else {

    if (fireLinePolice) {

      map.removeLayer(fireLinePolice);

      fireLinePolice = null;

    }


    if (fireLineStation) {

      map.removeLayer(fireLineStation);

      fireLineStation = null;

    }

  }

}


// ======================================================
// FAMILY MEMBERS ON MAP
// ======================================================

function loadFamilyMembers() {

  const familyRef = ref(
    db,
    `familyMembers/${DEVICE_ID}`
  );


  onValue(
    familyRef,

    snapshot => {

      const members = snapshot.val() || {};


      // Remove old markers

      Object.values(familyMarkers).forEach(marker => {

        if (map && map.hasLayer(marker)) {
          map.removeLayer(marker);
        }

      });


      familyMarkers = {};


      // Add new markers

      Object.entries(members).forEach(
        ([memberId, member]) => {

          const latitude =
            Number(member.latitude);

          const longitude =
            Number(member.longitude);


          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {
            return;
          }


          if (!map) {
            return;
          }


          const marker = L.marker(
            [
              latitude,
              longitude
            ],
            {
              icon: markerIcon(
                "🏠",
                "safe"
              )
            }
          ).addTo(map);


          marker.bindTooltip(
            `🏠 ${escapeHTML(member.name || "Family Home")}`,
            {
              permanent: false,
              direction: "top"
            }
          );


          marker.bindPopup(`
            <b>🏠 FAMILY MEMBER</b><br><br>

            <b>Name:</b>
            ${escapeHTML(member.name || "—")}<br>

            <b>Relation:</b>
            ${escapeHTML(member.relation || "—")}<br>

            <b>Phone:</b>
            ${escapeHTML(member.phone || "—")}<br>

            ${
              member.isPrimary
                ? "<b>⭐ Primary Contact</b>"
                : ""
            }
          `);


          familyMarkers[memberId] = marker;

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
// STATUS
// ======================================================

function updateStatus(data) {

  const status =
    String(data.status || "SAFE").toUpperCase();


  const fireAlert =
    data.fireAlert === true ||
    status === "FIRE";


  const mainStatus =
    getElement("mainStatus");


  const statusValue =
    getElement("statusValue");


  const statusDot =
    getElement("statusDot");


  const statusText =
    getElement("statusText");


  const statusDescription =
    getElement("statusDescription");


  if (statusValue) {

    statusValue.textContent =
      fireAlert
        ? "FIRE"
        : status;

  }


  if (statusText) {

    statusText.textContent =
      fireAlert
        ? "Fire detected"
        : status === "HEAT DETECTED"
          ? "Heat detected"
          : "System is safe";

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
    Number(heat.resistance || 0);


  const threshold =
    Number(
      heat.fireThreshold ||
      DEFAULT_FIRE_THRESHOLD
    );


  const heatDetected =
    resistance > 0 &&
    resistance <= threshold;


  setText(
    "flame",
    resistance > 0
      ? `${(resistance / 1000).toFixed(2)} kΩ`
      : "—"
  );


  setText(
    "heatState",
    heatDetected
      ? "🔥 HEAT DETECTED"
      : "🟢 SAFE"
  );


  const heatCard =
    getElement("heatCard");


  if (heatCard) {

    heatCard.classList.toggle(
      "danger",
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
    getElement("stepHeat");


  if (stepHeat) {

    stepHeat.classList.toggle(
      "active",
      heatDetected
    );

  }

}


// ======================================================
// GAS / SMOKE
// ======================================================

function updateGas(data) {

  const gas =
    data.sensors?.gas || {};


  const raw =
    Number(gas.raw || 0);


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
    "gasState",
    gasAlert
      ? "🔥 SMOKE / GAS"
      : "🟢 SAFE"
  );


  const gasCard =
    getElement("gasCard");


  if (gasCard) {

    gasCard.classList.toggle(
      "danger",
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
    getElement("stepSmoke");


  if (stepSmoke) {

    stepSmoke.classList.toggle(
      "active",
      gasAlert
    );

  }

}


// ======================================================
// FIRE CONFIRMATION
// ======================================================

function updateFireSequence(data) {

  const status =
    String(data.status || "SAFE").toUpperCase();


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


  const heatDetected =
    resistance > 0 &&
    resistance <= fireThreshold;


  const smokeDetected =
    heatDetected &&
    gasRaw >= gasThreshold;


  setText(
    "stepFireStatus",
    fireAlert
      ? "🔥 FIRE CONFIRMED"
      : smokeDetected
        ? "CHECKING..."
        : "WAITING"
  );


  const stepFire =
    getElement("stepFire");


  if (stepFire) {

    stepFire.classList.toggle(
      "active",
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
    data.deviceId || DEVICE_ID
  );


  setText(
    "building",
    data.building || "—"
  );


  setText(
    "floor",
    data.floor !== undefined
      ? data.floor
      : "—"
  );


  setText(
    "zone",
    data.zone || "—"
  );


  setText(
    "location",
    data.zone
      ? `${data.building || ""} • Floor ${data.floor || ""} • ${data.zone}`
      : "—"
  );

}


// ======================================================
// CONNECTION STATUS
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
    getElement("fbDot");


  const deviceTopDot =
    getElement("deviceTopDot");


  if (fbDot) {

    fbDot.classList.add(
      "online"
    );

  }


  if (deviceTopDot) {

    deviceTopDot.classList.add(
      "online"
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
    now.toLocaleTimeString()
  );

}


// ======================================================
// FIRE LOG
// ======================================================

function saveFireLog(data) {

  const fireAlert =
    data.fireAlert === true ||
    data.status === "FIRE";


  if (!fireAlert) {
    return;
  }


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
      deviceId: DEVICE_ID,

      building:
        data.building || "ABC Apartments",

      floor:
        data.floor || 3,

      zone:
        data.zone || "Room 302",

      status: "FIRE",

      timestamp:
        Date.now()
    }
  ).catch(error => {

    console.error(
      "Could not save fire log:",
      error
    );

  });

}


// ======================================================
// FIRE POPUP
// ======================================================

function updateFirePopup(data) {

  const popup =
    getElement("firePopup");


  if (!popup) {
    return;
  }


  const fireAlert =
    data.fireAlert === true ||
    data.status === "FIRE";


  if (fireAlert) {

    setText(
      "popupBuilding",
      data.building || "ABC Apartments"
    );


    setText(
      "popupFloor",
      data.floor || "3"
    );


    setText(
      "popupZone",
      data.zone || "Room 302"
    );


    popup.classList.add(
      "show"
    );


    if (
      !popup.dataset.logged
    ) {

      popup.dataset.logged = "true";

      saveFireLog(data);

    }

  } else {

    popup.classList.remove(
      "show"
    );

    delete popup.dataset.logged;

  }

}


// ======================================================
// POPUP MAP
// ======================================================

function initPopupMap() {

  const mapElement =
    getElement("popupMap");


  if (!mapElement) {
    return;
  }


  if (
    typeof L === "undefined"
  ) {
    return;
  }


  popupMap =
    L.map(
      "popupMap"
    );


  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(popupMap);


  L.marker(
    [
      DEVICE_LOCATION.lat,
      DEVICE_LOCATION.lng
    ],
    {
      icon: markerIcon(
        "🔥",
        "fire"
      )
    }
  )
  .addTo(popupMap)
  .bindPopup(
    "🔥 FIRE LOCATION"
  );


  L.marker(
    [
      POLICE_LOCATION.lat,
      POLICE_LOCATION.lng
    ],
    {
      icon: markerIcon(
        "🚓",
        "police"
      )
    }
  )
  .addTo(popupMap)
  .bindPopup(
    "🚓 NEAREST POLICE STATION"
  );


  L.marker(
    [
      FIRE_STATION_LOCATION.lat,
      FIRE_STATION_LOCATION.lng
    ],
    {
      icon: markerIcon(
        "🚒",
        "station"
      )
    }
  )
  .addTo(popupMap)
  .bindPopup(
    "🚒 NEAREST FIRE STATION"
  );


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
      weight: 3,
      dashArray: "8,8"
    }
  ).addTo(popupMap);


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
      weight: 3,
      dashArray: "8,8"
    }
  ).addTo(popupMap);


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
      padding: [20, 20]
    }
  );

}


// ======================================================
// ACKNOWLEDGE FIRE
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


      if (popup) {

        popup.classList.remove(
          "show"
        );

      }

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


      console.log(
        "Firebase data:",
        data
      );


      if (!data) {

        console.warn(
          "No data found at:",
          DATA_PATH
        );

        return;

      }


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

    }
  );

}


// ======================================================
// START APPLICATION
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "SMART FIRE GUARDIAN starting..."
    );


    initMap();

    initPopupMap();

    setupAcknowledgeButton();

    listenToFirebase();

    loadFamilyMembers();

  }
);
