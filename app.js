// app.js
import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const DATA_PATH = "smartfire";
const OFFLINE_THRESHOLD_SEC = 20; // no update in this window = device considered offline

const el = id => document.getElementById(id);

function formatReading(value) {
  if (typeof value === "boolean") return value ? "DETECTED" : "NORMAL";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.toUpperCase();
  return "—";
}

function isAlertLike(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return /alert|detect|high|true/i.test(value);
  return false;
}

function secondsAgo(unixSeconds) {
  return Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
}

function formatAgo(sec) {
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

let lastUpdatedMs = null;

function render(data) {
  if (!data) return;

  // Status annunciator
  const statusRaw = (data.status || (data.alarm ? "ALERT" : "SAFE") || "").toUpperCase();
  const isAlert = statusRaw === "ALERT" || isAlertLike(data.alarm);
  el("statusText").textContent = statusRaw || "UNKNOWN";
  el("statusValue").className = "status-value " + (isAlert ? "alert" : "safe");
  el("statusDot").className = "status-indicator " + (isAlert ? "alert" : "safe");

  el("location").textContent =
    [data.building, data.floor ? `Floor ${data.floor}` : null, data.zone]
      .filter(Boolean).join(" · ") || "—";

  el("deviceId").textContent = data.device_id ?? "—";
  el("zone").textContent = data.zone ?? "—";
  el("building").textContent = data.building ?? "—";
  el("floor").textContent = data.floor ?? "—";

  el("gas").textContent = formatReading(data.gas);
  el("gas").className = "v" + (isAlertLike(data.gas) ? " warn" : "");

  el("smoke").textContent = formatReading(data.smoke);
  el("smoke").className = "v" + (isAlertLike(data.smoke) ? " warn" : "");

  el("flame").textContent = formatReading(data.flame);
  el("flame").className = "v" + (isAlertLike(data.flame) ? " warn" : "");

  el("alarm").textContent = data.alarm ? "ACTIVE" : "OFF";
  el("alarm").className = "v" + (data.alarm ? " warn" : "");

  // Temperature sensor is not physically connected yet - never display a live value here,
  // even if the field exists in the database, to avoid showing fabricated data.
  el("temperature").textContent = "NOT CONNECTED";

  lastUpdatedMs = data.updated_ms ?? null;
  tickClock();
}

function tickClock() {
  if (!lastUpdatedMs) {
    el("lastUpdate").textContent = "last update: —";
    el("deviceConn").textContent = "UNKNOWN";
    el("deviceConn").className = "v dim";
    return;
  }
  const sec = secondsAgo(Math.floor(lastUpdatedMs / 1000));
  el("lastUpdate").textContent = `last update: ${formatAgo(sec)}`;

  const online = sec <= OFFLINE_THRESHOLD_SEC;
  el("deviceConn").textContent = online ? "ONLINE" : "OFFLINE";
  el("deviceConn").className = "v" + (online ? "" : " warn");
}

setInterval(tickClock, 1000);

// Live data listener
onValue(ref(db, DATA_PATH), snapshot => {
  render(snapshot.val());
});

// Firebase connection state (RTDB's own health signal)
onValue(ref(db, ".info/connected"), snapshot => {
  const connected = snapshot.val() === true;
  el("fbStatus").textContent = connected ? "connected" : "disconnected";
  el("fbDot").className = "dot " + (connected ? "on" : "off");
});
