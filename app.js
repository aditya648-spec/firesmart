import { db } from "./firebase-config.js";

import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


/* =========================================================
   SMART FIRE GUARDIAN
   APP.JS
   ========================================================= */


/* =========================================================
   DEVICE
   ========================================================= */

const DEVICE_ID = "SF-003";

const DATA_PATH = `devices/${DEVICE_ID}`;


/* =========================================================
   DEFAULT SENSOR THRESHOLDS
   ========================================================= */

const DEFAULT_GAS_THRESHOLD = 1600;

const DEFAULT_FIRE_THRESHOLD = 5000;


/* =========================================================
   DEVICE LOCATION
   ========================================================= */

const DEFAULT_LAT = 15.855881303189477;

const DEFAULT_LNG = 74.57802140000477;


/* =========================================================
   POLICE STATION
   ========================================================= */

const POLICE_LAT = 15.881842260513212;

const POLICE_LNG = 74.52917008030238;


/* =========================================================
   FIRE STATION
   ========================================================= */

const FIRE_STATION_LAT = 15.845029016505203;

const FIRE_STATION_LNG = 74.50745329043593;


/* =========================================================
   MAP
   ========================================================= */

const DEFAULT_ZOOM = 13;

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
   CURRENT LOCATION
   ========================================================= */

let currentLat = DEFAULT_LAT;

let currentLng = DEFAULT_LNG;


/* =========================================================
   FIRE STATE
   ========================================================= */

let previousFireState = false;


/* =========================================================
   HTML ELEMENTS
   ========================================================= */

const $ = (id) =>
  document.getElementById(id);


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
   NUMBER HELPER
   ========================================================= */

function numberValue(
  value,
  fallback = 0
) {

  const number =
    Number(value);

  if (
    Number.isFinite(number)
  ) {

    return number;

  }

  return fallback;

}


/* =========================================================
   COORDINATE HELPER
   ========================================================= */

function validCoordinate(
  value,
  fallback
) {

  const number =
    Number(value);

  if (
    Number.isFinite(number) &&
    number !== 0
  ) {

    return number;

  }

  return fallback;

}


/* =========================================================
   TIME
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

  const earthRadius = 6371;


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


  return earthRadius * c;

}


/* =========================================================
   MARKER ICON
   ========================================================= */

function markerIcon(
  type
) {

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
      "smart-fire-marker",

    html: `
      <div class="smart-marker-pin ${className}">
        <span>${emoji}</span>
      </div>
    `,

    iconSize: [
      36,
      36
    ],

    iconAnchor: [
      18,
      36
    ],

    popupAnchor: [
      0,
      -35
    ]

  });

}


/* =========================================================
   INITIALIZE MAP
   ========================================================= */

function initMap() {

  const mapElement =
    $("map");


  if (
    !mapElement
  ) {

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


  /* -------------------------------------------------------
     CREATE MAP
     ------------------------------------------------------- */

  map =
    L.map(
      "map"
    );


  /* -------------------------------------------------------
     OPEN STREET MAP
     ------------------------------------------------------- */

  L.tileLayer(

    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

    {

      maxZoom: 19,

      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

    }

  ).addTo(
    map
  );


  /* -------------------------------------------------------
     DEVICE MARKER
     ------------------------------------------------------- */

  deviceMarker =
    L.marker(

      [
        DEFAULT_LAT,
        DEFAULT_LNG
      ],

      {
        icon:
          markerIcon(
            "safe"
          )
      }

    ).addTo(
      map
    );


  deviceMarker.bindPopup(
    `
      <strong>📍 Smart Fire Guardian</strong>
      <br>
      Device: ${DEVICE_ID}
    `
  );


  /* -------------------------------------------------------
     POLICE MARKER
     ------------------------------------------------------- */

  policeMarker =
    L.marker(

      [
        POLICE_LAT,
        POLICE_LNG
      ],

      {
        icon:
          markerIcon(
            "police"
          )
      }

    ).addTo(
      map
    );


  policeMarker.bindPopup(
    `
      <strong>🚓 Police Station</strong>
      <br>
      Nearest Police Station
      <br><br>
      <b>Emergency Response Point</b>
    `
  );


  /* -------------------------------------------------------
     FIRE STATION MARKER
     ------------------------------------------------------- */

  fireStationMarker =
    L.marker(

      [
        FIRE_STATION_LAT,
        FIRE_STATION_LNG
      ],

      {
        icon:
          markerIcon(
            "fireStation"
          )
      }

    ).addTo(
      map
    );


  fireStationMarker.bindPopup(
    `
      <strong>🚒 Fire Station</strong>
      <br>
      Emergency Fire Response Point
    `
  );


  /* -------------------------------------------------------
     DEVICE → POLICE LINE
     ------------------------------------------------------- */

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

        opacity: 0.75,

        dashArray:
          "8, 8"
      }

    );


  /* -------------------------------------------------------
     DEVICE → FIRE STATION LINE
     ------------------------------------------------------- */

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

        opacity: 0.75,

        dashArray:
          "8, 8"
      }

    );


  /* -------------------------------------------------------
     SHOW ALL THREE LOCATIONS
     ------------------------------------------------------- */

  showAllLocationsOnMap();


  console.log(
    "Map loaded."
  );

  console.log(
    "Device:",
    DEFAULT_LAT,
    DEFAULT_LNG
  );

  console.log(
    "Police:",
    POLICE_LAT,
    POLICE_LNG
  );

  console.log(
    "Fire Station:",
    FIRE_STATION_LAT,
    FIRE_STATION_LNG
  );

}


