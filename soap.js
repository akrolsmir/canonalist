const canvas = document.getElementById('canvas');
const snippet = document.getElementById('snippet');
const lyricsTextField = document.getElementById('lyrics');
const ctx = canvas.getContext('2d');
const snippetCtx = snippet.getContext('2d');
const img = new Image();

let annotations;

function loadImage() {
  img.onload = () => {
    // Resize canvas to fit the image
    canvas.width = this.width;
    canvas.height = this.height;

    ctx.drawImage(img, 0, 0);

    fetch("assets/chinese-censor-document.json")
      .then(response => response.json())
      .then(json => colorWords(json));
  }
  img.src = 'assets/chinese-censor.png';
}

/** Draws blue boxes around each annotation. */
function colorWords(json) {
  annotations = json.responses[0].textAnnotations;
  for (const annotation of annotations) {
    const [start, end] = getStartEnd(annotation.boundingPoly);
    ctx.strokeStyle = 'blue';
    ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  }
}

/** Copies the blue box's text into the textarea. */
function processClick(event) {
  let lastText;
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

loadImage();
