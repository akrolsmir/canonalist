var canvas = document.getElementById('canvas');
var snippet = document.getElementById('snippet');
var lyricsTextField = document.getElementById('lyrics');
var ctx = canvas.getContext('2d');
var snippetCtx = snippet.getContext('2d');
var imageData;
var data;
var annotations;
const img = new Image();

function loadImage() {
  img.onload = function() {
    // Resize canvas to fit the image
    canvas.width = this.width;
    canvas.height = this.height;

    ctx.drawImage(img, 0, 0);
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    data = imageData.data;

    fetch("assets/chinese-censor-document.json")
      .then(response => response.json())
      .then(json => {
        annotations = json.responses[0].textAnnotations;
        colorWords(json)
      });
  }
  img.src = 'assets/chinese-censor.png';
}

function processClick(event) {
  var lastText;
  for (const annotation of annotations) {
    const [start, end] = getStartEnd(annotation.boundingPoly);
    if (start.x <= event.offsetX && event.offsetX <= end.x &&
      start.y <= event.offsetY && event.offsetY <= end.y) {
      console.log(annotation);
      lastText = annotation.description;
    }
  }
  lyricsTextField.value += lastText;
}

function drawSquare(ctx, x, y, size) {
  ctx.fillRect(x - (size / 2), y- (size / 2), size, size);
}

function processKeypress(e) {
  if (e.ctrlKey && e.key == "z") {
    alert ("ctrl + z");
  }
  if (e.ctrlKey && e.key == "s") {
    e.preventDefault();
    canvas.toBlob(function(blob) {
      saveAs(blob, "output.png");
    });

  }
  if (e.ctrlKey && e.key == "Z") {
    alert ("ctrl + shift + z");
    e.preventDefault();
  }
}

function colorWords(json) {
  const annotations = json.responses[0].textAnnotations;
  console.log(annotations[0]);
  for (const annotation of annotations) {
    const [start, end] = getStartEnd(annotation.boundingPoly);
    ctx.strokeStyle = 'blue';
    ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    console.log(start.x, start.y, end.x - start.x, end.y - start.y);
  }
}

/** Convert a OCR rectangle into a pair of points. */
function getStartEnd(boundingPoly) {
  function helper(axis, func) {
    var result = boundingPoly.vertices[0][axis];
    for (var i = 1; i < 4; i++) {
      var current = boundingPoly.vertices[i][axis];
      result = func(result, current);
    }
    return result;
  }

  var minX = helper('x', Math.min);
  var minY = helper('y', Math.min);
  var maxX = helper('x', Math.max);
  var maxY = helper('y', Math.max);

  return [{x: minX, y: minY}, {x: maxX, y: maxY}];
}

loadImage();
document.onkeydown = processKeypress;
