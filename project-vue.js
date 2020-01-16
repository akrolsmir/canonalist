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
    },
    async deletePage(idToDelete) {
      if (this.value.pages.length <= 1) {
        // Disallow deletions when only one page left.
        return;
      }
      const shouldDelete = await swal({
        title: "Are you sure?",
        icon: "warning",
        buttons: ["Cancel", "Delete page"],
        dangerMode: true,
      });
      if (shouldDelete) {
        const index = this.value.pages.findIndex(page => page.id == idToDelete);
        this.value.pages.splice(index, 1);
        // If deleting the current page, also switch view to next page (or prev)
        if (idToDelete == this.currentPageId) {
          if (index == this.value.pages.length) {
            this.clickPage(this.value.pages[index - 1].id);
          } else {
            this.clickPage(this.value.pages[index].id);
          }
        }
        // TODO: Consider GC'ing the cloud reference
      }
    }
  },
  computed: {
    currentPageNum() {
      for (const [i, page] of this.value.pages.entries()) {
        if (page.id == this.currentPageId) {
          return i + 1;
        }
      }
      return 0;
    },
    currentPageFilename() {
      const projectFilename = this.value.name.replace(/[^a-z0-9]/gi, '-');
      return `${projectFilename}-${this.currentPageNum}.png`;
    }
  },
  template: `
  <div class="panel">
    <h4>CURRENT PROJECT</h4>
    <input type="text" v-model="value.name">
    <ul>
      <li v-for="(page, i) in value.pages">
        <a href="#" @click="clickPage(page.id)">
          {{ "Page " + (i + 1) + (page.id == currentPageId ? '*' : '') }}
        </a>
        -- 
        (<a href="#" @click="deletePage(page.id)">x</a>)
      </li>
    </ul>
  </div>
  `
});
