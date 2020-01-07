Vue.component('project-component', {
  props: {
    value: Object, // Should be a project object
    currentPageId: String,
  },
  methods: {
    // Adapted from https://simonkollross.de/posts/vuejs-using-v-model-with-objects-for-custom-components
    update(key, value) {
      this.$emit('input', { ...this.value, [key]: value })
    },
    clickPage(pageId) {
      this.$emit('change-page', pageId);
    }
  },
  template: `
  <div class="panel">
    <h4>PROJECT</h4>
    <input type="text" v-model="value.name" v-shortkey.avoid>
    <ul>
      <li v-for="(page, i) in value.pages">
        <a href="#" @click="clickPage(page.id)">
          {{ "Page " + (i + 1) + (page.id == currentPageId ? '*' : '') }}
        </a>
      </li>
    </ul>
  </div>
  `
});
