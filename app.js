import { db } from "./firebase-config.js";

import {
    ref,
    onValue,
    push,
    set,
    query,
    orderByChild,
    limitToLast
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

const GAS_THRESHOLD =
    1600;

const DEFAULT_FIRE_THRESHOLD =
    5000;

const OFFLINE_THRESHOLD_SECONDS =
    20;


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
   MAP VARIABLES
   ========================================================= */

let map = null;

let deviceMarker = null;

let policeMarker = null;

let fireStationMarker = null;

let policeRoute = null;

let fireStationRoute = null;

let policeArrow = null;

let fireStationArrow = null;


/* =========================================================
   DEVICE POSITION
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

let firePopupAcknowledged =
    false;

let lastFirebaseUpdateTime =
    0;


/* =========================================================
   ELEMENT HELPER
   ========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   ELEMENTS
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

    recentFireLogs:
        $("recentFireLogs")

};


/* =========================================================
   HELPERS
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


function textValue(
    value,
    fallback = "—"
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


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function formatDateTime(timestamp) {

    const date =
        new Date(
            Number(timestamp)
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Unknown time";

    }

    return date.toLocaleString(
        [],
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );

}


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
   MARKER ICON
   ========================================================= */

function markerIcon(type) {

    let emoji =
        "📍";

    let className =
        "safe";


    if (
        type === "police"
    ) {

        emoji =
            "🚓";

        className =
            "police";

    }


    else if (
        type === "fireStation"
    ) {

        emoji =
            "🚒";

        className =
            "station";

    }


    else if (
        type === "fire"
    ) {

        emoji =
            "🔥";

        className =
            "fire";

    }


    return L.divIcon({

        className:
            "sf-marker",

        html:
            `
                <div class="sf-marker-pin ${className}">
                    <span>${emoji}</span>
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


    if (
        !mapElement ||
        typeof L === "undefined"
    ) {

        console.error(
            "Leaflet or map element unavailable."
        );

        return;

    }


    map =
        L.map(
            "map",
            {
                zoomControl: true
            }
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }
    ).addTo(map);


    /* =====================================================
       YOUR LOCATION
       ===================================================== */

    deviceMarker =
        L.marker(
            [
                currentLat,
                currentLng
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


    /* =====================================================
       POLICE
       ===================================================== */

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


    /* =====================================================
       FIRE STATION
       ===================================================== */

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


    /* =====================================================
       RESPONSE ROUTES
       
       Created but NOT added.
       
       They appear ONLY during FIRE.
       ===================================================== */

    policeRoute =
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
                color:
                    "#2563eb",

                weight:
                    4,

                opacity:
                    0.85,

                dashArray:
                    "8,8",

                className:
                    "fire-route-line"
            }
        );


    fireStationRoute =
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
                color:
                    "#ea580c",

                weight:
                    4,

                opacity:
                    0.85,

                dashArray:
                    "8,8",

                className:
                    "fire-route-line"
            }
        );


    /*
       Initial arrows.
       They are NOT added to map.
    */

    rebuildRouteArrows();


    /* =====================================================
       INITIAL VIEW
       
       fitBounds happens ONLY HERE.
       
       Firebase updates will NOT reset zoom.
       ===================================================== */

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
                [70, 70]
        }
    );


    console.log(
        "MAP INITIALIZED"
    );

}


/* =========================================================
   CREATE ARROW
   ========================================================= */

function createRouteArrow(
    lat1,
    lng1,
    lat2,
    lng2
) {

    const midLat =
        (
            lat1 +
            lat2
        ) / 2;


    const midLng =
        (
            lng1 +
            lng2
        ) / 2;


    /*
       Approximate direction of route.
    */

    const angle =
        Math.atan2(
            lng2 - lng1,
            lat2 - lat1
        ) *
        180 /
        Math.PI;


    return L.marker(
        [
            midLat,
            midLng
        ],
        {

            icon:
                L.divIcon(
                    {

                        className:
                            "fire-route-arrow",

                        html:
                            `
                                <div
                                    class="fire-route-arrow-shape"
                                    style="transform: rotate(${angle}deg);"
                                ></div>
                            `,

                        iconSize:
                            [20, 20],

                        iconAnchor:
                            [10, 10]

                    }
                ),

            interactive:
                false,

            keyboard:
                false

        }
    );

}


/* =========================================================
   REBUILD ARROWS
   ========================================================= */

function rebuildRouteArrows() {

    if (!map) {
        return;
    }


    if (
        policeArrow &&
        map.hasLayer(
            policeArrow
        )
    ) {

        map.removeLayer(
            policeArrow
        );

    }


    if (
        fireStationArrow &&
        map.hasLayer(
            fireStationArrow
        )
    ) {

        map.removeLayer(
            fireStationArrow
        );

    }


    policeArrow =
        createRouteArrow(
            currentLat,
            currentLng,
            POLICE_LAT,
            POLICE_LNG
        );


    fireStationArrow =
        createRouteArrow(
            currentLat,
            currentLng,
            FIRE_STATION_LAT,
            FIRE_STATION_LNG
        );

}


/* =========================================================
   SHOW RESPONSE ROUTES
   ========================================================= */

function showFireResponseRoutes() {

    if (!map) {
        return;
    }


    /*
       Update route positions.
    */

    policeRoute.setLatLngs(
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


    fireStationRoute.setLatLngs(
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


    rebuildRouteArrows();


    policeRoute.addTo(
        map
    );


    fireStationRoute.addTo(
        map
    );


    policeArrow.addTo(
        map
    );


    fireStationArrow.addTo(
        map
    );


    const mapElement =
        $("map");


    if (mapElement) {

        mapElement.classList.add(
            "fire-focus"
        );

    }

}


/* =========================================================
   HIDE RESPONSE ROUTES
   ========================================================= */

function hideFireResponseRoutes() {

    if (!map) {
        return;
    }


    if (
        policeRoute &&
        map.hasLayer(
            policeRoute
        )
    ) {

        map.removeLayer(
            policeRoute
        );

    }


    if (
        fireStationRoute &&
        map.hasLayer(
            fireStationRoute
        )
    ) {

        map.removeLayer(
            fireStationRoute
        );

    }


    if (
        policeArrow &&
        map.hasLayer(
            policeArrow
        )
    ) {

        map.removeLayer(
            policeArrow
        );

    }


    if (
        fireStationArrow &&
        map.hasLayer(
            fireStationArrow
        )
    ) {

        map.removeLayer(
            fireStationArrow
        );

    }


    const mapElement =
        $("map");


    if (mapElement) {

        mapElement.classList.remove(
            "fire-focus"
        );

    }

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


    currentLat =
        validCoordinate(
            data?.lat ??
            data?.latitude ??
            data?.location?.lat ??
            data?.location?.latitude ??
            data?.coordinates?.lat,

            DEFAULT_LAT
        );


    currentLng =
        validCoordinate(
            data?.lng ??
            data?.longitude ??
            data?.location?.lng ??
            data?.location?.longitude ??
            data?.coordinates?.lng,

            DEFAULT_LNG
        );


    /*
       Move marker.
       
       IMPORTANT:
       Do NOT call fitBounds().
       This preserves user's zoom.
    */

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


    if (fireAlert) {

        deviceMarker.setTooltipContent(
            "🔥 FIRE LOCATION"
        );

    } else {

        deviceMarker.setTooltipContent(
            "📍 YOUR LOCATION"
        );

    }


    const building =
        textValue(
            data?.building,
            "ABC Apartments"
        );


    const floor =
        textValue(
            data?.floor,
            "3"
        );


    const zone =
        textValue(
            data?.zone,
            "Room 302"
        );


    if (fireAlert) {

        deviceMarker.setPopupContent(
            `
                <strong style="color:#b91c1c">
                    🔥 FIRE LOCATION
                </strong>

                <br><br>

                <b>
                    ${escapeHtml(building)}
                </b>

                <br>

                Floor ${escapeHtml(floor)}

                <br>

                ${escapeHtml(zone)}

                <br><br>

                🚓 Police Station notified

                <br>

                🚒 Fire Station notified
            `
        );

    } else {

        deviceMarker.setPopupContent(
            `
                <strong>
                    📍 YOUR LOCATION
                </strong>

                <br><br>

                <b>
                    ${escapeHtml(building)}
                </b>

                <br>

                Floor ${escapeHtml(floor)}

                <br>

                ${escapeHtml(zone)}
            `
        );

    }


    if (fireAlert) {

        showFireResponseRoutes();

    } else {

        hideFireResponseRoutes();

    }

}


/* =========================================================
   UPDATE LOCATION
   ========================================================= */

function updateLocation(
    data
) {

    const building =
        textValue(
            data?.building,
            "ABC Apartments"
        );


    const floor =
        textValue(
            data?.floor,
            "3"
        );


    const zone =
        textValue(
            data?.zone,
            "Room 302"
        );


    if (
        elements.location
    ) {

        elements.location.textContent =
            `${building} • Floor ${floor} • ${zone}`;

    }

}


/* =========================================================
   UPDATE DEVICE INFO
   ========================================================= */

function updateDeviceInfo(
    data
) {

    if (
        elements.deviceId
    ) {

        elements.deviceId.textContent =
            textValue(
                data?.deviceId,
                DEVICE_ID
            );

    }


    if (
        elements.building
    ) {

        elements.building.textContent =
            textValue(
                data?.building,
                "ABC Apartments"
            );

    }


    if (
        elements.floor
    ) {

        elements.floor.textContent =
            textValue(
                data?.floor,
                "3"
            );

    }


    if (
        elements.zone
    ) {

        elements.zone.textContent =
            textValue(
                data?.zone,
                "Room 302"
            );

    }

}


/* =========================================================
   SENSOR DATA
   ========================================================= */

function readSensorData(
    data
) {

    const gasData =
        data?.sensors?.gas ||
        {};


    const heatData =
        data?.sensors?.heat ||
        {};


    const gasRaw =
        numberValue(
            gasData.raw,
            0
        );


    const gasThreshold =
        numberValue(
            gasData.threshold,
            GAS_THRESHOLD
        );


    const heatResistance =
        numberValue(
            heatData.resistance,
            0
        );


    const heatThreshold =
        numberValue(
            heatData.fireThreshold,
            DEFAULT_FIRE_THRESHOLD
        );


    /*
       HEAT FIRST
    */

    const heatDetected =
        isTrue(
            heatData.alert
        ) ||
        (
            heatResistance > 0 &&
            heatResistance <= heatThreshold
        );


    /*
       MQ2 SECOND
    */

    const smokeDetected =
        isTrue(
            gasData.alert
        ) ||
        gasRaw >= gasThreshold;


    /*
       Smoke is only valid after heat.
    */

    const validSmoke =
        heatDetected &&
        smokeDetected;


    /*
       Firebase confirmation.
    */

    const confirmation =
        data?.fireConfirmation ||
        {};


    const confirmationCount =
        numberValue(
            confirmation.count,
            0
        );


    const requiredCount =
        numberValue(
            confirmation.required,
            3
        );


    /*
       Final FIRE state comes from ESP32.
    */

    const fireAlert =
        isTrue(
            data?.fireAlert
        ) ||
        data?.status === "FIRE";


    return {

        gasRaw,

        gasThreshold,

        heatResistance,

        heatThreshold,

        heatDetected,

        smokeDetected,

        validSmoke,

        confirmationCount,

        requiredCount,

        fireAlert

    };

}


/* =========================================================
   UPDATE HEAT
   ========================================================= */

function updateHeatSensor(
    heatResistance,
    heatDetected
) {

    if (
        elements.flame
    ) {

        if (
            heatResistance > 0
        ) {

            elements.flame.textContent =
                heatResistance.toFixed(2);

        } else {

            elements.flame.textContent =
                "—";

        }

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


    if (
        elements.heatState
    ) {

        elements.heatState.textContent =
            heatDetected
                ? "HEAT DETECTED"
                : "NORMAL";

    }

}


/* =========================================================
   UPDATE GAS
   ========================================================= */

function updateGasSensor(
    gasRaw,
    heatDetected,
    validSmoke
) {

    if (
        elements.gas
    ) {

        elements.gas.textContent =
            String(
                Math.round(
                    gasRaw
                )
            );

    }


    if (
        elements.gasCard
    ) {

        elements.gasCard.classList.toggle(
            "alert",
            validSmoke
        );


        elements.gasCard.classList.toggle(
            "safe",
            !validSmoke
        );

    }


    if (
        !elements.gasState
    ) {

        return;

    }


    if (
        !heatDetected
    ) {

        elements.gasState.textContent =
            "WAITING FOR HEAT";

        return;

    }


    if (
        validSmoke
    ) {

        elements.gasState.textContent =
            "SMOKE / GAS DETECTED";

        return;

    }


    elements.gasState.textContent =
        "NORMAL";

}


/* =========================================================
   MAIN STATUS
   ========================================================= */

function updateMainStatus(
    fireAlert,
    heatDetected,
    validSmoke
) {

    if (
        !elements.mainStatus
    ) {

        return;

    }


    elements.mainStatus.classList.remove(
        "safe",
        "heat",
        "fire"
    );


    if (
        elements.statusDot
    ) {

        elements.statusDot.classList.remove(
            "safe",
            "heat",
            "fire"
        );

    }


    /* FIRE */

    if (
        fireAlert
    ) {

        elements.mainStatus.classList.add(
            "fire"
        );


        elements.statusDot?.classList.add(
            "fire"
        );


        elements.statusValue.textContent =
            "FIRE";


        elements.statusText.textContent =
            "FIRE ALERT";


        elements.statusDescription.textContent =
            "Heat and smoke confirmed. Emergency response route active.";


        elements.alarm.textContent =
            "🔥 ALARM ACTIVE";


        elements.alarm.classList.add(
            "active"
        );


        return;

    }


    /* HEAT */

    if (
        heatDetected
    ) {

        elements.mainStatus.classList.add(
            "heat"
        );


        elements.statusDot?.classList.add(
            "heat"
        );


        elements.statusValue.textContent =
            "HEAT";


        elements.statusText.textContent =
            validSmoke
                ? "CHECKING FIRE CONDITIONS"
                : "HEAT DETECTED";


        elements.statusDescription.textContent =
            validSmoke
                ? "Smoke/gas detected. Waiting for fire confirmation."
                : "Heat detected. Checking smoke/gas sensor.";


        elements.alarm.textContent =
            "STANDBY";


        elements.alarm.classList.remove(
            "active"
        );


        return;

    }


    /* SAFE */

    elements.mainStatus.classList.add(
        "safe"
    );


    elements.statusDot?.classList.add(
        "safe"
    );


    elements.statusValue.textContent =
        "SAFE";


    elements.statusText.textContent =
        "System Monitoring";


    elements.statusDescription.textContent =
        "No fire detected. System is monitoring.";


    elements.alarm.textContent =
        "OFF";


    elements.alarm.classList.remove(
        "active"
    );

}


/* =========================================================
   DETECTION SEQUENCE
   ========================================================= */

function updateSequence(
    heatDetected,
    validSmoke,
    fireAlert,
    confirmationCount,
    requiredCount
) {

    const steps = [

        elements.stepHeat,

        elements.stepSmoke,

        elements.stepFire

    ];


    steps.forEach(
        step => {

            if (step) {

                step.classList.remove(
                    "active",
                    "complete",
                    "fire-step"
                );

            }

        }
    );


    /* STEP 1 */

    if (
        elements.stepHeatStatus
    ) {

        elements.stepHeatStatus.textContent =
            heatDetected
                ? "Heat threshold reached"
                : "Heat is normal";

    }


    if (
        elements.stepHeat &&
        heatDetected
    ) {

        elements.stepHeat.classList.add(
            "complete"
        );

    }


    /* STEP 2 */

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
            validSmoke
        ) {

            elements.stepSmokeStatus.textContent =
                "Smoke/gas detected";

        }

        else {

            elements.stepSmokeStatus.textContent =
                "Smoke/gas normal";

        }

    }


    if (
        elements.stepSmoke
    ) {

        if (
            validSmoke
        ) {

            elements.stepSmoke.classList.add(
                "complete"
            );

        }

        else if (
            heatDetected
        ) {

            elements.stepSmoke.classList.add(
                "active"
            );

        }

    }


    /* STEP 3 */

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
            validSmoke
        ) {

            elements.stepFireStatus.textContent =
                `Confirming ${confirmationCount}/${requiredCount}`;

        }

        else {

            elements.stepFireStatus.textContent =
                "Waiting for both conditions";

        }

    }


    if (
        elements.stepFire
    ) {

        if (
            fireAlert
        ) {

            elements.stepFire.classList.add(
                "fire-step"
            );

        }

        else if (
            heatDetected &&
            validSmoke
        ) {

            elements.stepFire.classList.add(
                "active"
            );

        }

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


    popup.innerHTML =
        `
            <div class="fire-popup-overlay">

                <div class="fire-popup-box">

                    <div class="fire-popup-icon">
                        🔥
                    </div>


                    <div class="fire-popup-title">
                        FIRE ALERT
                    </div>


                    <div class="fire-popup-message">
                        Fire has been confirmed at the monitored location.
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


                    <div class="fire-popup-dispatch">

                        <div>
                            🚓 Message sent to Police Station
                        </div>

                        <div>
                            🚒 Message sent to Fire Station
                        </div>

                    </div>


                    <button
                        id="acknowledgeFire"
                        type="button"
                    >
                        Close Alert
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
            () => {

                firePopupAcknowledged =
                    true;

                hideFirePopup();

            }
        );

    }

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
        textValue(
            data?.building,
            "ABC Apartments"
        );


    const floor =
        textValue(
            data?.floor,
            "3"
        );


    const zone =
        textValue(
            data?.zone,
            "Room 302"
        );


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

}


/* =========================================================
   SAVE FIRE INCIDENT
   ========================================================= */

async function saveFireIncident(
    data
) {

    try {

        const logsRef =
            ref(
                db,
                "fireLogs"
            );


        const newLog =
            push(
                logsRef
            );


        const fireLog = {

            deviceId:
                textValue(
                    data?.deviceId,
                    DEVICE_ID
                ),

            building:
                textValue(
                    data?.building,
                    "ABC Apartments"
                ),

            floor:
                textValue(
                    data?.floor,
                    "3"
                ),

            zone:
                textValue(
                    data?.zone,
                    "Room 302"
                ),

            latitude:
                currentLat,

            longitude:
                currentLng,

            timestamp:
                Date.now(),

            policeMessage:
                "Message sent to Police Station",

            fireStationMessage:
                "Message sent to Fire Station"

        };


        await set(
            newLog,
            fireLog
        );


        console.log(
            "🔥 Fire incident saved",
            fireLog
        );

    }

    catch (error) {

        console.error(
            "Could not save fire incident:",
            error
        );

    }

}


/* =========================================================
   RENDER FIRE LOG
   ========================================================= */

function renderFireLog(
    log
) {

    const building =
        escapeHtml(
            textValue(
                log?.building,
                "ABC Apartments"
            )
        );


    const floor =
        escapeHtml(
            textValue(
                log?.floor,
                "3"
            )
        );


    const zone =
        escapeHtml(
            textValue(
                log?.zone,
                "Room 302"
            )
        );


    const latitude =
        numberValue(
            log?.latitude,
            DEFAULT_LAT
        ).toFixed(6);


    const longitude =
        numberValue(
            log?.longitude,
            DEFAULT_LNG
        ).toFixed(6);


    const time =
        formatDateTime(
            log?.timestamp
        );


    return `

        <div class="fire-log-card">


            <div class="fire-log-header">

                <div class="fire-log-title">

                    <div class="fire-log-icon">
                        🔥
                    </div>

                    <span>
                        FIRE INCIDENT
                    </span>

                </div>


                <div class="fire-log-time">
                    ${escapeHtml(time)}
                </div>

            </div>



            <div class="fire-log-location">

                <div class="fire-log-location-icon">
                    📍
                </div>


                <div class="fire-log-location-content">

                    <div class="fire-log-location-label">
                        Fire Location
                    </div>


                    <div class="fire-log-location-value">
                        ${building}
                    </div>


                    <div class="fire-log-location-detail">
                        Floor ${floor} • ${zone}
                    </div>


                    <div class="fire-log-location-detail">
                        ${latitude},
                        ${longitude}
                    </div>

                </div>

            </div>



            <div class="fire-log-notifications">


                <div
                    class="fire-log-notification sent"
                >

                    <div class="fire-log-notification-icon">
                        🚓
                    </div>


                    <div class="fire-log-notification-text">
                        Message sent to Police Station
                    </div>

                </div>



                <div
                    class="fire-log-notification sent"
                >

                    <div class="fire-log-notification-icon">
                        🚒
                    </div>


                    <div class="fire-log-notification-text">
                        Message sent to Fire Station
                    </div>

                </div>


            </div>

        </div>

    `;

}


/* =========================================================
   LOAD RECENT 3 FIRE INCIDENTS
   ========================================================= */

function loadRecentFireLogs() {

    if (
        !elements.recentFireLogs
    ) {

        return;

    }


    const logsQuery =
        query(

            ref(
                db,
                "fireLogs"
            ),

            orderByChild(
                "timestamp"
            ),

            limitToLast(3)

        );


    onValue(

        logsQuery,

        snapshot => {

            const data =
                snapshot.val();


            if (
                !data
            ) {

                elements.recentFireLogs.innerHTML =
                    `
                        <div class="fire-log-empty">
                            No recent fire incidents
                        </div>
                    `;

                return;

            }


            const logs =
                Object.values(
                    data
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        numberValue(
                            b?.timestamp
                        )
                        -
                        numberValue(
                            a?.timestamp
                        )
                );


            elements.recentFireLogs.innerHTML =
                logs
                    .map(
                        renderFireLog
                    )
                    .join("");

        },

        error => {

            console.error(
                "Fire log read error:",
                error
            );

        }

    );

}


/* =========================================================
   PROCESS FIREBASE DATA
   ========================================================= */

function processFirebaseData(
    data
) {

    if (
        !data
    ) {

        return;

    }


    console.log(
        "Firebase data:",
        data
    );


    /* -------------------------------------------------------
       BASIC INFORMATION
       ------------------------------------------------------- */

    updateLocation(
        data
    );


    updateDeviceInfo(
        data
    );


    /* -------------------------------------------------------
       SENSOR DATA
       ------------------------------------------------------- */

    const sensors =
        readSensorData(
            data
        );


    updateHeatSensor(
        sensors.heatResistance,
        sensors.heatDetected
    );


    updateGasSensor(
        sensors.gasRaw,
        sensors.heatDetected,
        sensors.validSmoke
    );


    updateSequence(
        sensors.heatDetected,
        sensors.validSmoke,
        sensors.fireAlert,
        sensors.confirmationCount,
        sensors.requiredCount
    );


    updateMainStatus(
        sensors.fireAlert,
        sensors.heatDetected,
        sensors.validSmoke
    );


    /* -------------------------------------------------------
       MAP
       ------------------------------------------------------- */

    updateMap(
        data,
        sensors.fireAlert
    );


    /* -------------------------------------------------------
       LAST UPDATE
       ------------------------------------------------------- */

    if (
        elements.lastUpdate
    ) {

        elements.lastUpdate.textContent =
            currentTime();

    }


    /* =======================================================
       FIRE INCIDENT
       
       ONLY save when FIRE changes:
       
       false → true
       
       This prevents duplicate logs.
       ======================================================= */

    if (
        sensors.fireAlert &&
        !previousFireState
    ) {

        firePopupAcknowledged =
            false;


        saveFireIncident(
            data
        );

    }


    /* =======================================================
       FIRE POPUP
       ======================================================= */

    if (
        sensors.fireAlert
    ) {

        if (
            !firePopupAcknowledged
        ) {

            showFirePopup(
                data
            );

        }

    }

    else {

        hideFirePopup();

        firePopupAcknowledged =
            false;

    }


    previousFireState =
        sensors.fireAlert;

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

    snapshot => {

        const data =
            snapshot.val();


        if (
            !data
        ) {

            console.warn(
                "No Smart Fire Guardian data found at:",
                DATA_PATH
            );

            return;

        }


        lastFirebaseUpdateTime =
            Date.now();


        processFirebaseData(
            data
        );

    },

    error => {

        console.error(
            "Firebase device error:",
            error
        );


        if (
            elements.fbDot
        ) {

            elements.fbDot.className =
                "status-indicator offline";

        }


        if (
            elements.fbStatus
        ) {

            elements.fbStatus.textContent =
                "Firebase Error";

        }

    }

);


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

    snapshot => {

        const connected =
            snapshot.val() === true;


        if (
            connected
        ) {

            if (
                elements.fbDot
            ) {

                elements.fbDot.className =
                    "status-indicator online";

            }


            if (
                elements.fbStatus
            ) {

                elements.fbStatus.textContent =
                    "Firebase Connected";

            }

        }

        else {

            if (
                elements.fbDot
            ) {

                elements.fbDot.className =
                    "status-indicator offline";

            }


            if (
                elements.fbStatus
            ) {

                elements.fbStatus.textContent =
                    "Firebase Offline";

            }

        }

    }

);


