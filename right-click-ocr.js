let downEvent;
function mouseDown(e) {
  switch(e.which) {
    case 3: // Right mouse click
      downEvent = e;
  }
}

function mouseUp(e) {
  switch(e.which) {
    case 3: // Right mouse click
      var clipWidth = e.offsetX - downEvent.offsetX;
      var clipHeight = e.offsetY - downEvent.offsetY;
      // Resize the snippet canvas, then copy to it
      snippet.width = clipWidth;
      snippet.height = clipHeight
      snippetCtx.drawImage(img,
        // Source: x, y, width, hight
        downEvent.offsetX, downEvent.offsetY, clipWidth, clipHeight,
        // Destination: x, y, width, height
        0, 0, clipWidth, clipHeight);
      // Send the base64 image to Google OCR API
      var dataUrl = snippet.toDataURL("image/png");
      var base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
      googleOcr(base64);
  }
}

const ocrUrl = 'https://vision.googleapis.com/v1/images:annotate?key=***REMOVED***';
function ocrRequest(base64) {
  return `{
  "requests": [
    {
      "image": {
        "content": "${base64}"
      },
      "features": [
        {
          "type": "TEXT_DETECTION"
        }
      ]
    }
  ]
}
`;
}

const googleOcr = async (base64) => {
  const response = await fetch(ocrUrl, {
    method: 'POST',
    body: ocrRequest(base64),
    headers: { 'Content-Type': 'application/json' }
  });
  const json = await response.json();
  console.log(json);
  var text = json.responses[0].textAnnotations[0].description;
  lyricsTextField.value += text;
}

/** Prevent right click menu from appearing. */
function contextMenu(e) {
  e.preventDefault();
}