/* =========================================================
   SHOW ALL LOCATIONS
   ========================================================= */

function showAllLocationsOnMap() {

  if (
    !map
  ) {

    return;

  }


  const bounds =
    L.latLngBounds(

      [
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
      ]

    );


  map.fitBounds(

    bounds,

    {
      padding:
        [
          60,
          60
        ]
    }

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


  /* -------------------------------------------------------
     GET DEVICE COORDINATES
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     MOVE DEVICE MARKER
     ------------------------------------------------------- */

  deviceMarker.setLatLng(

    [
      currentLat,
      currentLng
    ]

  );


  /* -------------------------------------------------------
     DEVICE ICON
     ------------------------------------------------------- */

  deviceMarker.setIcon(

    markerIcon(

      fireAlert
        ? "fire"
        : "safe"

    )

  );


  /* -------------------------------------------------------
     DEVICE POPUP
     ------------------------------------------------------- */

  const building =
    data?.building ??
    "AMBIT COLLEGE";


  const floor =
    data?.floor ??
    "3";


  const zone =
    data?.zone ??
    "COMPUTER LAB";


  deviceMarker.setPopupContent(

    fireAlert

      ?

      `
        <strong style="color:#b91c1c">
          🔥 FIRE ALERT
        </strong>
        <br><br>
        <b>${building}</b>
        <br>
        Floor ${floor}
        <br>
        ${zone}
      `

      :

      `
        <strong>📍 Smart Fire Guardian</strong>
        <br><br>
        <b>${building}</b>
        <br>
        Floor ${floor}
        <br>
        ${zone}
      `

  );


  /* -------------------------------------------------------
     POLICE MARKER
     ------------------------------------------------------- */

  if (
    policeMarker
  ) {

    policeMarker.setLatLng(

      [
        POLICE_LAT,
        POLICE_LNG
      ]

    );

  }


  /* -------------------------------------------------------
     FIRE STATION MARKER
     ------------------------------------------------------- */

  if (
    fireStationMarker
  ) {

    fireStationMarker.setLatLng(

      [
        FIRE_STATION_LAT,
        FIRE_STATION_LNG
      ]

    );

  }


  /* -------------------------------------------------------
     UPDATE LINES
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     FIRE = SHOW EMERGENCY LINES
     ------------------------------------------------------- */

  if (
    fireAlert
  ) {

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


    const emergencyBounds =
      L.latLngBounds(

        [
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
        ]

      );


    map.fitBounds(

      emergencyBounds,

      {
        padding:
          [
            60,
            60
          ]
      }

    );

  }


  /* -------------------------------------------------------
     SAFE = HIDE LINES
     ------------------------------------------------------- */

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


    showAllLocationsOnMap();

  }


  /* -------------------------------------------------------
     FIRE BORDER
     ------------------------------------------------------- */

  const mapElement =
    $("map");


  if (
    mapElement
  ) {

    mapElement.classList.toggle(
      "fire-focus",
      fireAlert
    );

  }

}


/* =========================================================
   EMERGENCY RESPONSE PANEL
   ========================================================= */