/* =========================================================
   DEVICE ONLINE CHECK
   ========================================================= */

function updateDeviceOnlineStatus() {

    if (
        !elements.deviceTopDot ||
        !elements.deviceTopStatus
    ) {

        return;

    }


    if (
        lastFirebaseUpdateTime === 0
    ) {

        elements.deviceTopDot.className =
            "status-indicator";


        elements.deviceTopStatus.textContent =
            "Waiting...";


        if (
            elements.deviceConn
        ) {

            elements.deviceConn.textContent =
                "Waiting...";

        }


        return;

    }


    const age =
        (
            Date.now() -
            lastFirebaseUpdateTime
        ) / 1000;


    if (
        age <=
        OFFLINE_THRESHOLD_SECONDS
    ) {

        elements.deviceTopDot.className =
            "status-indicator online";


        elements.deviceTopStatus.textContent =
            "Device Online";


        if (
            elements.deviceConn
        ) {

            elements.deviceConn.textContent =
                "Online";

        }

    }

    else {

        elements.deviceTopDot.className =
            "status-indicator offline";


        elements.deviceTopStatus.textContent =
            "Device Offline";


        if (
            elements.deviceConn
        ) {

            elements.deviceConn.textContent =
                "Offline";

        }

    }

}


/* =========================================================
   START
   ========================================================= */

initMap();

createFirePopup();

loadRecentFireLogs();

updateDeviceOnlineStatus();


setInterval(
    updateDeviceOnlineStatus,
    5000
);


console.log(
    "🔥 Smart Fire Guardian started."
);
