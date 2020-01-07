let img = new Image();

const BUCKET='share-v1';

async function loadProject(projectId) {
  const db = firebase.firestore();
  const doc = await db.collection("projects").doc(projectId).get();
  return doc.data();
}

// Project structure: {name: 'xxx', id: 'xxx', pages: [{id: 'xxx'}, ...]}
async function saveProject(project) {
  const db = firebase.firestore();
  await db.collection("projects").doc(project.id).set(project);
}

async function cloudSave(mainVue, pageId) {
  const pageRef = firebase.storage().ref().child(BUCKET).child(pageId);

  // Save the bubbles as a JSON string. TODO: Consider Firestore instead.
  pageRef.child('bubbles.txt').putString(JSON.stringify(mainVue.bubbles));

  // Save the edit layer as a single image.
  const editLayerImage = await toImagePromise(mainVue.$refs.editLayer);
  const editLayerBlob = await toBlob(editLayerImage);
  pageRef.child('edit-blob').put(editLayerBlob);

  // Save the raw (original) image.
  const rawBlob = await toBlob(img);
  pageRef.child('raw-blob').put(rawBlob);
}

async function cloudLoad(mainVue, pageId) {
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

async function exportImage(mainVue) {
  // Copy the main canvas into an offscreen one to save.
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = mainVue.$refs.canvas.width;
  offscreenCanvas.height = mainVue.$refs.canvas.height;
  offscreenCanvas.getContext('2d').drawImage(mainVue.$refs.canvas, 0, 0);

  // Then draw on each layer.
  const editLayerImage = await toImagePromise(mainVue.$refs.editLayer);
  offscreenCanvas.getContext('2d').drawImage(editLayerImage, 0, 0);
  const textLayerImage = await toImagePromise(mainVue.$refs.textLayer);
  offscreenCanvas.getContext('2d').drawImage(textLayerImage, 0, 0);

  // Download the offscreen canvas by creating a hidden link.
  offscreenCanvas.toBlob(blob => {
    const finalUrl = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.download = 'output.png';
    link.href = finalUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    delete link;
  });
}

/** Converts a Konva layer into a Promise that returns the layer's image. */
function toImagePromise(layer) {
  return new Promise((resolve, reject) => {
    layer.getNode().toImage({
      callback: (layerImage) => {
        resolve(layerImage);
      }
    });
  });
}

/** Converts an image src into a Promise that returns the loaded image. */
function onloadPromise(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  })
}

async function loadRaw(src, mainVue) {
  img = await onloadPromise(src);
  mainVue.$refs.canvas.width = img.width;
  mainVue.$refs.canvas.height = img.height;
  mainVue.configKonva.width = img.width;
  mainVue.configKonva.height = img.height;
  const ctx = mainVue.$refs.canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Draw a small watermark on the bottom right
  const logoImage = await onloadPromise('assets/logo/vector/watermark.png');
  // Original logo size: 140 x 32
  const logoWidth = 105;
  const logoHeight = 24;
  const watermark = new Konva.Image({
    x: img.width - logoWidth - 5,
    y: img.height - logoHeight - 5,
    image: logoImage,
    width: logoWidth,
    height: logoHeight
  });
  // TODO needs more work when a new image is dropped.
  mainVue.$refs.textLayer.getNode().getLayer().removeChildren();
  mainVue.$refs.textLayer.getNode().getLayer().add(watermark);
  mainVue.$refs.textLayer.getNode().getLayer().batchDraw();

  mainVue.$refs.editLayer.getNode().getLayer().removeChildren();
  mainVue.$refs.editLayer.getNode().getLayer().batchDraw();

  mainVue.bubbles = [];
}

function analyze(mainVue) {
  requestOcr(mainVue.$refs.canvas).then(json => colorWords(json, mainVue));
}

/** Draws boxes around each annotation. */
function colorWords(json, mainVue) {
  const annotations = json.responses[0].textAnnotations;
  // Remove the first (overarching) annotation.
  annotations.splice(0, 1);
  for (const annotation of annotations) {
    const rect = toRect(annotation.boundingPoly);
    const clearBlue = 'rgba(240, 240, 40, 0.2)';
    const blueRect = new Konva.Rect({ ...rect, fill: clearBlue });
    mainVue.$refs.editLayer.getNode().getLayer().add(blueRect);
    mainVue.$refs.editLayer.getNode().getLayer().batchDraw();
  }

  // Hierarchy of fullTextAnnotation is page > block > paragraph > word > symbol
  // TODO: Maybe split by paragraph insteaad of block?
  const blocks = json.responses[0].fullTextAnnotation.pages[0].blocks;
  for (const block of blocks) {
    const rect = toRect(block.boundingBox);
    const clearYellow = 'rgba(40, 240, 240, 0.2)';
    const yellowRect = new Konva.Rect({ ...rect, fill: clearYellow });
    vueApp.$refs.editLayer.getNode().getLayer().add(yellowRect);
    vueApp.$refs.editLayer.getNode().getLayer().batchDraw();
  }
  vueApp.blocks = blocks;
}

function scanlateAll(blocks) {
  for (const block of blocks) {
    const rect = toRect(block.boundingBox);
    const japanese = extractText(block);
    scanlate(japanese, rect)
  }
}

function extractText(block) {
  let result = "";
  for (const paragraph of block.paragraphs) {
    for (const word of paragraph.words) {
      for (const symbol of word.symbols) {
        result += symbol.text;
      }
    }
  }
  return result;
}

/** Convert a OCR rectangle (4 points) into a rect (x, y, width, height). */
function toRect(boundingPoly) {
  function helper(axis, func) {
    let result = boundingPoly.vertices[0][axis];
    for (let i = 1; i < 4; i++) {
      const current = boundingPoly.vertices[i][axis];
      result = func(result, current);
    }
    return result;
  }

  const minX = helper('x', Math.min);
  const minY = helper('y', Math.min);
  const maxX = helper('x', Math.max);
  const maxY = helper('y', Math.max);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function replaceImage(file, mainVue) {
  let reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = () => {
    const dataUrl = reader.result;
    loadRaw(dataUrl, mainVue);
  }
}
