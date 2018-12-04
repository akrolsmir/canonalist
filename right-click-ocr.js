let downEvent;
function mouseDown(e) {
  switch (e.which) {
    case 3: // Right mouse click
      downEvent = e;
  }
}

function mouseUp(e) {
  switch (e.which) {
    case 3: // Right mouse click
      const clipWidth = e.offsetX - downEvent.offsetX;
      const clipHeight = e.offsetY - downEvent.offsetY;
      // Resize the snippet canvas, then copy to it
      snippet.width = clipWidth;
      snippet.height = clipHeight
      snippetCtx.drawImage(img,
        // Source: x, y, width, hight
        downEvent.offsetX, downEvent.offsetY, clipWidth, clipHeight,
        // Destination: x, y, width, height
        0, 0, clipWidth, clipHeight);
      // Send the base64 image to Google OCR API
      const dataUrl = snippet.toDataURL("image/png");
      const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
      requestOcr(base64);
  }
}

const OCR_URL = 'https://vision.googleapis.com/v1/images:annotate?key=***REMOVED***';
function buildRequest(base64) {
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

async function requestOcr(base64) {
  const response = await fetch(OCR_URL, {
    method: 'POST',
    body: buildRequest(base64),
    headers: { 'Content-Type': 'application/json' }
  });
  const json = await response.json();
  if (json.responses.length > 0) {
    const text = json.responses[0].textAnnotations[0].description;
    lyricsTextField.value += text;
  }
}

/** Prevent right click menu from appearing. */
function contextMenu(e) {
  e.preventDefault();
}
