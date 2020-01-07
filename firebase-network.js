import {toImagePromise, loadRaw} from './image-background.js';

const BUCKET = 'share-v1';

export async function loadProject(projectId) {
  const db = firebase.firestore();
  const doc = await db.collection("projects").doc(projectId).get();
  return doc.data();
}

// Project structure: {name: 'xxx', id: 'xxx', pages: [{id: 'xxx'}, ...]}
export async function saveProject(project) {
  const db = firebase.firestore();
  await db.collection("projects").doc(project.id).set(project);
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
