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

  ctx.strokeStyle = 'rgba(40, 40, 240, 0.5'; // Transparent light blue
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = 'white';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  drawMultilineText(ctx, english, {
    rect: rect,
    font: "Patrick Hand",
    minFontSize: 20
  });
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

const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2?key=***REMOVED***';
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
