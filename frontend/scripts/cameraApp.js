// ---------------------------------
// FIREBASE SETUP
// ---------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, get, child, push, onValue, update, set } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ---------------------------------
// GESTURE RECOGNITION SETUP
// ---------------------------------

import { GestureRecognizer, FaceDetector, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
const demosSection = document.getElementById("demos");
let gestureRecognizer;
let faceDetector;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;

// ---------------------------------
// BASIC SETUP
// ---------------------------------

var cameraId = '1720292443228-d9lo4wpy'; //hard coding for now.Old:generateUniqueID();

// -----------------------------------------
// STANDARD GESTURE RECOGNITION FUNCTIONS
// -----------------------------------------

const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "CPU"
        },
        runningMode: runningMode
    });
    demosSection.classList.remove("invisible");
};

createGestureRecognizer();

// ---------------------------------
// FACE DETECTION SETUP
// ---------------------------------

const initializeFaceDetector = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            delegate: "GPU"
        },
        runningMode: "VIDEO" // Set initial running mode to VIDEO
    });
    demosSection.classList.remove("invisible");
};

initializeFaceDetector();

// -----------------------------------------
// WEBCAM INPUT SETUP
// -----------------------------------------
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput = document.getElementById("gesture_output");

// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam() {
    if (!gestureRecognizer || !faceDetector) {
        alert("Please wait for models to load");
        return;
    }
    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    } else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }
    const constraints = { video: true };
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", async () => {
            predictWebcam();
        });
    });
}

let lastVideoTime = -1;
let results = undefined;
let faceResults = [];
let savedBoundingBox = null;

// -----------------------------------------
// PREDICT FACES
// -----------------------------------------

async function predictFaces(canvasCtx, video, nowInMs) {
    try {
        const faceDetections = await faceDetector.detectForVideo(video, nowInMs);
        faceResults = faceDetections.detections;
    } catch (error) {
        console.error("Error during face detection:", error);
    }

    canvasCtx.save();

    // Draw bounding boxes for detected faces
    if (faceResults && faceResults.length > 0) {
        for (const detection of faceResults) {
            const boundingBox = detection.boundingBox;

            // Store the bounding box directly in video coordinates
            const x = boundingBox.originX;
            const y = boundingBox.originY;
            const width = boundingBox.width;
            const height = boundingBox.height;

            // Draw the bounding box
            canvasCtx.strokeStyle = 'rgba(0, 255, 0, 1)'; // Set a more visible color
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeRect(
                x * canvasElement.width / video.videoWidth,
                y * canvasElement.height / video.videoHeight,
                width * canvasElement.width / video.videoWidth,
                height * canvasElement.height / video.videoHeight
            );

            // Save the bounding box in video coordinates
            savedBoundingBox = [x, y, width, height];

        }
    } else {
        console.log("No faces detected"); // Debug log for no faces detected
    }

    canvasCtx.restore();
}

// -----------------------------------------
// PREDICT WEBCAM
// -----------------------------------------

