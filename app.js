import { db } from "./firebase-config.js";

import {
    ref,
    onValue,
    onDisconnect,
    set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// ======================================================
// SMART FIRE GUARDIAN
// Dashboard Firebase Controller
// ======================================================

const DEVICE_ID = "SF-003";
const DATA_PATH = `devices/${DEVICE_ID}`;

const DEFAULT_GAS_THRESHOLD = 1600;
const DEFAULT_FIRE_THRESHOLD = 5000; // 5 kΩ

let previousFireState = false;
let lastFirebaseData = null;


// ======================================================
// GET HTML ELEMENTS
// ======================================================

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


// ======================================================
// CREATE FIRE POPUP
// ======================================================

function createFirePopup() {

    if ($("firePopup")) {
        return;
    }

    const popup = document.createElement("div");

    popup.id = "firePopup";

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

                <button id="acknowledgeFire" type="button">
                    ACKNOWLEDGE
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(popup);

    const acknowledgeButton = $("acknowledgeFire");

    if (acknowledgeButton) {

        acknowledgeButton.addEventListener("click", () => {

            hideFirePopup();

        });

    }
}


// ======================================================
// SHOW FIRE POPUP
// ======================================================

function showFirePopup(data) {

    createFirePopup();

    const popup = $("firePopup");

    if (!popup) {
        return;
    }

    const building =
        data.building ??
        "ABC Apartments";

    const floor =
        data.floor ??
        "3";

    const zone =
        data.zone ??
        "Room 302";


    if ($("popupBuilding")) {
        $("popupBuilding").textContent = building;
    }

    if ($("popupFloor")) {
        $("popupFloor").textContent = floor;
    }

    if ($("popupZone")) {
        $("popupZone").textContent = zone;
    }


    popup.classList.add("show");

    document.body.classList.add("fire-active");
}


// ======================================================
// HIDE FIRE POPUP
// ======================================================

function hideFirePopup() {

    const popup = $("firePopup");

    if (popup) {
        popup.classList.remove("show");
    }

    document.body.classList.remove("fire-active");
}


// ======================================================
// FORMAT TIME
// ======================================================

function getCurrentTime() {

    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

}


// ======================================================
// SAFE NUMBER
// ======================================================

function numberValue(value, fallback = 0) {

    const n = Number(value);

    if (Number.isFinite(n)) {
        return n;
    }

    return fallback;
}


// ======================================================
// UPDATE CONNECTION STATUS
// ======================================================

function setFirebaseConnected(connected) {

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

}


// ======================================================
// FIREBASE CONNECTION MONITOR
// ======================================================

const connectionRef = ref(db, ".info/connected");

onValue(
    connectionRef,
    (snapshot) => {

        const connected = snapshot.val() === true;

        setFirebaseConnected(connected);

    },

    (error) => {

        console.error(
            "Firebase connection error:",
            error
        );

        setFirebaseConnected(false);

    }
);


// ======================================================
// UPDATE LOCATION
// ======================================================

function updateLocation(data) {

    const building =
        data.building ?? "ABC Apartments";

    const floor =
        data.floor ?? "3";

    const zone =
        data.zone ?? "Room 302";


    if (elements.location) {

        elements.location.textContent =
            `${building} • Floor ${floor} • ${zone}`;

    }

}


// ======================================================
// UPDATE DEVICE INFORMATION
// ======================================================

function updateDeviceInfo(data) {

    if (elements.deviceId) {

        elements.deviceId.textContent =
            data.deviceId ?? DEVICE_ID;

    }

    if (elements.building) {

        elements.building.textContent =
            data.building ?? "ABC Apartments";

    }

    if (elements.floor) {

        elements.floor.textContent =
            data.floor ?? "3";

    }

    if (elements.zone) {

        elements.zone.textContent =
            data.zone ?? "Room 302";

    }

}


// ======================================================
// UPDATE TOP BAR
// ======================================================

function updateTopBar() {

    if (elements.lastUpdate) {

        elements.lastUpdate.textContent =
            getCurrentTime();

    }


    if (elements.deviceTopDot) {

        elements.deviceTopDot.classList.add("online");

        elements.deviceTopDot.classList.remove("offline");

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


// ======================================================
// UPDATE HEAT SENSOR
// ======================================================

function updateHeat(heatData) {

    const rawADC =
        numberValue(heatData?.rawADC);

    const voltage =
        numberValue(heatData?.voltage);

    const resistance =
        numberValue(heatData?.resistance);

    const fireThreshold =
        numberValue(
            heatData?.fireThreshold,
            DEFAULT_FIRE_THRESHOLD
        );


    // ESP32 already calculates heat alert.
    // We also calculate it here as backup.

    const heatDetected =
        heatData?.alert === true ||
        (
            resistance > 0 &&
            resistance <= fireThreshold
        );


    // Display resistance

    if (elements.flame) {

        if (resistance > 0) {

            elements.flame.textContent =
                `${(resistance / 1000).toFixed(2)} kΩ`;

        } else {

            elements.flame.textContent =
                "—";

        }

    }


    // Heat state

    if (elements.heatState) {

        elements.heatState.textContent =
            heatDetected
                ? "HEAT DETECTED"
                : "SAFE";

    }


    // Heat card

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
        rawADC,
        voltage,
        resistance,
        fireThreshold,
        heatDetected
    };

}


// ======================================================
// UPDATE GAS SENSOR
// ======================================================

function updateGas(gasData, heatDetected) {

    const rawGas =
        numberValue(gasData?.raw);

    const gasThreshold =
        numberValue(
            gasData?.threshold,
            DEFAULT_GAS_THRESHOLD
        );


    const gasDetected =
        gasData?.alert === true ||
        rawGas >= gasThreshold;


    if (elements.gas) {

        elements.gas.textContent =
            rawGas.toString();

    }


    /*
       IMPORTANT:

       Smoke/gas is only meaningful for FIRE
       after heat has already been detected.
    */

    const smokeConfirmed =
        heatDetected && gasDetected;


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


    if (elements.gasCard) {

        elements.gasCard.classList.toggle(
            "alert",
            smokeConfirmed
        );

        elements.gasCard.classList.toggle(
            "safe",
            !smokeConfirmed
        );

    }


    return {
        rawGas,
        gasThreshold,
        gasDetected,
        smokeConfirmed
    };

}


// ======================================================
// UPDATE DETECTION SEQUENCE
// ======================================================

function updateSequence(
    heatDetected,
    gasDetected,
    fireAlert,
    confirmationCount,
    requiredCount
) {

    // ------------------------------
    // STEP 1 - HEAT
    // ------------------------------

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


    // ------------------------------
    // STEP 2 - SMOKE
    // ------------------------------

    const smokeStepActive =
        heatDetected && gasDetected;


    if (elements.stepSmoke) {

        elements.stepSmoke.classList.toggle(
            "active",
            smokeStepActive
        );

        elements.stepSmoke.classList.toggle(
            "complete",
            smokeStepActive
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


    // ------------------------------
    // STEP 3 - FIRE
    // ------------------------------

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
        else if (heatDetected && gasDetected) {

            elements.stepFireStatus.textContent =
                `Confirming ${confirmationCount}/${requiredCount}`;

        }
        else {

            elements.stepFireStatus.textContent =
                "Not confirmed";

        }

    }

}


// ======================================================
// UPDATE MAIN STATUS
// ======================================================

function updateMainStatus(
    fireAlert,
    heatDetected,
    gasDetected
) {

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

            elements.mainStatus.classList.add("fire");
            elements.mainStatus.classList.remove("heat");
            elements.mainStatus.classList.remove("safe");

        }

        if (elements.statusDot) {

            elements.statusDot.classList.add("fire");
            elements.statusDot.classList.remove("safe");
            elements.statusDot.classList.remove("heat");

        }

        if (elements.alarm) {

            elements.alarm.textContent =
                "🔥 FIRE ALARM ACTIVE";

            elements.alarm.classList.add("active");

        }

    }

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

            elements.mainStatus.classList.add("heat");
            elements.mainStatus.classList.remove("fire");
            elements.mainStatus.classList.remove("safe");

        }

        if (elements.statusDot) {

            elements.statusDot.classList.add("heat");
            elements.statusDot.classList.remove("fire");
            elements.statusDot.classList.remove("safe");

        }

        if (elements.alarm) {

            elements.alarm.textContent =
                "Heat detected — monitoring";

            elements.alarm.classList.remove("active");

        }

    }

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

            elements.mainStatus.classList.add("safe");
            elements.mainStatus.classList.remove("fire");
            elements.mainStatus.classList.remove("heat");

        }

        if (elements.statusDot) {

            elements.statusDot.classList.add("safe");
            elements.statusDot.classList.remove("fire");
            elements.statusDot.classList.remove("heat");

        }

        if (elements.alarm) {

            elements.alarm.textContent =
                "No alarm";

            elements.alarm.classList.remove("active");

        }

    }

}


