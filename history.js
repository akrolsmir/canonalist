Vue.component('history-panel', {
  data() {
    return {
      // A stack of doables, with most recent element in front.
      // Doables should implement undo(), redo(), and getName()
      historyStack: [],
      pointer: 0,
    }
  },
  methods: {
    record(doable) {
      // Replace the items from 0 to pointer, with [doable].
      // TODO: Maybe free up memory.
      this.historyStack.splice(0, this.pointer, doable);
      this.pointer = 0;
    },

    undo() {
      if (this.pointer < this.historyStack.length) {
        this.historyStack[this.pointer].undo();
        this.pointer++;
      }
    },

    redo() {
      if (this.pointer > 0) {
        this.pointer--;
        this.historyStack[this.pointer].redo();
      }
    }
  },
  template:
  `<div id="historyPanel" class="panel" v-show="historyStack.length > 0"
    style="max-height: 160px; overflow: auto;">
    <h4>HISTORY</h4>
    <ul style="padding-inline-start: 20px; margin-block-start: 0;">
      <li v-for='(doable, i) in historyStack.slice().reverse()'>
        {{ ( historyStack.length - i - 1 == pointer ? '* ' : '') + doable.getName() }}
      </li>
    </ul>
  </div>`
})

// Create a doable for a Konva Node.
class EditLayerDoable {
  constructor(node, name) {
    this.node = node;
    this.name = name;
  }

  undo() {
    this.node.remove();
    vueApp.$refs.editLayer.getNode().getLayer().batchDraw();
  }

  redo() {
    vueApp.$refs.editLayer.getNode().getLayer().add(this.node);
    vueApp.$refs.editLayer.getNode().getLayer().batchDraw();
  }

  getName() {
    return this.name;
  }
}