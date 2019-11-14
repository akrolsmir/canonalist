const canvas = document.getElementById('canvas');
const lyricsTextField = document.getElementById('lyrics');
const pageNumText = document.getElementById('pagenum');
const ctx = canvas.getContext('2d');
const img = new Image();

let annotations;
let pdf;
let pageNum = 46;

loadImage('assets/22.jpg');
// loadPdf('assets/104.pdf');

function loadImage(src) {
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);
  }
  img.src = src;
}

function loadPdf(src) {
  pdfjsLib.getDocument(src)
    .then(result => {
      pdf = result;
      renderPdfPage();
    });
}

function renderPdfPage() {
  pageNumText.value = `Page ${pageNum}`;
  pdf.getPage(pageNum)
    .then(page => {
      const scale = 1.3;
      const viewport = page.getViewport(scale);

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };
      return page.render(renderContext);
    });
}

function prevPage() {
  pageNum--;
  renderPdfPage();
}

function nextPage() {
  pageNum++;
  renderPdfPage();
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
  lyricsTextField.value += lastText;
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

/** Handle drag + dropped image or PDF.*/
var dropzone = document.getElementById('dropzone');

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
    if (file.name.endsWith('pdf')) {
      loadPdf(dataUrl);
    } else {
      loadImage(dataUrl);
    }
  }
}
