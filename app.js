/*
 * The Haunted Gallery — Vue 3 single-page application.
 * Data comes from artworks.json (a mock API), and client-side hash routes let
 * the visitor move between pages and artwork details without reloading.
 * Original illustrative media is stored under assets/.
 */
(() => {
  'use strict';
  const { createApp, nextTick } = Vue;

  const ArtworkCard = {
    props: { art: { type: Object, required: true }, index: Number },
    emits: ['select'],
    template: `
      <button type="button" class="art-card" :aria-label="'View details for ' + art.title" @click="$emit('select', art.id)">
        <span class="card-image">
          <img :src="art.image" :alt="art.alt || art.title" loading="lazy" decoding="async" />
          <span v-if="art.video" class="play-tag">▶ MOTION PIECE</span>
        </span>
        <span class="card-meta"><span>{{ String(index + 1).padStart(2, '0') }} / {{ art.type }}</span><span>{{ art.year }}</span></span>
        <span class="card-bottom"><strong>{{ art.title }}</strong><span class="circle-arrow" aria-hidden="true">↗</span></span>
      </button>`
  };

  function getHashRoute() {
    return decodeURIComponent((location.hash || '#/home').replace(/^#\/?/, '')) || 'home';
  }

  createApp({
    components: { ArtworkCard },
    data() {
      return {
        artworks: [], loading: true, error: '', route: getHashRoute(),
        filter: 'All works', search: '', navOpen: false,
        categories: ['All works', 'Digital Art', 'Illustration', 'Motion']
      };
    },
    computed: {
      screen() {
        if (this.route.startsWith('art/')) return 'gallery';
        return ['home', 'gallery', 'about'].includes(this.route) ? this.route : 'not-found';
      },
      selectedArtwork() {
        if (!this.route.startsWith('art/')) return null;
        return this.artworks.find(a => a.id === this.route.slice(4)) || null;
      },
      visibleArtworks() {
        const term = this.search.trim().toLocaleLowerCase();
        return this.artworks.filter(art =>
          (this.filter === 'All works' || art.type === this.filter) &&
          (!term || [art.title, art.description, art.type, art.artist]
            .some(value => String(value || '').toLocaleLowerCase().includes(term)))
        );
      }
    },
    watch: {
      selectedArtwork(art) {
        document.body.style.overflow = art ? 'hidden' : '';
        if (art) nextTick(() => this.$refs.closeButton?.focus());
      }
    },
    methods: {
      async loadArtwork() {
        try {
          // The same app can run as a fully self-contained offline preview.
          // The deployed version always requests the JSON file.
          const data = window.__GALLERY_PREVIEW_DATA__ ||
            await fetch('./artworks.json').then(response => {
              if (!response.ok) throw new Error(`Artwork JSON could not load (${response.status})`);
              return response.json();
            });
          if (!Array.isArray(data)) throw new Error('Art data is not an array.');
          this.artworks = data;
        } catch (error) {
          console.error(error);
          this.error = 'The artwork could not load. Please refresh and try again.';
        } finally {
          this.loading = false;
          if (this.selectedArtwork) nextTick(() => this.$refs.closeButton?.focus());
        }
      },
      onHashChange() {
        const old = this.route;
        this.route = getHashRoute();
        this.closeMenu();
        // Avoid jumping to the top when opening or closing artwork details.
        if (!old.startsWith('art/') && !this.route.startsWith('art/')) {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      },
      openArtwork(id) {
        location.hash = `#/art/${encodeURIComponent(id)}`;
      },
      closeArtwork() {
        location.hash = '#/gallery';
      },
      closeMenu() { this.navOpen = false; },
      onKeydown(event) {
        if (event.key === 'Escape' && this.selectedArtwork) this.closeArtwork();
        // Keep keyboard focus inside the artwork dialog.
        if (event.key === 'Tab' && this.selectedArtwork) {
          const dialog = document.querySelector('.detail-modal');
          if (!dialog) return;
          const focusables = [...dialog.querySelectorAll('button, a, [tabindex]:not([tabindex="-1"])')]
            .filter(el => !el.disabled);
          if (!focusables.length) return;
          const first = focusables[0], last = focusables[focusables.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }
    },
    mounted() {
      if (!location.hash) location.hash = '#/home';
      window.addEventListener('hashchange', this.onHashChange);
      document.addEventListener('keydown', this.onKeydown);
      this.loadArtwork();
    },
    beforeUnmount() {
      window.removeEventListener('hashchange', this.onHashChange);
      document.removeEventListener('keydown', this.onKeydown);
      document.body.style.overflow = '';
    }
  }).mount('#app');
})();
