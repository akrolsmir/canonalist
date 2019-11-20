class Bubble {
  constructor(id, rect, japanese, english) {
    this.id = id;
    this.rect = rect;
    this.japanese = japanese;
    this.english = english;
  }
}

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
            lyricsTextField.value += text;
            scanlate(text, rect);
          }
        });
}

Vue.component('vue-draggable-resizable', VueDraggableResizable)
Vue.component('bubble-component', {
  props: {
    value: Object,
  },
  data() {
    return {
      opacity: '1.0',
      showControls: false,
    }
  },
  computed: {
    styleObject() {
      const style =  {
        'z-index': '100',
        'left': this.value.rect.x + 'px',
        'top': this.value.rect.y + 'px',
        'width': this.value.rect.width + 'px',
        'height': this.value.rect.height + 'px',
      };
      if (!this.showControls) {
        style['border'] = 'none';
        // Hide the bottom-right resize handle.
        style['resize'] = 'none';
        // TODO: Consider shifting by 1px for the border.
      }
      return style;
    }
  },
  methods: {
    // Adapted from https://simonkollross.de/posts/vuejs-using-v-model-with-objects-for-custom-components
    update(key, value) {
      this.$emit('input', { ...this.value, [key]: value })
    },
    // TODO also handle onResize. Might require resizable binding...
    onDrag(x, y) {
      const rectCopy = {...this.value.rect, x, y};
      this.update('rect', rectCopy);
    }
  },
  template: `
  <vue-draggable-resizable :resizable="false" :drag-handle="'.drag-handle'"
    @dragging="onDrag"
    :y="value.rect.y" :x="value.rect.x" :w="value.rect.width" :h="value.rect.height">
    <div class="drag-handle" v-if="showControls">
      <span class="typcn typcn-arrow-move"></span>
    </div>  
    <textarea class="bubbletext"
      spellcheck="false"
      :style="styleObject"
      @focus="showControls = true; $emit('bubble-focus', value.id)"
      @blur="showControls = false"
      :value="value.english"
      @input="update('english', $event.target.value)"
    ></textarea>
  </vue-draggable-resizable>
  `
});

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
    showKonvaText: false,
    selectedId: -1,
  },
  computed: {
    selectedBubble() {
      for (const bubble of this.bubbles) {
        if (bubble.id == this.selectedId) {
          return bubble;
        }
      }
      return {japanese: "JP", english: "EN"};
    },
    configTexts() {
      return this.bubbles.map((bubble) => ({
        text: bubble.english,
        x: bubble.rect.x,
        y: bubble.rect.y,
        width: bubble.rect.width,

        draggable: true,
        fontFamily: "Wild Words Roman",
        fontSize: 16,
        lineHeight: 1.2,
        align: 'center',
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
    },
    handleMouseMove(event) {
      if (this.mode == 'SELECT_JP_SECOND_CLICK') {
        // Draw konva box from mousedownX & Y to this location;
        // console.log(`Drawing ${event.offsetX}, ${event.offsetY} to ${this.mousedownX}, ${this.mousedownY}`);
        this.configRect.width = event.offsetX - this.mousedownX;
        this.configRect.height = event.offsetY - this.mousedownY;
      }
    },
    updateSelectedId(selectedId) {
      this.selectedId = selectedId;
    },
    makeBubbles() {
      scanlateAll(this.blocks);
    },
    detectJapanese() {
      analyze();
    },
    newImage() {
      alert('Drag and drop a raw manga page to get started!');
    },
    selectBox() {
      this.mode = 'SELECT_JP';
      // TODO set cursor to be cross
      // alert('Right-click, hold, and drag over japanese text.');
    },
    saveImage() {
      // Copy the main canvas into an offscreen one to save.
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      offscreenCanvas.getContext('2d').drawImage(canvas, 0, 0);
      
      // Render the Konva text layer, then wait for Vue to update DOM.
      this.showKonvaText = true;
      Vue.nextTick(() => {
        this.$refs.textLayer.getNode().toImage({
          callback: (textLayer) => {
            offscreenCanvas.getContext('2d').drawImage(textLayer, 0, 0);
            this.showKonvaText = false;
  
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
      });
    }
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