// ======================================================
// PROCESS FIREBASE DATA
// ======================================================

function processData(data) {

    if (!data) {

        console.warn(
            "No Firebase data received."
        );

        return;

    }


    lastFirebaseData = data;


    console.log(
        "Firebase data received:",
        data
    );


    // ------------------------------
    // Basic information
    // ------------------------------

    updateLocation(data);

    updateDeviceInfo(data);

    updateTopBar();


    // ------------------------------
    // Heat FIRST
    // ------------------------------

    const heat =
        updateHeat(data.sensors?.heat);


    // ------------------------------
    // Gas SECOND
    // ------------------------------

    const gas =
        updateGas(
            data.sensors?.gas,
            heat.heatDetected
        );


    // ------------------------------
    // FIRE ALERT
    // ------------------------------

    const fireAlert =
        data.fireAlert === true ||
        data.status === "FIRE";


    // ------------------------------
    // Confirmation count
    // ------------------------------

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


    // ------------------------------
    // Sequence
    // ------------------------------

    updateSequence(
        heat.heatDetected,
        gas.gasDetected,
        fireAlert,
        confirmationCount,
        requiredCount
    );


    // ------------------------------
    // Main status
    // ------------------------------

    updateMainStatus(
        fireAlert,
        heat.heatDetected,
        gas.gasDetected
    );


    // ------------------------------
    // FIRE POPUP
    // ------------------------------

    if (fireAlert) {

        showFirePopup(data);

    }
    else {

        /*
           Only hide automatically when the
           Firebase fireAlert has returned false.
        */

        if (previousFireState) {

            hideFirePopup();

        }

    }


    // Remember state

    previousFireState =
        fireAlert;

}


// ======================================================
// LISTEN TO DEVICE DATA
// ======================================================

const deviceRef =
    ref(db, DATA_PATH);


onValue(
    deviceRef,

    (snapshot) => {

        const data =
            snapshot.val();

        console.log(
            "SF-003 snapshot:",
            data
        );

        processData(data);

    },

    (error) => {

        console.error(
            "Firebase device data error:",
            error
        );

        if (elements.deviceTopStatus) {

            elements.deviceTopStatus.textContent =
                "Firebase Error";

        }

        if (elements.deviceConn) {

            elements.deviceConn.textContent =
                "Connection Error";

        }

    }
);


// ======================================================
// INITIAL POPUP CREATION
// ======================================================

createFirePopup();


// ======================================================
// PAGE LOAD MESSAGE
// ======================================================

console.log(
    "=========================================="
);

console.log(
    "SMART FIRE GUARDIAN DASHBOARD"
);

console.log(
    `Listening to: /${DATA_PATH}`
);

console.log(
    "=========================================="
);
