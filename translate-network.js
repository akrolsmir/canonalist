const OCR_URL = 'https://vision.googleapis.com/v1/images:annotate?key=AIzaSyBhkh5Yeu0aus70jWscv3KRFM6GJ3czp_c';
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

export async function requestOcr(canvas) {
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

const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2?key=AIzaSyBhkh5Yeu0aus70jWscv3KRFM6GJ3czp_c';
function buildTranslateRequest(text) {
  return `{
  "q": "${text}",
  "target": "en",
  "format": "text",
}`;
}

export async function translate(text) {
  const response = await fetch(TRANSLATE_URL, {
    method: 'POST',
    body: buildTranslateRequest(text),
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
}