async function predictWebcam() {
    // Apply horizontal flip to canvas context to make webcam mirror image
    const webcamElement = document.getElementById("webcam");
    // Now let's start detecting the stream.
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await gestureRecognizer.setOptions({ runningMode: "VIDEO", numHands: 10 });
    }
    let nowInMs = Date.now();
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        results = await gestureRecognizer.recognizeForVideo(video, nowInMs);
    }
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);

    // Trace the hand landmarks and connectors
    if (results && results.landmarks) {
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 5
            });
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 2
            });
        }

        canvasCtx.lineWidth = 10;

        // Continuous gesture recognition loop
        for (var handi = 0; handi < results.landmarks.length; handi++) {
            handleGesture(results.gestures[handi][0].categoryName,
                results.landmarks[handi][9].x,
                results.landmarks[handi][9].y);
        }
    } else {
        console.log("No landmarks detected."); // Debug log for no landmarks
    }

    // Draw user zones
    drawUserZones();

    canvasCtx.restore();

    // Show name of first gesture
    if (results && results.gestures && results.gestures.length > 0) {
        gestureOutput.style.display = "block";
        gestureOutput.style.width = video.style.width;
        const categoryName = results.gestures[0][0].categoryName;
        const categoryScore = parseFloat(results.gestures[0][0].score * 100).toFixed(2);
        const handedness = results.handednesses[0][0].displayName;
        const isCorrectAnswer = (categoryName === "Victory");
        gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}\n Correct Answer: ${isCorrectAnswer}\n`;
    } else {
        gestureOutput.style.display = "none";
    }

    predictFaces(canvasCtx, video, nowInMs);

    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}

// ------------------------------------------
// RICK AND ELI GESTURE PLATFORM FUNCTIONS
// ------------------------------------------


// Identify the user associated with a recognized gesture, and take the appropriate
// action -- e.g. register a new user, report a gesture made by an existing user
async function handleGesture(gestureName, x, y) {
    const userId = findUserZoneContainingPoint(x, y);
    console.log("handleGesture userid " + userId);
    if (userId != null) {
        // gesture in known user zone, so store name of gesture in zone
        const updates = {};
        updates['userZones/' + userId + '/lastGesture'] = gestureName;
        update(ref(database), updates)
    }
    else if (!stopProcessingRegistrations && gestureName == "Closed_Fist") { //this is 'register me' gesture
        // closed fist gesture not in known user zone, so register new user / user zone
        // stopProcessingRegistrations makes sure user doesn't get registered a 2nd time while waiting for db write to complete
        stopProcessingRegistrations = true;
        const nextIdToRegister = (await get(child(ref(database), "/nextIdToRegister"))).val();
        const updates = {};
        if (nextIdToRegister != null) {
            // there is a user waiting to register, so create a new zone. Otherwise, do nothing
            var imageData = getUserImageData();
            await set(ref(database, 'nextIdToRegister'), null);
            updates['userZones/' + nextIdToRegister + '/camera'] = cameraId;
            updates['userZones/' + nextIdToRegister + '/x'] = x;
            updates['userZones/' + nextIdToRegister + '/y'] = y;
            updates['userZones/' + nextIdToRegister + '/lastGesture'] = gestureName;
            updates['userZones/' + nextIdToRegister + '/imageData'] = imageData;
            update(ref(database), updates);
        }
        stopProcessingRegistrations = false;
    }
    // otherwise gesture wasn't a reg gesture and didn't occur in a known zone, so do nothing
}
// Cache list of user zones locally for performance reasons. Update it whenever a change is made to the database
const userZonesRef = ref(database, 'userZones/');
var userZones;
var stopProcessingRegistrations = false;
onValue(userZonesRef, (snapshot) => {
    userZones = snapshot.val();
});

// Var to set size of the user zone in normalized coordinates
const normalizedZoneSize = 0.2;

// Find the user zone containing the point. Used when a gesture is detected
// and needs to be associated with a particular user
function findUserZoneContainingPoint(x, y) {
    if (userZones) {
        for (const userId in userZones) {
            const userZone = userZones[userId];
            if (userZone.camera == cameraId) {
                if (Math.abs(userZone.x - x) < (normalizedZoneSize / 2) && Math.abs(userZone.y - y) < (normalizedZoneSize / 2)) {
                    return userId;
                }
            }
        }
    }
    return null;
}

// Capture a screenshot from the video stream, cropped to the bounding box of the face
function getUserImageData() {
    const video = document.getElementById('webcam');
    const captureCanvas = document.createElement('canvas');
    const captureCtx = captureCanvas.getContext('2d');

    if (savedBoundingBox) {
        const [x, y, width, height] = savedBoundingBox;

        // Set the canvas size to the size of the bounding box
        captureCanvas.width = width;
        captureCanvas.height = height;

        // Draw the video frame, cropping to the bounding box area
        captureCtx.drawImage(
            video,
            x, y, width, height, // Source rectangle (part of the video to draw)
            0, 0, width, height  // Destination rectangle (part of the canvas to draw into)
        );
    } else {
        // If there's no bounding box, capture the whole frame
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    }

    const imageData = captureCanvas.toDataURL('image/png');

    // Display the captured image for verification
    const capturedImageElement = document.getElementById('capturedImage');
    capturedImageElement.src = imageData;
    capturedImageElement.style.display = 'block';
    capturedImageElement.style.width = `${captureCanvas.width}px`;
    capturedImageElement.style.height = `${captureCanvas.height}px`;

    return imageData;
}

// Draw and label all recognized user zones
function drawUserZones() {
    if (userZones) {
        let zoneNumber = 1;
        const videoZoneSizeX = normalizedZoneSize * video.videoWidth; // Convert normalized size to pixel size
        const videoZoneSizeY = normalizedZoneSize * video.videoHeight;

        for (const userId in userZones) {
            if (userZones[userId].camera == cameraId) {
                const userZone = userZones[userId];
                const videoZoneCenterX = userZone.x * video.videoWidth;
                const videoZoneCenterY = userZone.y * video.videoHeight;

                // Draw rectangle
                canvasCtx.strokeStyle = "blue";
                canvasCtx.lineWidth = 2;
                canvasCtx.strokeRect(videoZoneCenterX - videoZoneSizeX / 2, videoZoneCenterY - videoZoneSizeY / 2, videoZoneSizeX, videoZoneSizeY);

                // Draw label
                canvasCtx.fillStyle = "blue";
                canvasCtx.font = "20px Arial";
                canvasCtx.fillText(zoneNumber, videoZoneCenterX - videoZoneSizeX / 2, videoZoneCenterY - videoZoneSizeY / 2 - 10);
                zoneNumber++;
            }
        }
    }
}

// ------------------------------------------
// REGISTRATION
// ------------------------------------------

// Generate random UserID
function generateUniqueID() {
    const now = new Date();
    const timestamp = now.getTime().toString();
    const randomString = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${randomString}`;
}



// Set up periodic drawing of user zones
setInterval(drawUserZones, 1000); // Update every second
