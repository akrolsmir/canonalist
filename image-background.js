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
      // Original logo size: 521 x 90
      const logoWidth = 69;
      const logoHeight = 12;
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
    logoImage.src = 'assets/logo/vector/default-monochrome-black.svg'

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
    const [start, end] = getStartEnd(annotation.boundingPoly);
    ctx.fillStyle = 'rgba(240, 240, 40, 0.2)';
    ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
  }

  // Hierarchy of fullTextAnnotation is page > block > paragraph > word > symbol
  // TODO: Maybe split by paragraph insteaad of block?
  const blocks = json.responses[0].fullTextAnnotation.pages[0].blocks;
  for (const block of blocks) {
    const [start, end] = getStartEnd(block.boundingBox);
    ctx.fillStyle = 'rgba(40, 240, 240, 0.2)';
    ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);

    // const japanese = extractText(block);
    // const rect = { x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y };
    // scanlate(japanese, rect)
  }
  vueApp.blocks = blocks;
}

function scanlateAll(blocks) {
  for (const block of blocks) {
    const [start, end] = getStartEnd(block.boundingBox);
    const japanese = extractText(block);
    const rect = { x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y };
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

/** Copies the annotation box's text into the textarea. */
function processClick(event) {
  let lastText; // Since boxes may overlap, use the last one.
  for (const annotation of annotations) {
    const [start, end] = getStartEnd(annotation.boundingPoly);
    if (start.x <= event.offsetX && event.offsetX <= end.x &&
      start.y <= event.offsetY && event.offsetY <= end.y) {
      lastText = annotation.description;
    }
  }
}

/** Convert a OCR rectangle into a pair of points. */
function getStartEnd(boundingPoly) {
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

  return [{ x: minX, y: minY }, { x: maxX, y: maxY }];
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
