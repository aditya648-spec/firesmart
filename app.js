import { db } from "./firebase-config.js";
import {
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* =========================================================
   SMART FIRE GUARDIAN — Dashboard Controller
   ========================================================= */

const DEVICE_ID = "SF-003";
const DATA_PATH = `devices/${DEVICE_ID}`;

const DEFAULT_GAS_THRESHOLD = 1600;
const DEFAULT_FIRE_THRESHOLD = 5000;

/* Your location coordinates */
const DEFAULT_LAT = 15.855881303189477;
const DEFAULT_LNG = 74.57802140000477;
const DEFAULT_ZOOM = 16;

let previousFireState = false;
let lastFirebaseData = null;

let map = null;
let marker = null;
let currentLat = DEFAULT_LAT;
let currentLng = DEFAULT_LNG;

let popupMap = null;
let popupMarker = null;

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);

const elements = {
  deviceTopDot: $("deviceTopDot"),
  deviceTopStatus: $("deviceTopStatus"),
  lastUpdate: $("lastUpdate"),
  location: $("location"),
  mainStatus: $("mainStatus"),
  statusDot: $("statusDot"),
  statusValue: $("statusValue"),
  statusText: $("statusText"),
  statusDescription: $("statusDescription"),
  heatCard: $("heatCard"),
  flame: $("flame"),
  heatState: $("heatState"),
  gasCard: $("gasCard"),
  gas: $("gas"),
  gasState: $("gasState"),
  stepHeat: $("stepHeat"),
  stepHeatStatus: $("stepHeatStatus"),
  stepSmoke: $("stepSmoke"),
  stepSmokeStatus: $("stepSmokeStatus"),
  stepFire: $("stepFire"),
  stepFireStatus: $("stepFireStatus"),
  alarm: $("alarm"),
  deviceId: $("deviceId"),
  building: $("building"),
  floor: $("floor"),
  zone: $("zone"),
  fbDot: $("fbDot"),
  fbStatus: $("fbStatus"),
  deviceConn: $("deviceConn")
};

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getValidCoord(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) {
    return fallback;
  }
  return n;
}

