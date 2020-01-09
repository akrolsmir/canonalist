export class Bubble {
  constructor(id, rect, japanese, english) {
    this.id = id;
    this.rect = rect;
    this.japanese = japanese;
    this.english = english;
    this.fontSize = 16; // in px
    this.fontFamily = 'Wild Words';
    this.lineHeight = 1.2;
    this.deleted = false;
    this.rotate = 0;
  }
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
    frameStyle() {
      return {
        'transform': `rotate(${this.value.rotate}deg`,
      }
    },
    textStyle() {
      const style = {
        'width': this.value.rect.width + 'px',
        'height': this.value.rect.height + 'px',
        'font-size': this.value.fontSize + 'px',
        'font-family': this.value.fontFamily,
        'line-height': this.value.lineHeight,
        // Show textarea bubble when currently selected.
        'color': this.showControls ? 'black' : 'transparent',
      };
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
      const rectCopy = { ...this.value.rect, x, y };
      this.update('rect', rectCopy);
    },
    onResize(x, y, width, height) {
      const rect = { x, y, width, height };
      this.update('rect', rect);

    }
  },
  template: `
  <vue-draggable-resizable :drag-handle="'.drag-handle'"
    v-show="!value.deleted"
    @dragging="onDrag" @resizing="onResize"
    :style="frameStyle"
    :handles="['tm', 'tr', 'mr', 'br', 'bm', 'bl', 'ml']"
    :active="showControls"
    :y="value.rect.y" :x="value.rect.x" :w="value.rect.width" :h="value.rect.height">
    <div class="drag-handle" v-if="showControls">
      <span class="typcn typcn-arrow-move"></span>
    </div>  
    <textarea class="bubbletext"
      spellcheck="false"
      :style="textStyle"
      @focus="showControls = true; $emit('bubble-focus', value.id)"
      @blur="showControls = false; $emit('bubble-unfocus')"
      :value="value.english"
      @input="update('english', $event.target.value)"
    ></textarea>
  </vue-draggable-resizable>
  `
});
