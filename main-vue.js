// Normalize a rect to have positive width and height.
function absoluteRect(rect) {
  return {
    x: rect.x + Math.min(0, rect.width),
    y: rect.y + Math.min(0, rect.height),
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  }
}

const snippet = document.getElementById('snippet');
const snippetCtx = snippet.getContext('2d');

function extractAndScanlateJapaneseRect(rect) {
  // Resize the snippet canvas, then copy to it
  snippet.width = rect.width;
  snippet.height = rect.height;
  snippetCtx.drawImage(img,
    // Source: x, y, width, hight
    rect.x, rect.y, rect.width, rect.height,
    // Destination: x, y, width, height
    0, 0, rect.width, rect.height);
  requestOcr(snippet)
    .then(json => {
      if (json.responses.length > 0) {
        let text = json.responses[0].textAnnotations[0].description;
        text = text.replace(/\s/g, ''); // Strip out all whitespace
        scanlate(text, rect);
      }
    });
}

const vueApp = new Vue({
  el: '#editor',
  data: {
    bubbles: [],
    blocks: '',
    configKonva: {
      width: 200,
      height: 200
    },
    configRect: {
      x: 0, y: 0, width: 0, height: 0, fill: 'blue', opacity: 0.2
    },
    mousedownX: 0,
    mousedownY: 0,
    mode: '',
    selectedId: -1,
    bubbleFocused: false,
    showTextLayer: true,
    showEditLayer: true,
    brush: {
      size: 10,
      color: 'Black'
    }
  },
  computed: {
    selectedBubble() {
      for (const bubble of this.bubbles) {
        if (bubble.id == this.selectedId) {
          return bubble;
        }
      }
      return { japanese: "JP", english: "EN" };
    },
    configTexts() {
      return this.bubbles.map((bubble) => ({
        text: bubble.english,
        x: bubble.rect.x,
        y: bubble.rect.y,
        width: bubble.rect.width,
        height: bubble.rect.height,

        draggable: true,
        fontFamily: bubble.fontFamily,
        fontSize: bubble.fontSize,
        lineHeight: bubble.lineHeight,
        align: 'center',

        // Hide Konva bubble if this is currently selected.
        fill: this.bubbleFocused && (this.selectedId == bubble.id) ?
          'transparent' : 'black',
      }));
    }
  },
  methods: {
    handleMouseDown(event) {
      if (this.mode == 'SELECT_JP') {
        this.mousedownX = event.offsetX;
        this.mousedownY = event.offsetY;
        // console.log(event);
        this.configRect.x = this.mousedownX;
        this.configRect.y = this.mousedownY;
        this.mode = 'SELECT_JP_SECOND_CLICK';
      }
      else if (this.mode == 'SELECT_JP_SECOND_CLICK') {
        this.mode = '';
        // A little magical, but configRect already has all the right attributes.
        extractAndScanlateJapaneseRect(absoluteRect(this.configRect));
        // Then hide the konva rectangle
        this.configRect.width = 0;
        this.configRect.height = 0;
      }
      else if (this.mode == 'PAINT_TOOL') {
        this.mode = 'PAINT_TOOL_DOWN';
        this.lastLine = new Konva.Line({
          lineJoin: 'round',
          lineCap: 'round',
          stroke: this.brush.color,
          strokeWidth: this.brush.size,
          globalCompositeOperation:
            this.brush.color == 'Erase' ? 'destination-out' : 'source-over',
          points: [event.offsetX, event.offsetY]
        });
        vueApp.$refs.editLayer.getNode().getLayer().add(this.lastLine);
      }
    },
    handleMouseMove(event) {
      if (this.mode == 'SELECT_JP_SECOND_CLICK') {
        // Draw konva box from mousedownX & Y to this location;
        // console.log(`Drawing ${event.offsetX}, ${event.offsetY} to ${this.mousedownX}, ${this.mousedownY}`);
        this.configRect.width = event.offsetX - this.mousedownX;
        this.configRect.height = event.offsetY - this.mousedownY;
      }
      else if (this.mode == 'PAINT_TOOL_DOWN') {
        const newPoints = this.lastLine.points().concat([event.offsetX, event.offsetY]);
        this.lastLine.points(newPoints);
        vueApp.$refs.editLayer.getNode().getLayer().batchDraw();
      }
    },
    handleMouseUp(event) {
      if (this.mode == 'PAINT_TOOL_DOWN') {
        this.mode = 'PAINT_TOOL';
      }
    },
    updateSelectedId(selectedId) {
      this.bubbleFocused = true;
      this.selectedId = selectedId;
    },
    unfocusSelectedId() {
      this.bubbleFocused = false;
    },
    makeBubbles() {
      firebase.analytics().logEvent('translate_en_clicked');
      scanlateAll(this.blocks);
    },
    detectJapanese() {
      firebase.analytics().logEvent('detect_jp_clicked');
      analyze();
    },
    newImage() {
      alert('Drag and drop a raw manga page to get started!');
    },
    selectBox() {
      firebase.analytics().logEvent('select_bubble_clicked');
      this.mode = 'SELECT_JP';
      // TODO set cursor to be cross
    },
    paintTool() {
      firebase.analytics().logEvent('paint_tool_clicked');
      this.mode = 'PAINT_TOOL';
    },
    saveImage() {
      firebase.analytics().logEvent('save_image_clicked');
      // Copy the main canvas into an offscreen one to save.
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      offscreenCanvas.getContext('2d').drawImage(canvas, 0, 0);

      // Render the Konva text layer onto the offscreen canvas.
      this.$refs.textLayer.getNode().toImage({
        callback: (textLayer) => {
          offscreenCanvas.getContext('2d').drawImage(textLayer, 0, 0);

          const finalUrl = offscreenCanvas.toDataURL();
          // function from https://stackoverflow.com/a/15832662/512042
          function downloadURI(uri, name) {
            var link = document.createElement('a');
            link.download = name;
            link.href = uri;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            delete link;
          }
          downloadURI(finalUrl, 'output.png');
        }
      });
    },
    showHelp() {
      firebase.analytics().logEvent('help_clicked');
      runIntro(firstRunOnly = false);
    },
  },
  mounted() {
    runIntro(firstRunOnly = true);
  }
});

async function scanlate(text, rect) {
  const json = await translate(text);
  const english = json.data.translations[0].translatedText;
  console.log(`Original: ${text}, Translated: ${english}`);
  const bubble = new Bubble(vueApp.bubbles.length, rect, text, english);
  vueApp.bubbles.push(bubble);

  // Draw a white box, to hide the Japanese text.
  const whiteRect = new Konva.Rect({ ...rect, fill: 'white' });
  vueApp.$refs.editLayer.getNode().getLayer().add(whiteRect);
  vueApp.$refs.editLayer.getNode().getLayer().batchDraw();
}

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

const TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2?key=AIzaSyBhkh5Yeu0aus70jWscv3KRFM6GJ3czp_c';
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