function createEmergencyPanel() {

  if (
    $("emergencyResponsePanel")
  ) {

    return;

  }


  const panel =
    document.createElement(
      "div"
    );


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
            Fire location notification
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
            🚓 Nearest Police Station
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
            🚒 Fire Station
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


  const mapSection =
    $("map");


  if (
    mapSection &&
    mapSection.parentElement
  ) {

    mapSection.parentElement
      .insertBefore(
        panel,
        mapSection
      );

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


  if (
    !panel
  ) {

    return;

  }


  const building =
    data?.building ??
    "AMBIT COLLEGE";


  const floor =
    data?.floor ??
    "3";


  const zone =
    data?.zone ??
    "COMPUTER LAB";


  if (
    $("responseBuilding")
  ) {

    $("responseBuilding")
      .textContent =
      building;

  }


  if (
    $("responseFloorZone")
  ) {

    $("responseFloorZone")
      .textContent =
      `Floor ${floor} • ${zone}`;

  }


  const policeDistance =
    distanceKm(

      currentLat,
      currentLng,

      POLICE_LAT,
      POLICE_LNG

    );


  const fireStationDistance =
    distanceKm(

      currentLat,
      currentLng,

      FIRE_STATION_LAT,
      FIRE_STATION_LNG

    );


  if (
    $("policeDistance")
  ) {

    $("policeDistance")
      .textContent =
      `${policeDistance.toFixed(2)} km`;

  }


  if (
    $("fireStationDistance")
  ) {

    $("fireStationDistance")
      .textContent =
      `${fireStationDistance.toFixed(2)} km`;

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


  if (
    panel
  ) {

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
    document.createElement(
      "div"
    );


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


  if (
    button
  ) {

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


  if (
    popupMap
  ) {

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
          markerIcon(
            "fire"
          )
      }

    ).addTo(
      popupMap
    );


  popupDeviceMarker.bindPopup(
    "🔥 Fire Location"
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


  if (
    !popup
  ) {

    return;

  }


  const building =
    data?.building ??
    "AMBIT COLLEGE";


  const floor =
    data?.floor ??
    "3";


  const zone =
    data?.zone ??
    "COMPUTER LAB";


  if (
    $("popupBuilding")
  ) {

    $("popupBuilding")
      .textContent =
      building;

  }


  if (
    $("popupFloor")
  ) {

    $("popupFloor")
      .textContent =
      floor;

  }


  if (
    $("popupZone")
  ) {

    $("popupZone")
      .textContent =
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


        popupMap.setView(

          [
            currentLat,
            currentLng
          ],

          14

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


  if (
    popup
  ) {

    popup.classList.remove(
      "show"
    );

  }


  document.body.classList.remove(
    "fire-active"
  );

}


/* =========================================================
   UPDATE LOCATION
   ========================================================= */

function updateLocation(
  data
) {

  const building =
    data?.building ??
    "AMBIT COLLEGE";


  const floor =
    data?.floor ??
    "3";


  const zone =
    data?.zone ??
    "COMPUTER LAB";


  if (
    elements.location
  ) {

    elements.location.textContent =
      `${building} • Floor ${floor} • ${zone}`;

  }

}


/* =========================================================
   UPDATE DEVICE INFORMATION
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
      "AMBIT COLLEGE";

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
      "COMPUTER LAB";

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
   HEAT
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


  if (
    elements.flame
  ) {

    if (
      resistance > 0
    ) {

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
        ? "HEAT DETECTED"
        : "SAFE";

  }


  if (
    elements.heatCard
  ) {

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
   GAS / MQ2
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


  if (
    elements.gas
  ) {

    elements.gas.textContent =
      gasRaw;

  }


  if (
    elements.gasState
  ) {

    if (
      !heatDetected
    ) {

      elements.gasState.textContent =
        "WAITING FOR HEAT";

    }

    else if (
      gasDetected
    ) {

      elements.gasState.textContent =
        "SMOKE DETECTED";

    }

    else {

      elements.gasState.textContent =
        "SAFE";

    }

  }


  const showGasAlert =

    heatDetected &&
    gasDetected;


  if (
    elements.gasCard
  ) {

    elements.gasCard.classList.toggle(
      "alert",
      showGasAlert
    );

    elements.gasCard.classList.toggle(
      "safe",
      !showGasAlert
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

  /* -------------------------------------------------------
     STEP 1 - HEAT
     ------------------------------------------------------- */

  if (
    elements.stepHeat
  ) {

    elements.stepHeat.classList.toggle(
      "active",
      heatDetected
    );

    elements.stepHeat.classList.toggle(
      "complete",
      heatDetected
    );

  }


  if (
    elements.stepHeatStatus
  ) {

    elements.stepHeatStatus.textContent =

      heatDetected

        ? "Heat detected"

        : "Waiting";

  }


  /* -------------------------------------------------------
     STEP 2 - SMOKE
     ------------------------------------------------------- */

  const smokeActive =

    heatDetected &&
    gasDetected;


  if (
    elements.stepSmoke
  ) {

    elements.stepSmoke.classList.toggle(
      "active",
      smokeActive
    );

    elements.stepSmoke.classList.toggle(
      "complete",
      smokeActive
    );

  }


  if (
    elements.stepSmokeStatus
  ) {

    if (
      !heatDetected
    ) {

      elements.stepSmokeStatus.textContent =
        "Waiting for heat";

    }

    else if (
      !gasDetected
    ) {

      elements.stepSmokeStatus.textContent =
        "Smoke not detected";

    }

    else {

      elements.stepSmokeStatus.textContent =
        "Smoke detected";

    }

  }


  /* -------------------------------------------------------
     STEP 3 - FIRE
     ------------------------------------------------------- */

  if (
    elements.stepFire
  ) {

    elements.stepFire.classList.toggle(
      "active",
      fireAlert
    );

    elements.stepFire.classList.toggle(
      "complete",
      fireAlert
    );

  }


  if (
    elements.stepFireStatus
  ) {

    if (
      fireAlert
    ) {

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

  if (
    fireAlert
  ) {

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
        "Heat and smoke detected. Immediate attention required.";

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
        "🔥 FIRE ALARM ACTIVE";

      elements.alarm.classList.add(
        "active"
      );

    }

  }


  /* =======================================================
     HEAT
     ======================================================= */

  else if (
    heatDetected
  ) {

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

          ? "Smoke detected. Checking for fire confirmation..."

          : "High temperature detected. Monitoring for smoke.";

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

  }


  /* =======================================================
     SAFE
     ======================================================= */

  else {

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
        "heat",
        "fire"
      );

    }


    if (
      elements.statusDot
    ) {

      elements.statusDot.classList.add(
        "safe"
      );

      elements.statusDot.classList.remove(
        "heat",
        "fire"
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

}


/* =========================================================
   FIREBASE DATA
   ========================================================= */

function processFirebaseData(
  data
) {

  if (
    !data
  ) {

    console.warn(
      "No data found at:",
      DATA_PATH
    );

    return;

  }


  console.log(
    "Firebase data:",
    data
  );


  /* -------------------------------------------------------
     LOCATION
     ------------------------------------------------------- */

  updateLocation(
    data
  );


  /* -------------------------------------------------------
     DEVICE INFORMATION
     ------------------------------------------------------- */

  updateDeviceInfo(
    data
  );


  /* -------------------------------------------------------
     TOP BAR
     ------------------------------------------------------- */

  updateTopBar();


  /* -------------------------------------------------------
     HEAT FIRST
     ------------------------------------------------------- */

  const heat =
    updateHeat(
      data.sensors?.heat
    );


  /* -------------------------------------------------------
     MQ-2 SECOND
     ------------------------------------------------------- */

  const gas =
    updateGas(

      data.sensors?.gas,

      heat.heatDetected

    );


  /* -------------------------------------------------------
     FIRE ALERT
     ------------------------------------------------------- */

  const fireAlert =

    data.fireAlert === true

    ||

    data.status === "FIRE";


  /* -------------------------------------------------------
     FIRE CONFIRMATION
     ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     SEQUENCE
     ------------------------------------------------------- */

  updateSequence(

    heat.heatDetected,

    gas.gasDetected,

    fireAlert,

    confirmationCount,

    requiredCount

  );


  /* -------------------------------------------------------
     MAIN STATUS
     ------------------------------------------------------- */

  updateMainStatus(

    fireAlert,

    heat.heatDetected,

    gas.gasDetected

  );


  /* -------------------------------------------------------
     MAP
     ------------------------------------------------------- */

  updateMap(

    data,

    fireAlert

  );


  /* -------------------------------------------------------
     FIRE RESPONSE
     ------------------------------------------------------- */

  if (
    fireAlert
  ) {

    showEmergencyPanel(
      data
    );


    showFirePopup(
      data
    );

  }

  else {

    hideEmergencyPanel();


    if (
      previousFireState
    ) {

      hideFirePopup();

    }

  }


  previousFireState =
    fireAlert;

}


/* =========================================================
   FIREBASE CONNECTION STATUS
   ========================================================= */

const firebaseConnectionRef =
  ref(
    db,
    ".info/connected"
  );


onValue(

  firebaseConnectionRef,

  (snapshot) => {

    const connected =
      snapshot.val() === true;


    if (
      elements.fbDot
    ) {

      elements.fbDot.classList.toggle(
        "online",
        connected
      );

      elements.fbDot.classList.toggle(
        "offline",
        !connected
      );

    }


    if (
      elements.fbStatus
    ) {

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


    if (
      elements.fbStatus
    ) {

      elements.fbStatus.textContent =
        "Connection Error";

    }

  }

);


/* =========================================================
   DEVICE FIREBASE LISTENER
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
      "Device snapshot received:",
      data
    );


    processFirebaseData(
      data
    );

  },

  (error) => {

    console.error(
      "Device data error:",
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
  "======================================="
);

console.log(
  "SMART FIRE GUARDIAN"
);

console.log(
  "Dashboard started"
);

console.log(
  `Firebase path: /${DATA_PATH}`
);

console.log(
  "======================================="
);
