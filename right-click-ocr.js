class Bubble {
  constructor(id, rect, japanese, english) {
    this.id = id;
    this.rect = rect;
    this.japanese = japanese;
    this.english = english;
  }
}

let downEvent;
function mouseDown(e) {
  switch (e.which) {
    case 3: // Right mouse click
      downEvent = e;
  }
}

const snippet = document.getElementById('snippet');
const snippetCtx = snippet.getContext('2d');

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

Vue.component('bubble-component', {
  props: {
    id: Number,
    rect: Object,
    japanese: String,
    english: String,
  },
  data() {
    return {
      dragStartX: 0,
      dragStartY: 0,
      opacity: '1.0',
      showControls: false,
    }
  },
  methods: {
    dragstart(event) {
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
      this.opacity = '0.1';
    },
    dragend(event) {
      event.preventDefault();
      this.opacity = '1.0';

      const deltaX = event.clientX - this.dragStartX;
      const deltaY = event.clientY - this.dragStartY;
      this.rect.x += deltaX;
      this.rect.y += deltaY;
    },
  },
  computed: {
    styleObject() {
      const style =  {
        'z-index': '100',
        'left': this.rect.x + 'px',
        'top': this.rect.y + 'px',
        'width': this.rect.width + 'px',
        'height': this.rect.height + 'px',
        'opacity': this.opacity,
      };
      if (!this.showControls) {
        style['border'] = 'none';
        // Hide the bottom-right resize handle.
        style['resize'] = 'none';
        // Shift by 1px to adjust for the missing border.
        style['left'] = (this.rect.x + 1) + 'px';
        style['top'] = (this.rect.y + 1) + 'px';
      }
      return style;
    }
  },
  template: `
  <textarea :style="styleObject"
    v-on:dragstart="dragstart"
    v-on:dragend="dragend"
    v-on:focus="showControls = true"
    v-on:blur="showControls = false"
    draggable="true">{{english}}</textarea>
  `
});

const vueApp = new Vue({
  el: '.editor',
  data: {
    bubbles: [],
  }
});

async function scanlate(text, rect) {
  const json = await translate(text);
  const english = json.data.translations[0].translatedText;
  console.log(`Original: ${text}, Translated: ${english}`);
  const bubble = new Bubble(vueApp.bubbles.length, rect, text, english);
  vueApp.bubbles.push(bubble);

  // Clean japanese from the text bubble.
  ctx.fillStyle = 'white';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
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
