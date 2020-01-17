import { projectUrl, promptLogIn } from "./firebase-network.js";

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
    promptLogIn,
    projectUrl
  },
  computed: {
  },
  template: `
  <div class="panel space">
    <h4>PROJECTS</h4>
    <div v-if="value.id">
      Welcome, {{ value.name }}!
      <button @click="logOut">Log out</button>
      <ul>
        <li v-for="project in value.projects">
          <a :href="projectUrl(project.id)" target="_blank" rel="noopener noreferrer">
            {{ project.name }}
          </a>
        </li>
      </ul>
    </div>
    <div v-else>
      <button @click="promptLogIn">Log in</button>
    </div>
  </div>
  `
});
