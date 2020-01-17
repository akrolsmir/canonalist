import { toImagePromise, loadRaw } from './image-background.js';

const BUCKET = 'share-v1';

export async function loadProject(projectId) {
  const db = firebase.firestore();
  const doc = await db.collection("projects").doc(projectId).get();
  return doc.data();
}

// Project structure: {name: 'xxx', id: 'xxx', pages: [{id: 'xxx'}, ...]}
export async function saveProject(project, user) {
  const db = firebase.firestore();
  await db.collection("projects").doc(project.id).set(project);

  const oldProject = user.projects.find(p => p.id == project.id);
  if (oldProject) {
    // Update project name
    oldProject.name = project.name;
  } else {
    // New project for this user
    user.projects.push({ id: project.id, name: project.name });
  }
  // Denormalize project id & name to Users table
  await db.collection("users").doc(user.id).set(user);
}

export async function cloudSave(mainVue, pageId) {
  const pageRef = firebase.storage().ref().child(BUCKET).child(pageId);

  // Save the bubbles as a JSON string. TODO: Consider Firestore instead.
  pageRef.child('bubbles.txt').putString(JSON.stringify(mainVue.bubbles));

  // Save the edit layer as a single image.
  const editLayerImage = await toImagePromise(mainVue.$refs.editLayer);
  const editLayerBlob = await toBlob(editLayerImage);
  pageRef.child('edit-blob').put(editLayerBlob);

  // Save the raw (original) image.
  const rawBlob = await new Promise(resolve =>
    mainVue.$refs.canvas.toBlob(resolve, 'image/png'));
  pageRef.child('raw-blob').put(rawBlob);
}

export async function cloudLoad(mainVue, pageId) {
  const pageRef = firebase.storage().ref().child(BUCKET).child(pageId);

  // Load the raw layer.
  const rawUrl = await pageRef.child('raw-blob').getDownloadURL();
  await loadRaw(rawUrl, mainVue);

  // Then redraw the edit layer.
  const editUrl = await pageRef.child('edit-blob').getDownloadURL();
  const editImage = await new Promise(resolve => Konva.Image.fromURL(editUrl, resolve));
  mainVue.$refs.editLayer.getNode().getLayer().removeChildren();
  mainVue.$refs.editLayer.getNode().getLayer().add(editImage);
  mainVue.$refs.editLayer.getNode().getLayer().batchDraw();

  // Finally load the bubbles.
  const bubblesUrl = await pageRef.child('bubbles.txt').getDownloadURL();
  const bubblesText = await getText(bubblesUrl);
  mainVue.bubbles = JSON.parse(bubblesText);
}

async function toBlob(image) {
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = image.width;
  offscreenCanvas.height = image.height;
  offscreenCanvas.getContext('2d').drawImage(image, 0, 0);
  return new Promise(resolve => offscreenCanvas.toBlob(resolve, 'image/png'));
}

async function getText(url) {
  return new Promise((resolve, reject) => {
    const xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
        resolve(xmlHttp.responseText);
      }
    }
    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
  });
}

// User structure: {id: xxx, projects: [{name: xxx, id: xxx}... ]}
export async function getUser(userId) {
  const db = firebase.firestore();
  const doc = await db.collection("users").doc(userId).get();
  const user = doc.data();
  return user ? user : { id: userId, projects: [] };
}

// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyDpldUROUvHFZY5XR_zZVr6Nap-Y91Rngk",
  authDomain: "canonalist.firebaseapp.com",
  databaseURL: "https://canonalist.firebaseio.com",
  projectId: "canonalist",
  storageBucket: "canonalist.appspot.com",
  messagingSenderId: "819833086526",
  appId: "1:819833086526:web:887b11d479cc7f90f9676f",
  measurementId: "G-5Y582CPKY6"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
if (/localhost/.test(window.location.hostname)) {
  console.log('Disabling analytics for local development.')
} else {
  firebase.analytics();
}

// Show user info, if previously logged in.
firebase.auth().onAuthStateChanged(async function (user) {
  if (user) {
    vueApp.user = await getUser(user.uid);
    vueApp.user.name = user.displayName;
    vueApp.user.email = user.email;
  }
});


const ui = new firebaseui.auth.AuthUI(firebase.auth());
function showSignIn(selector, successCb) {
  ui.reset();
  ui.start(selector, {
    callbacks: {
      signInSuccessWithAuthResult: function (authResult, redirectUrl) {
        // User successfully signed in.
        if (successCb) {
          successCb();
        }
        // Return type determines whether we continue the redirect automatically
        // or whether we leave that to developer to handle.
        return false;
      },
    },
    signInOptions: [
      firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      firebase.auth.EmailAuthProvider.PROVIDER_ID,
    ],
    signInFlow: 'popup',
    credentialHelper: 'none'
    // Other config options...
  });
}

export function projectUrl(projectId) {
  const parsedUrl = new URL(window.location.href);
  return `${parsedUrl.origin}/?project=${projectId}`
}

/** Returns whether the user successfully logged in. */
export async function promptLogIn() {
  return new Promise((resolve, reject) => {
    const firebaseDiv = document.createElement("div");
    firebaseDiv.setAttribute('id', "firebase-div");
    swal({
      title: "Log in to save your work!",
      button: "Cancel",
      content: firebaseDiv,
      closeOnClickOutside: false,
    })
      .then((cancel) => { if (cancel) { resolve(false); } });
    showSignIn("#firebase-div", async () => {
      swal.close();
      // Load the user, in case we're immediately saving afterwards.
      const user = firebase.auth().currentUser;
      vueApp.user = await getUser(user.uid);
      vueApp.user.name = user.displayName;
      vueApp.user.email = user.email;
      resolve(true);
    });
  });
}