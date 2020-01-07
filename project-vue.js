Vue.component('project-component', {
  props: {
    project: Object,
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
    <ol>
      <li v-for="page in project.pages">
        <a href="#" @click="clickPage(page.id)">
          {{ page.id }}
        </a>
      </li>
    </ol>
  </div>
  `
});
