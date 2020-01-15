import { projectUrl } from "./firebase-network.js";

Vue.component('login-component', {
  props: {
    value: Object, // Should be a user object
  },
  methods: {
    // Adapted from https://simonkollross.de/posts/vuejs-using-v-model-with-objects-for-custom-components
    update(key, value) {
      this.$emit('input', { ...this.value, [key]: value })
    },
    async logOut() {
      const result = await firebase.auth().signOut();
      // Reset user id to indicate logged out.
      this.value.id = '';
    },
    projectUrl
  },
  computed: {
  },
  template: `
  <div class="panel space">
    <h4>LOGIN</h4>
    <div v-if="value.id">
      Welcome, {{ value.name }}!
      <button @click="logOut">Log out.</button>
      <h4>PROJECTS</h4>
      <ul>
        <li v-for="project in value.projects">
          <a :href="projectUrl(project.id)" target="_blank" rel="noopener noreferrer">
            {{ project.name }}
          </a>
        </li>
      </ul>
    </div>
    <div id="firebaseui-auth-container"></div>
  </div>
  `// TODO: fix Vue-Shortcut eating login keystrokes
});
