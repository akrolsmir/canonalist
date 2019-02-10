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
      requestOcr(snippet)
        .then(json => {
          if (json.responses.length > 0) {
            let text = json.responses[0].textAnnotations[0].description;
            text = text.replace(/\s/g, ''); // Strip out all whitespace
            const rect = {
              x: downEvent.offsetX,
              y: downEvent.offsetY,
              width: clipWidth,
              height: clipHeight
            }
            lyricsTextField.value += text;
            scanlate(text, rect);
          }
        });
  }
}

async function scanlate(text, rect) {
  const json = await translate(text);
  const english = json.data.translations[0].translatedText;
  console.log(`Original: ${text}, Translated: ${english}`);

  ctx.fillStyle = 'white';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  
  drawTextLayer(english, rect);
}

function drawTextLayer(text, rect) {
  const textArea = document.createElement('textarea');
  textArea.style =
    `left:${rect.x}px;
    top:${rect.y}px;
    width:${rect.width}px;
    height:${rect.height}px;`;
  textArea.innerText = text;
  textArea.draggable = true;
  let dragStartX, dragStartY;
  textArea.ondragstart = (event) => {
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    textArea.style.opacity = '0.1';
  }
  textArea.ondragend = (event) => {
    event.preventDefault();
    textArea.style.opacity = '1.0';

    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    const leftPixels = parseFloat(textArea.style.left, 10);
    const topPixels = parseFloat(textArea.style.top, 10);
    textArea.style.left = `${leftPixels + deltaX}px`
    textArea.style.top = `${topPixels + deltaY}px`
  }
  textLayers.appendChild(textArea);
}

const OCR_URL = 'https://vision.googleapis.com/v1/images:annotate?key=AIzaSyA7ZlydINXmk61P2lz3sDi0ACSIwJEloUY';
function buildRequest(base64) {
  return `{
  "requests": [
    {
      "image": {
        "content": "${base64}"
      },
      "features": [
        {
          "type": "DOCUMENT_TEXT_DETECTION"
        },
      ],
    }
  ]
}
`;
}

async function requestOcr(canvas) {
  // Send the base64 image to Google OCR API
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
  const response = await fetch(OCR_URL, {
    method: 'POST',
    body: buildRequest(base64),
    headers: { 'Content-Type': 'application/json' }
  });
  return await response.json();
}

const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2?key=AIzaSyA7ZlydINXmk61P2lz3sDi0ACSIwJEloUY';
function buildTranslateRequest(text) {
  return `{
  "q": "${text}",
  "target": "en",
  "format": "text",
}
`;
}

async function translate(text) {
  const response = await fetch(TRANSLATE_URL, {
    method: 'POST',
    body: buildTranslateRequest(text),
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
}

/** Prevent right click menu from appearing. */
function contextMenu(e) {
  e.preventDefault();
}
