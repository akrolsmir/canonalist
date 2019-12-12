const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();

let annotations;

loadImage('assets/22.jpg');

function loadImage(src) {
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    vueApp.configKonva.width = img.width;
    vueApp.configKonva.height = img.height;

    // Draw a small watermark on the bottom right
    const logoImage = new Image();
    logoImage.onload = function () {
      // Original logo size: 140 x 32
      const logoWidth = 105;
      const logoHeight = 24;
      const image = new Konva.Image({
        x: img.width - logoWidth - 5,
        y: img.height - logoHeight - 5,
        image: logoImage,
        width: logoWidth,
        height: logoHeight
      });
      // TODO needs more work when a new image is dropped.
      vueApp.$refs.textLayer.getNode().getLayer().removeChildren();
      vueApp.$refs.textLayer.getNode().getLayer().add(image);
      vueApp.$refs.textLayer.getNode().getLayer().batchDraw();
    };
    logoImage.src = 'assets/logo/vector/watermark.png'

    ctx.drawImage(img, 0, 0);
  }
  img.src = src;
}

function analyze() {
  requestOcr(canvas).then(json => colorWords(json));
}

/** Draws boxes around each annotation. */
function colorWords(json) {
  annotations = json.responses[0].textAnnotations;
  // Remove the first (overarching) annotation.
  annotations.splice(0, 1);
  for (const annotation of annotations) {
    const rect = toRect(annotation.boundingPoly);
    const clearBlue = 'rgba(240, 240, 40, 0.2)';
    const blueRect = new Konva.Rect({ ...rect, fill: clearBlue });
    vueApp.$refs.editLayer.getNode().getLayer().add(blueRect);
    vueApp.$refs.editLayer.getNode().getLayer().batchDraw();
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

/** Handle drag + dropped image.*/
var dropzone = document.getElementById('scrollport');

dropzone.ondragover = function (e) {
  e.preventDefault();
}

dropzone.ondrop = function (e) {
  e.preventDefault();
  var files = e.dataTransfer.files;
  if (files) {
    replaceImage(files[0]);
  }
}

function replaceImage(file) {
  let reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = () => {
    const dataUrl = reader.result;
    loadImage(dataUrl);
  }
}
