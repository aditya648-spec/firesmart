import {
  ref,
  onValue,
  push,
  set,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { db } from "./firebase-config.js";


// ======================================================
// SMART FIRE GUARDIAN - FAMILY MANAGEMENT
// ======================================================

const DEVICE_ID = "SF-003";

const FAMILY_PATH =
  `familyMembers/${DEVICE_ID}`;


// ======================================================
// GLOBAL VARIABLES
// ======================================================

let selectedLatitude = null;
let selectedLongitude = null;

let editingMemberId = null;

let familyMap = null;
let selectedHomeMarker = null;


// ======================================================
// GET ELEMENT
// ======================================================

function getElement(id) {

  return document.getElementById(id);

}


// ======================================================
// FIND ELEMENT USING MULTIPLE POSSIBLE IDS
// ======================================================

function findElement(ids) {

  for (const id of ids) {

    const element =
      getElement(id);

    if (element) {
      return element;
    }

  }

  return null;

}


// ======================================================
// ELEMENTS
// ======================================================

const form =
  findElement([
    "familyForm",
    "familyMemberForm"
  ]);


const nameInput =
  findElement([
    "name",
    "memberName"
  ]);


const relationInput =
  findElement([
    "relation",
    "relationship"
  ]);


const phoneInput =
  findElement([
    "phone",
    "phoneNumber"
  ]);


const familyList =
  findElement([
    "familyList",
    "registeredMembers"
  ]);


const locationStatus =
  findElement([
    "locationStatus",
    "homeLocationStatus"
  ]);


const selectLocationButton =
  findElement([
    "selectLocation",
    "selectHomeLocation"
  ]);


const saveButton =
  findElement([
    "saveFamilyMember",
    "saveMember"
  ]);


const cancelButton =
  findElement([
    "cancelEdit"
  ]);


// ======================================================
// LEAFLET LOADER
// ======================================================

function loadLeaflet() {

  return new Promise(
    (resolve, reject) => {

      if (
        typeof L !== "undefined"
      ) {

        resolve();

        return;

      }


      const existingScript =
        document.querySelector(
          'script[src*="leaflet"]'
        );


      if (existingScript) {

        existingScript.addEventListener(
          "load",
          resolve
        );

        existingScript.addEventListener(
          "error",
          reject
        );

        return;

      }


      const css =
        document.createElement(
          "link"
        );


      css.rel = "stylesheet";

      css.href =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";


      document.head.appendChild(
        css
      );


      const script =
        document.createElement(
          "script"
        );


      script.src =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";


      script.onload =
        resolve;


      script.onerror =
        reject;


      document.body.appendChild(
        script
      );

    }
  );

}


// ======================================================
// CREATE LOCATION PICKER
// ======================================================

async function openLocationPicker() {

  try {

    await loadLeaflet();

  } catch (error) {

    alert(
      "Could not load the map."
    );

    return;

  }


  // --------------------------------------------------
  // MODAL
  // --------------------------------------------------

  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "homeLocationModal";


  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;


  // --------------------------------------------------
  // BOX
  // --------------------------------------------------

  const box =
    document.createElement(
      "div"
    );


  box.style.cssText = `
    width: min(900px, 95vw);
    background: white;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  `;


  // --------------------------------------------------
  // HEADER
  // --------------------------------------------------

  const header =
    document.createElement(
      "div"
    );


  header.style.cssText = `
    padding: 15px 18px;
    font-weight: 700;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  `;


  header.innerHTML = `
    <span>🏠 Select Home Location</span>

    <button
      id="closeLocationPicker"
      type="button"
      style="
        border: none;
        background: transparent;
        font-size: 22px;
        cursor: pointer;
      "
    >
      ×
    </button>
  `;


  // --------------------------------------------------
  // INSTRUCTIONS
  // --------------------------------------------------

  const instructions =
    document.createElement(
      "div"
    );


  instructions.style.cssText = `
    padding: 0 18px 12px;
    font-size: 14px;
  `;


  instructions.innerHTML = `
    Click on the map where the family member's home is located.
  `;


  // --------------------------------------------------
  // MAP
  // --------------------------------------------------

  const mapContainer =
    document.createElement(
      "div"
    );


  mapContainer.id =
    "familyLocationMap";


  mapContainer.style.cssText = `
    width: 100%;
    height: 420px;
  `;


  // --------------------------------------------------
  // BUTTONS
  // --------------------------------------------------

  const footer =
    document.createElement(
      "div"
    );


  footer.style.cssText = `
    padding: 15px 18px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  `;


  footer.innerHTML = `

    <button
      id="useCurrentLocation"
      type="button"
    >
      📍 Use My Current Location
    </button>

    <button
      id="confirmHomeLocation"
      type="button"
    >
      ✅ Confirm Location
    </button>

    <button
      id="cancelHomeLocation"
      type="button"
    >
      Cancel
    </button>

  `;


  box.appendChild(
    header
  );

  box.appendChild(
    instructions
  );

  box.appendChild(
    mapContainer
  );

  box.appendChild(
    footer
  );


  modal.appendChild(
    box
  );


  document.body.appendChild(
    modal
  );


  // --------------------------------------------------
  // DEFAULT MAP LOCATION
  // --------------------------------------------------

  const defaultLat =
    selectedLatitude ||
    15.855881303189477;


  const defaultLng =
    selectedLongitude ||
    74.57802140000477;


  familyMap =
    L.map(
      "familyLocationMap"
    ).setView(
      [
        defaultLat,
        defaultLng
      ],
      14
    );


  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        "&copy; OpenStreetMap contributors"
    }
  ).addTo(
    familyMap
  );


  // --------------------------------------------------
  // EXISTING LOCATION
  // --------------------------------------------------

  if (
    selectedLatitude !== null &&
    selectedLongitude !== null
  ) {

    selectedHomeMarker =
      L.marker([
        selectedLatitude,
        selectedLongitude
      ])
      .addTo(
        familyMap
      )
      .bindPopup(
        "🏠 Selected Home"
      )
      .openPopup();

  }


  // --------------------------------------------------
  // CLICK MAP
  // --------------------------------------------------

  familyMap.on(
    "click",
    event => {

      selectedLatitude =
        event.latlng.lat;


      selectedLongitude =
        event.latlng.lng;


      if (selectedHomeMarker) {

        familyMap.removeLayer(
          selectedHomeMarker
        );

      }


      selectedHomeMarker =
        L.marker([
          selectedLatitude,
          selectedLongitude
        ])
        .addTo(
          familyMap
        )
        .bindPopup(
          "🏠 Selected Home"
        )
        .openPopup();


      instructions.textContent =
        `Selected: ${selectedLatitude.toFixed(6)}, ${selectedLongitude.toFixed(6)}`;

    }
  );


  // --------------------------------------------------
  // CURRENT LOCATION
  // --------------------------------------------------

  const currentButton =
    document.getElementById(
      "useCurrentLocation"
    );


  currentButton.addEventListener(
    "click",
    () => {

      if (
        !navigator.geolocation
      ) {

        alert(
          "Location is not supported by this browser."
        );

        return;

      }


      currentButton.textContent =
        "📍 Getting location...";


      navigator.geolocation.getCurrentPosition(

        position => {

          selectedLatitude =
            position.coords.latitude;


          selectedLongitude =
            position.coords.longitude;


          familyMap.setView(
            [
              selectedLatitude,
              selectedLongitude
            ],
            17
          );


          if (
            selectedHomeMarker
          ) {

            familyMap.removeLayer(
              selectedHomeMarker
            );

          }


          selectedHomeMarker =
            L.marker([
              selectedLatitude,
              selectedLongitude
            ])
            .addTo(
              familyMap
            )
            .bindPopup(
              "🏠 Your Current Location"
            )
            .openPopup();


          instructions.textContent =
            `Current location selected: ${selectedLatitude.toFixed(6)}, ${selectedLongitude.toFixed(6)}`;


          currentButton.textContent =
            "📍 Use My Current Location";

        },

        error => {

          console.error(
            "Geolocation error:",
            error
          );


          currentButton.textContent =
            "📍 Use My Current Location";


          if (
            error.code === 1
          ) {

            alert(
              "Location permission was denied. Please allow location access for this website."
            );

          } else {

            alert(
              "Could not get your location."
            );

          }

        },

        {
          enableHighAccuracy: true,

          timeout: 15000,

          maximumAge: 0

        }

      );

    }
  );


  // --------------------------------------------------
  // CONFIRM
  // --------------------------------------------------

  document
    .getElementById(
      "confirmHomeLocation"
    )
    .addEventListener(
      "click",
      () => {

        if (
          selectedLatitude === null ||
          selectedLongitude === null
        ) {

          alert(
            "Please click on the map to select the home location."
          );

          return;

        }


        if (locationStatus) {

          locationStatus.textContent =
            `📍 Location selected: ${selectedLatitude.toFixed(6)}, ${selectedLongitude.toFixed(6)}`;

        }


        modal.remove();


        familyMap =
          null;


        selectedHomeMarker =
          null;

      }
    );


  // --------------------------------------------------
  // CANCEL
  // --------------------------------------------------

  document
    .getElementById(
      "cancelHomeLocation"
    )
    .addEventListener(
      "click",
      () => {

        modal.remove();

        familyMap =
          null;

        selectedHomeMarker =
          null;

      }
    );


  // --------------------------------------------------
  // CLOSE X
  // --------------------------------------------------

  document
    .getElementById(
      "closeLocationPicker"
    )
    .addEventListener(
      "click",
      () => {

        modal.remove();

        familyMap =
          null;

        selectedHomeMarker =
          null;

      }
    );


  // Fix Leaflet size

  setTimeout(
    () => {

      if (familyMap) {

        familyMap.invalidateSize();

      }

    },
    100
  );

}


