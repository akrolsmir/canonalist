Vue.component('project-component', {
  props: {
    project: Object,
    currentPageId: String,
  },
  methods: {
    clickPage(pageId) {
      this.$emit('change-page', pageId);
    }
  },
  template: `
  <div class="panel">
    <h4>PROJECT</h4>
    <input type="text" v-model="project.name">
    <ul>
      <li v-for="(page, i) in project.pages">
        <a href="#" @click="clickPage(page.id)">
          {{ "Page " + (i + 1) + (page.id == currentPageId ? '*' : '') }}
        </a>
      </li>
    </ul>
  </div>
  `
});