/* ---------- Map ---------- */
function createMarkerIcon(isFire) {
  const colorClass = isFire ? "fire" : "safe";
  const emoji = isFire ? "🔥" : "📍";

  return L.divIcon({
    className: "sf-marker",
    html: `<div class="sf-marker-pin ${colorClass}"><span>${emoji}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
}

function initMap() {
  const mapEl = $("map");
  if (!mapEl || typeof L === "undefined") {
    console.warn("Leaflet not loaded or map element missing.");
    return;
  }

  map = L.map("map", {
    zoomControl: true,
    attributionControl: true
  }).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  marker = L.marker([DEFAULT_LAT, DEFAULT_LNG], {
    icon: createMarkerIcon(false)
  }).addTo(map);

  marker.bindPopup("Device location");
  console.log("Map initialized at:", DEFAULT_LAT, DEFAULT_LNG);
}

function updateMap(data, fireAlert) {
  if (!map || !marker) return;

  const lat = getValidCoord(
    data?.lat ?? data?.location?.lat ?? data?.coordinates?.lat,
    DEFAULT_LAT
  );
  const lng = getValidCoord(
    data?.lng ?? data?.location?.lng ?? data?.coordinates?.lng,
    DEFAULT_LNG
  );

  currentLat = lat;
  currentLng = lng;

  marker.setLatLng([lat, lng]);
  marker.setIcon(createMarkerIcon(fireAlert));

  const building = data.building ?? "ABC Apartments";
  const floor = data.floor ?? "3";
  const zone = data.zone ?? "Room 302";

  const popupHtml = fireAlert
    ? `<strong style="color:#b91c1c">🔥 FIRE ALERT</strong><br>${building}<br>Floor ${floor} • ${zone}`
    : `<strong>Monitoring</strong><br>${building}<br>Floor ${floor} • ${zone}`;

  marker.setPopupContent(popupHtml);
  map.setView([lat, lng], DEFAULT_ZOOM);

  const mapEl = $("map");
  if (mapEl) {
    mapEl.classList.toggle("fire-focus", fireAlert);
  }

  if (fireAlert) {
    marker.openPopup();
  }
}

/* ---------- Fire Popup (with map) ---------- */
function createFirePopup() {
  if ($("firePopup")) return;

  const popup = document.createElement("div");
  popup.id = "firePopup";
  popup.innerHTML = `
    <div class="fire-popup-overlay">
      <div class="fire-popup-box">
        <div class="fire-popup-icon">🔥</div>
        <div class="fire-popup-title">FIRE ALERT</div>
        <div class="fire-popup-message">Fire conditions detected at this location!</div>
        <div class="fire-popup-details">
          <div>
            <strong>Building:</strong>
            <span id="popupBuilding">—</span>
          </div>
          <div>
            <strong>Floor:</strong>
            <span id="popupFloor">—</span>
          </div>
          <div>
            <strong>Zone:</strong>
            <span id="popupZone">—</span>
          </div>
        </div>
        <div class="fire-popup-map-wrap">
          <div id="popupMap" class="fire-popup-map"></div>
        </div>
        <button id="acknowledgeFire" type="button">ACKNOWLEDGE</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  const acknowledgeButton = $("acknowledgeFire");
  if (acknowledgeButton) {
    acknowledgeButton.addEventListener("click", hideFirePopup);
  }
}

function initPopupMap(lat, lng) {
  const mapEl = $("popupMap");
  if (!mapEl || typeof L === "undefined") return;

  if (!popupMap) {
    popupMap = L.map("popupMap", {
      zoomControl: true,
      attributionControl: false
    }).setView([lat, lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(popupMap);

    popupMarker = L.marker([lat, lng], {
      icon: createMarkerIcon(true)
    }).addTo(popupMap);

    popupMarker.bindPopup("🔥 Fire location");
  } else {
    popupMap.setView([lat, lng], 16);
    popupMarker.setLatLng([lat, lng]);
    popupMarker.setIcon(createMarkerIcon(true));
  }

  setTimeout(() => {
    if (popupMap) {
      popupMap.invalidateSize();
      popupMap.setView([lat, lng], 16);
      popupMarker.openPopup();
    }
  }, 200);
}

function showFirePopup(data) {
  createFirePopup();

  const popup = $("firePopup");
  if (!popup) return;

  const building = data.building ?? "ABC Apartments";
  const floor = data.floor ?? "3";
  const zone = data.zone ?? "Room 302";

  if ($("popupBuilding")) $("popupBuilding").textContent = building;
  if ($("popupFloor")) $("popupFloor").textContent = floor;
  if ($("popupZone")) $("popupZone").textContent = zone;

  const lat = getValidCoord(
    data?.lat ?? data?.location?.lat ?? data?.coordinates?.lat,
    DEFAULT_LAT
  );
  const lng = getValidCoord(
    data?.lng ?? data?.location?.lng ?? data?.coordinates?.lng,
    DEFAULT_LNG
  );

  popup.classList.add("show");
  document.body.classList.add("fire-active");

  initPopupMap(lat, lng);
}

function hideFirePopup() {
  const popup = $("firePopup");
  if (popup) popup.classList.remove("show");
  document.body.classList.remove("fire-active");
}

/* ---------- Connection Status ---------- */
function setFirebaseConnected(connected) {
  if (elements.fbDot) {
    elements.fbDot.classList.toggle("online", connected);
    elements.fbDot.classList.toggle("offline", !connected);
  }
  if (elements.fbStatus) {
    elements.fbStatus.textContent = connected ? "Connected" : "Disconnected";
  }
}

const connectionRef = ref(db, ".info/connected");
onValue(
  connectionRef,
  (snapshot) => {
    setFirebaseConnected(snapshot.val() === true);
  },
  (error) => {
    console.error("Firebase connection error:", error);
    setFirebaseConnected(false);
  }
);

/* ---------- UI Update Helpers ---------- */
function updateLocation(data) {
  const building = data.building ?? "ABC Apartments";
  const floor = data.floor ?? "3";
  const zone = data.zone ?? "Room 302";

  if (elements.location) {
    elements.location.textContent = `${building} • Floor ${floor} • ${zone}`;
  }
}

function updateDeviceInfo(data) {
  if (elements.deviceId) {
    elements.deviceId.textContent = data.deviceId ?? DEVICE_ID;
  }
  if (elements.building) {
    elements.building.textContent = data.building ?? "ABC Apartments";
  }
  if (elements.floor) {
    elements.floor.textContent = data.floor ?? "3";
  }
  if (elements.zone) {
    elements.zone.textContent = data.zone ?? "Room 302";
  }
}

function updateTopBar() {
  if (elements.lastUpdate) {
    elements.lastUpdate.textContent = getCurrentTime();
  }
  if (elements.deviceTopDot) {
    elements.deviceTopDot.classList.add("online");
    elements.deviceTopDot.classList.remove("offline");
  }
  if (elements.deviceTopStatus) {
    elements.deviceTopStatus.textContent = "Device Online";
  }
  if (elements.deviceConn) {
    elements.deviceConn.textContent = "Online";
  }
}

function updateHeat(heatData) {
  const resistance = numberValue(heatData?.resistance);
  const fireThreshold = numberValue(
    heatData?.fireThreshold,
    DEFAULT_FIRE_THRESHOLD
  );

  const heatDetected =
    heatData?.alert === true ||
    (resistance > 0 && resistance <= fireThreshold);

  if (elements.flame) {
    elements.flame.textContent =
      resistance > 0 ? `${(resistance / 1000).toFixed(2)} kΩ` : "—";
  }

  if (elements.heatState) {
    elements.heatState.textContent = heatDetected ? "HEAT DETECTED" : "SAFE";
  }

  if (elements.heatCard) {
    elements.heatCard.classList.toggle("alert", heatDetected);
    elements.heatCard.classList.toggle("safe", !heatDetected);
  }

  return { resistance, fireThreshold, heatDetected };
}

function updateGas(gasData, heatDetected) {
  const rawGas = numberValue(gasData?.raw);
  const gasThreshold = numberValue(
    gasData?.threshold,
    DEFAULT_GAS_THRESHOLD
  );

  const gasDetected =
    gasData?.alert === true || rawGas >= gasThreshold;

  if (elements.gas) {
    elements.gas.textContent = rawGas.toString();
  }

  const smokeConfirmed = heatDetected && gasDetected;

  if (elements.gasState) {
    if (!heatDetected) {
      elements.gasState.textContent = "WAITING FOR HEAT";
    } else if (gasDetected) {
      elements.gasState.textContent = "SMOKE DETECTED";
    } else {
      elements.gasState.textContent = "SAFE";
    }
  }

  if (elements.gasCard) {
    elements.gasCard.classList.toggle("alert", smokeConfirmed);
    elements.gasCard.classList.toggle("safe", !smokeConfirmed);
  }

  return { rawGas, gasThreshold, gasDetected, smokeConfirmed };
}

function updateSequence(
  heatDetected,
  gasDetected,
  fireAlert,
  confirmationCount,
  requiredCount
) {
  if (elements.stepHeat) {
    elements.stepHeat.classList.toggle("active", heatDetected);
    elements.stepHeat.classList.toggle("complete", heatDetected);
  }
  if (elements.stepHeatStatus) {
    elements.stepHeatStatus.textContent = heatDetected
      ? "Heat detected"
      : "Waiting";
  }

  const smokeStepActive = heatDetected && gasDetected;
  if (elements.stepSmoke) {
    elements.stepSmoke.classList.toggle("active", smokeStepActive);
    elements.stepSmoke.classList.toggle("complete", smokeStepActive);
  }
  if (elements.stepSmokeStatus) {
    if (!heatDetected) {
      elements.stepSmokeStatus.textContent = "Waiting for heat";
    } else if (!gasDetected) {
      elements.stepSmokeStatus.textContent = "Smoke not detected";
    } else {
      elements.stepSmokeStatus.textContent = "Smoke detected";
    }
  }

  if (elements.stepFire) {
    elements.stepFire.classList.toggle("active", fireAlert);
    elements.stepFire.classList.toggle("complete", fireAlert);
  }
  if (elements.stepFireStatus) {
    if (fireAlert) {
      elements.stepFireStatus.textContent = "FIRE CONFIRMED";
    } else if (heatDetected && gasDetected) {
      elements.stepFireStatus.textContent = `Confirming ${confirmationCount}/${requiredCount}`;
    } else {
      elements.stepFireStatus.textContent = "Not confirmed";
    }
  }
}

function updateMainStatus(fireAlert, heatDetected, gasDetected) {
  if (fireAlert) {
    if (elements.statusValue) elements.statusValue.textContent = "FIRE";
    if (elements.statusText) elements.statusText.textContent = "FIRE CONFIRMED";
    if (elements.statusDescription) {
      elements.statusDescription.textContent =
        "Heat and smoke detected. Immediate attention required.";
    }
    if (elements.mainStatus) {
      elements.mainStatus.classList.add("fire");
      elements.mainStatus.classList.remove("heat", "safe");
    }
    if (elements.statusDot) {
      elements.statusDot.classList.add("fire");
      elements.statusDot.classList.remove("safe", "heat");
    }
    if (elements.alarm) {
      elements.alarm.textContent = "🔥 FIRE ALARM ACTIVE";
      elements.alarm.classList.add("active");
    }
  } else if (heatDetected) {
    if (elements.statusValue) elements.statusValue.textContent = "HEAT";
    if (elements.statusText) elements.statusText.textContent = "HEAT DETECTED";
    if (elements.statusDescription) {
      elements.statusDescription.textContent = gasDetected
        ? "Smoke detected. Checking for fire confirmation..."
        : "High temperature detected. Monitoring for smoke.";
    }
    if (elements.mainStatus) {
      elements.mainStatus.classList.add("heat");
      elements.mainStatus.classList.remove("fire", "safe");
    }
    if (elements.statusDot) {
      elements.statusDot.classList.add("heat");
      elements.statusDot.classList.remove("fire", "safe");
    }
    if (elements.alarm) {
      elements.alarm.textContent = "Heat detected — monitoring";
      elements.alarm.classList.remove("active");
    }
  } else {
    if (elements.statusValue) elements.statusValue.textContent = "SAFE";
    if (elements.statusText) elements.statusText.textContent = "SYSTEM SAFE";
    if (elements.statusDescription) {
      elements.statusDescription.textContent = "No fire conditions detected.";
    }
    if (elements.mainStatus) {
      elements.mainStatus.classList.add("safe");
      elements.mainStatus.classList.remove("fire", "heat");
    }
    if (elements.statusDot) {
      elements.statusDot.classList.add("safe");
      elements.statusDot.classList.remove("fire", "heat");
    }
    if (elements.alarm) {
      elements.alarm.textContent = "No alarm";
      elements.alarm.classList.remove("active");
    }
  }
}

/* ---------- Main Data Processor ---------- */
function processData(data) {
  if (!data) {
    console.warn("No Firebase data received.");
    return;
  }

  lastFirebaseData = data;
  console.log("Firebase data received:", data);

  updateLocation(data);
  updateDeviceInfo(data);
  updateTopBar();

  const heat = updateHeat(data.sensors?.heat);
  const gas = updateGas(data.sensors?.gas, heat.heatDetected);

  const fireAlert =
    data.fireAlert === true || data.status === "FIRE";

  const confirmationCount = numberValue(data.fireConfirmation?.count, 0);
  const requiredCount = numberValue(data.fireConfirmation?.required, 3);

  updateSequence(
    heat.heatDetected,
    gas.gasDetected,
    fireAlert,
    confirmationCount,
    requiredCount
  );

  updateMainStatus(fireAlert, heat.heatDetected, gas.gasDetected);
  updateMap(data, fireAlert);

  if (fireAlert) {
    showFirePopup(data);
  } else if (previousFireState) {
    hideFirePopup();
  }

  previousFireState = fireAlert;
}

/* ---------- Listen to Device Data ---------- */
const deviceRef = ref(db, DATA_PATH);
onValue(
  deviceRef,
  (snapshot) => {
    const data = snapshot.val();
    console.log("SF-003 snapshot:", data);
    processData(data);
  },
  (error) => {
    console.error("Firebase device data error:", error);
    if (elements.deviceTopStatus) {
      elements.deviceTopStatus.textContent = "Firebase Error";
    }
    if (elements.deviceConn) {
      elements.deviceConn.textContent = "Connection Error";
    }
  }
);

/* ---------- Init ---------- */
createFirePopup();
initMap();

console.log("==========================================");
console.log("SMART FIRE GUARDIAN DASHBOARD");
console.log(`Listening to: /${DATA_PATH}`);
console.log("Map location:", DEFAULT_LAT, DEFAULT_LNG);
console.log("==========================================");
