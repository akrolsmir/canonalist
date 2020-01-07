Vue.component('project-component', {
  props: {
    value: Object,
  },
  data() {
    return {
      pageIds: [
        "yjxtFrIYV",
        "4IcM39zjN",
        "IE8X3ZSVC",
        "oBmtRhWHT",
        "pagefive"
      ]
    }
  },
  computed: {
  },
  methods: {
    clickPage(pageId) {
      this.$emit('change-page', pageId);
    }
  },
  template: `
  <div class="panel">
    <h4>PAGES</h4>
    <ol>
      <li v-for="pageId in pageIds">
        <a href="#" @click="clickPage(pageId)">
          {{ pageId }}
        </a>
      </li>
    </ol>
  </div>
  `
});
