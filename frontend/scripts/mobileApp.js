// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, set , onValue } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB85_1QrHsSIKKv7KYhS_blgqlAU50OuHM",
    authDomain: "gesture-based-events.firebaseapp.com",
    databaseURL: "https://gesture-based-events-default-rtdb.firebaseio.com",
    projectId: "gesture-based-events",
    storageBucket: "gesture-based-events.appspot.com",
    messagingSenderId: "242183453186",
    appId: "1:242183453186:web:0d7ef073f75e326d2ec51b",
    measurementId: "G-4MC31KCSPZ"
};

//Initialize Audio
const audio = new Audio('click.mp3');
audio.preload = 'auto';
audio.load();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

//Generate random UserID
function generateUniqueID() {
  const now = new Date();
  const timestamp = now.getTime().toString();
  const randomString = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomString}`;
}

//Initialize userId
const userId = generateUniqueID();


// Function to fetch data from Firebase Realtime Database
function register() {
    const dbRef = ref(database, 'nextIdToRegister');
    set(dbRef, userId)
        .then(() => {
            alert('Registered successfully!');
        })
        .catch((error) => {
            alert('Failed to register: ' + error);
        });
}

// Make the register function available in the global scope
window.register = register;

// Reference to the specific user node
const userRef = ref(database, `userZones/${userId}`);

// Function to listen for changes in lastGesture
var userHasBeenRegisteredInDB = false;
function listenForLastGesture() {
  onValue(userRef, (snapshot) => {
    const userData = snapshot.val();
    if (userData) {
        if(!userHasBeenRegisteredInDB){
            userHasBeenRegisteredInDB = true;
            audio.play()
            console.log("User has been registered in DB");
            console.log(userData);
        }
        const lastGesture = userData.lastGesture;
        // Update the UI with the user ID and last gesture
        document.getElementById('userIdDisplay').textContent = userId;
        document.getElementById('lastGestureDisplay').textContent = lastGesture;

        //speak recent gesture
        if(lastGesture != "None"){
            const utterance = new SpeechSynthesisUtterance(`${lastGesture}`);
            window.speechSynthesis.cancel(); // Cancel any pending speech
            window.speechSynthesis.speak(utterance);
        }
    }
  });
}

// Call the function to start listening
listenForLastGesture();