// ======================================================
// OPEN LOCATION BUTTON
// ======================================================

if (
  selectLocationButton
) {

  selectLocationButton.addEventListener(
    "click",
    openLocationPicker
  );

}


// ======================================================
// LOAD FAMILY MEMBERS
// ======================================================

function loadFamilyMembers() {

  if (!familyList) {
    return;
  }


  familyList.innerHTML =
    "Loading family members...";


  const familyRef =
    ref(
      db,
      FAMILY_PATH
    );


  onValue(

    familyRef,

    snapshot => {

      const members =
        snapshot.val();


      familyList.innerHTML =
        "";


      if (!members) {

        familyList.innerHTML =
          `
            <p>
              No family members registered yet.
            </p>
          `;

        return;

      }


      Object.entries(
        members
      ).forEach(
        ([memberId, member]) => {

          addMemberCard(
            memberId,
            member
          );

        }
      );

    },

    error => {

      console.error(
        "Firebase family error:",
        error
      );


      familyList.innerHTML =
        `
          <p>
            ❌ Could not load family members.
          </p>
        `;

    }

  );

}


// ======================================================
// ADD MEMBER CARD
// ======================================================

function addMemberCard(
  memberId,
  member
) {

  const card =
    document.createElement(
      "div"
    );


  card.className =
    "family-member-card";


  card.style.cssText = `
    padding: 15px;
    margin-bottom: 12px;
    border-radius: 10px;
    border: 1px solid #ddd;
  `;


  const primaryText =
    member.isPrimary
      ? "⭐ PRIMARY CONTACT"
      : "";


  const locationText =
    Number.isFinite(
      Number(member.latitude)
    ) &&
    Number.isFinite(
      Number(member.longitude)
    )
      ? `📍 ${Number(member.latitude).toFixed(6)}, ${Number(member.longitude).toFixed(6)}`
      : "📍 No home location";


  card.innerHTML = `

    <div
      style="
        display:flex;
        justify-content:space-between;
        gap:10px;
        flex-wrap:wrap;
      "
    >

      <div>

        <strong>
          ${escapeHTML(member.name || "Unnamed")}
        </strong>

        ${
          primaryText
            ? `<div>${primaryText}</div>`
            : ""
        }

      </div>

    </div>


    <div>
      Relation:
      ${escapeHTML(member.relation || "—")}
    </div>


    <div>
      Phone:
      ${escapeHTML(member.phone || "—")}
    </div>


    <div>
      ${locationText}
    </div>


    <div
      style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:12px;
      "
    >

      <button
        type="button"
        class="edit-family-member"
      >
        ✏️ Edit
      </button>

      <button
        type="button"
        class="delete-family-member"
      >
        🗑️ Delete
      </button>

      ${
        member.isPrimary
          ? ""
          : `
            <button
              type="button"
              class="primary-family-member"
            >
              ⭐ Make Primary
            </button>
          `
      }

    </div>

  `;


  // --------------------------------------------------
  // EDIT
  // --------------------------------------------------

  card
    .querySelector(
      ".edit-family-member"
    )
    .addEventListener(
      "click",
      () => {

        startEdit(
          memberId,
          member
        );

      }
    );


  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  card
    .querySelector(
      ".delete-family-member"
    )
    .addEventListener(
      "click",
      () => {

        deleteMember(
          memberId
        );

      }
    );


  // --------------------------------------------------
  // PRIMARY
  // --------------------------------------------------

  const primaryButton =
    card.querySelector(
      ".primary-family-member"
    );


  if (primaryButton) {

    primaryButton.addEventListener(
      "click",
      () => {

        makePrimary(
          memberId
        );

      }
    );

  }


  familyList.appendChild(
    card
  );

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
// SAVE MEMBER
// ======================================================

async function saveFamilyMember(
  event
) {

  if (event) {

    event.preventDefault();

  }


  const name =
    nameInput?.value.trim() || "";


  const relation =
    relationInput?.value.trim() || "";


  const phone =
    phoneInput?.value.trim() || "";


  if (!name) {

    alert(
      "Please enter the family member's name."
    );

    return;

  }


  if (!phone) {

    alert(
      "Please enter the phone number."
    );

    return;

  }


  if (
    selectedLatitude === null ||
    selectedLongitude === null
  ) {

    alert(
      "Please select the family member's home location."
    );

    return;

  }


  const memberData = {

    name,

    relation,

    phone,

    latitude:
      Number(selectedLatitude),

    longitude:
      Number(selectedLongitude),

    isPrimary: false,

    updatedAt:
      Date.now()

  };


  try {

    if (editingMemberId) {

      const memberRef =
        ref(
          db,
          `${FAMILY_PATH}/${editingMemberId}`
        );


      await update(
        memberRef,
        memberData
      );


      alert(
        "Family member updated successfully."
      );

    } else {

      const familyRef =
        ref(
          db,
          FAMILY_PATH
        );


      const newMember =
        push(
          familyRef
        );


      memberData.createdAt =
        Date.now();


      await set(
        newMember,
        memberData
      );


      alert(
        "Family member added successfully."
      );

    }


    resetForm();

  } catch (error) {

    console.error(
      "Save family member error:",
      error
    );


    alert(
      "Could not save family member.\n\n" +
      error.message
    );

  }

}


// ======================================================
// START EDIT
// ======================================================

function startEdit(
  memberId,
  member
) {

  editingMemberId =
    memberId;


  if (nameInput) {

    nameInput.value =
      member.name || "";

  }


  if (relationInput) {

    relationInput.value =
      member.relation || "";

  }


  if (phoneInput) {

    phoneInput.value =
      member.phone || "";

  }


  selectedLatitude =
    Number(member.latitude);


  selectedLongitude =
    Number(member.longitude);


  if (locationStatus) {

    locationStatus.textContent =
      `📍 Location selected: ${selectedLatitude.toFixed(6)}, ${selectedLongitude.toFixed(6)}`;

  }


  if (saveButton) {

    saveButton.textContent =
      "Update Family Member";

  }


  if (cancelButton) {

    cancelButton.style.display =
      "inline-block";

  }


  window.scrollTo(
    {
      top: 0,
      behavior: "smooth"
    }
  );

}


// ======================================================
// RESET FORM
// ======================================================

function resetForm() {

  editingMemberId =
    null;


  if (form) {

    form.reset();

  }


  if (nameInput) {

    nameInput.value =
      "";

  }


  if (relationInput) {

    relationInput.value =
      "";

  }


  if (phoneInput) {

    phoneInput.value =
      "";

  }


  selectedLatitude =
    null;


  selectedLongitude =
    null;


  if (locationStatus) {

    locationStatus.textContent =
      "No home location selected";

  }


  if (saveButton) {

    saveButton.textContent =
      "Save Family Member";

  }


  if (cancelButton) {

    cancelButton.style.display =
      "none";

  }

}


// ======================================================
// DELETE MEMBER
// ======================================================

async function deleteMember(
  memberId
) {

  const confirmed =
    confirm(
      "Delete this family member?"
    );


  if (!confirmed) {
    return;
  }


  try {

    const memberRef =
      ref(
        db,
        `${FAMILY_PATH}/${memberId}`
      );


    await remove(
      memberRef
    );


    alert(
      "Family member deleted."
    );

  } catch (error) {

    console.error(
      "Delete error:",
      error
    );


    alert(
      "Could not delete family member.\n\n" +
      error.message
    );

  }

}


// ======================================================
// MAKE PRIMARY
// ======================================================

async function makePrimary(
  selectedMemberId
) {

  try {

    const familyRef =
      ref(
        db,
        FAMILY_PATH
      );


    const snapshot =
      await new Promise(
        (resolve, reject) => {

          onValue(
            familyRef,
            resolve,
            reject,
            {
              onlyOnce: true
            }
          );

        }
      );


    const members =
      snapshot.val() || {};


    const updates = {};


    Object.keys(
      members
    ).forEach(
      memberId => {

        updates[
          `${memberId}/isPrimary`
        ] =
          memberId === selectedMemberId;

      }
    );


    await update(
      familyRef,
      updates
    );


    alert(
      "Primary family contact updated."
    );

  } catch (error) {

    console.error(
      "Primary contact error:",
      error
    );


    alert(
      "Could not change primary contact.\n\n" +
      error.message
    );

  }

}


// ======================================================
// FORM EVENTS
// ======================================================

if (form) {

  form.addEventListener(
    "submit",
    saveFamilyMember
  );

}


if (
  saveButton &&
  !form
) {

  saveButton.addEventListener(
    "click",
    saveFamilyMember
  );

}


if (cancelButton) {

  cancelButton.addEventListener(
    "click",
    resetForm
  );


  cancelButton.style.display =
    "none";

}


// ======================================================
// START
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadFamilyMembers();

  }
);
