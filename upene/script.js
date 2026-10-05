(() => {
  'use strict';

  const videos = window.UPENE_VIDEOS;
  if (!Array.isArray(videos) || videos.length !== 5) return;

  function randomIndex(count) {
    // Reject the extra values so every slot has the same number of possible draws.
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      try {
        const draw = new Uint32Array(1);
        const range = 0x100000000;
        const limit = range - (range % count);
        do {
          window.crypto.getRandomValues(draw);
        } while (draw[0] >= limit);
        return draw[0] % count;
      } catch (_) {
        // Keep the page usable if the browser cannot supply random bytes.
      }
    }
    return Math.floor(Math.random() * count);
  }

  // Choose once per page opening or refresh. Do not persist the selection or
  // expose an in-page action for choosing another video.
  const index = randomIndex(videos.length);
  const video = videos[index];
  document.getElementById('video-number').textContent = `${String(index + 1).padStart(2, '0')} / 05`;

  if (video && /^[A-Za-z0-9_-]{11}$/.test(video.id)) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${video.id}?playsinline=1&rel=0`;
    iframe.title = video.title || 'U-PENE video';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    document.getElementById('player').replaceChildren(iframe);
    const link = document.getElementById('youtube-link');
    link.href = `https://www.youtube.com/watch?v=${video.id}`;
    link.hidden = false;
    document.getElementById('video-caption').textContent = video.title || 'Viens no pieciem. Izvēlēts tev.';
  }
})();
