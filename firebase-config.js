import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


const firebaseConfig = {

  apiKey: "AIzaSyCjFneNv4UqsfG8i46YXSeFuuEcLL3JE2A",

  authDomain:
    "smartfire-guardian.firebaseapp.com",

  databaseURL:
    "https://smartfire-guardian-default-rtdb.firebaseio.com",

  projectId:
    "smartfire-guardian",

  storageBucket:
    "smartfire-guardian.firebasestorage.app",

  messagingSenderId:
    "911423950287",

  appId:
    "1:911423950287:web:5416e1f0ce6ef2150216ba",

  measurementId:
    "G-KTGH9K5HCJ"

};


export const app =
  initializeApp(firebaseConfig);


export const db =
  getDatabase(app);
