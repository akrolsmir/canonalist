// Disable shortcuts in different HTML forms.
Vue.use(VueShortkey, { prevent: ['textarea', 'select'] })

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
      size: 20,
      color: 'White'
    },
    cursor: {
      x: 0,
      y: 0,
      // TODO: move mousedown into here.
    },
    shortcuts: {
      brush: ['b'],
      erase: ['e'],
      selectBubble: ['s'],
      escape: ['esc'],
      undo: ['ctrl', 'z'],
      redo: ['ctrl', 'shift', 'z'],
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
    },
    brushCursor() {
      return {
        visible: /PAINT_TOOL/.test(this.mode),
        x: this.cursor.x,
        y: this.cursor.y,
        radius: this.brush.size / 2,
        stroke: 'black',
        strokeWidth: 0.5, 
      }
    },
    currentTool() {
      if (/PAINT_TOOL/.test(this.mode)) {
        return 'PAINT';
      } else if (/SELECT_JP/.test(this.mode)) {
        return 'TRANSLATE';
      } else {
        return 'TEXT';
      }
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
          points: [event.offsetX, event.offsetY, event.offsetX, event.offsetY]
        });
        vueApp.$refs.editLayer.getNode().getLayer().add(this.lastLine);
        vueApp.$refs.editLayer.getNode().getLayer().batchDraw();
        this.$refs.history.record(
          new EditLayerDoable(this.lastLine, `Paint ${this.brush.color} ${this.brush.size}`));
      }
    },
    handleMouseMove(event) {
      if (this.mode == 'SELECT_JP_SECOND_CLICK') {
        // Draw konva box from mousedownX & Y to this location;
        // console.log(`Drawing ${event.offsetX}, ${event.offsetY} to ${this.mousedownX}, ${this.mousedownY}`);
        this.configRect.width = event.offsetX - this.mousedownX;
        this.configRect.height = event.offsetY - this.mousedownY;
      }
      else if (this.mode == 'PAINT_TOOL') {
        // Move the cursor;
        this.cursor.x = event.offsetX;
        this.cursor.y = event.offsetY;
      }
      else if (this.mode == 'PAINT_TOOL_DOWN') {
        // Move the cursor;
        this.cursor.x = event.offsetX;
        this.cursor.y = event.offsetY;

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
    handleShortcuts(event) {
      switch (event.srcKey) {
        case 'brush':
          this.mode = 'PAINT_TOOL';
          this.brush.color = 'White';
          break;
        case 'erase':
          this.mode = 'PAINT_TOOL';
          this.brush.color = 'Erase';
          break;
        case 'selectBubble': 
          this.selectBox();
          break;
        case 'escape':
          this.mode = '';
          // TODO: Want to unfocus selected bubble, but swallowed by form...
          break;
        case 'undo':
          this.$refs.history.undo();
          break;
        case 'redo':
          this.$refs.history.redo();
          break;
      }
    },
    handleDrop(event) {
      var files = event.dataTransfer.files;
      if (files) {
        replaceImage(files[0], this);
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
      analyze(this);
    },
    selectBox() {
      if (this.currentTool == 'TRANSLATE') {
        this.mode = '';
        this.configRect.width = 0;
      } else {
        // TODO set cursor to be cross
        firebase.analytics().logEvent('select_bubble_clicked');
        this.mode = 'SELECT_JP';
      }
    },
    paintTool() {
      if (this.currentTool == 'PAINT') {
        this.mode = ''
      } else {
        firebase.analytics().logEvent('paint_tool_clicked');
        this.mode = 'PAINT_TOOL';
      }
    },
    async saveImage() {
      firebase.analytics().logEvent('save_image_clicked');
      await exportImage(this);
    },
    async sharePage() {
      firebase.analytics().logEvent('share_page_clicked');

      const parsedUrl = new URL(window.location.href);
      let pageId = parsedUrl.searchParams.get('share');
      // Generate a random id if the page does not already have one.
      pageId = pageId ? pageId : shortid();
      await cloudSave(this, pageId);
      swal(
        "Share this link!",
        `${parsedUrl.origin}/?share=${pageId}`,
        "success"
      );
    },
    showHelp() {
      firebase.analytics().logEvent('help_clicked');
      runIntro(firstRunOnly = false);
    },
  },
  mounted() {
    const parsedUrl = new URL(window.location.href);
    const pageId = parsedUrl.searchParams.get('share');
    if (pageId) {
      cloudLoad(this, pageId);
    } else {
      loadRaw('assets/22.jpg', this);
    }
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
