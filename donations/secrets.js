(function () {
  'use strict';
  const assetRoot = new URL('../assets/images/donations/', document.currentScript.src);
  const hiddenImage = new URL('secret-placeholder.jpg', assetRoot).href;
  const revealedImage = new URL('florida-placeholder.jpg', assetRoot).href;
  const { stepCents, milestones, progress } = window.DonationGoals;
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const icons = {
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
    left: '<path d="m14 6-6 6 6 6"/>',
    right: '<path d="m10 6 6 6-6 6"/>'
  };
  const icon = name => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>';

  function carouselControls(id, label) {
    return `<div class="secret-carousel-controls"><button type="button" id="${id}-previous" class="secret-carousel-arrow" data-direction="-1" aria-controls="${id}-viewport" aria-label="${label}: iepriekšējie">${icon('left')}</button><button type="button" id="${id}-next" class="secret-carousel-arrow" data-direction="1" aria-controls="${id}-viewport" aria-label="${label}: nākamie">${icon('right')}</button></div>`;
  }

  function createCarousel(root, initialIndex) {
    const viewport = root.querySelector('.secret-carousel-viewport');
    const track = root.querySelector('.secret-carousel-track');
    const previous = root.querySelector('[data-direction="-1"]');
    const next = root.querySelector('[data-direction="1"]');
    const status = root.querySelector('.secret-carousel-status');
    const events = new AbortController();
    let index = initialIndex, visible = 1, step = 0, drag = null;
    const maxIndex = () => Math.max(0, track.children.length - visible);
    const clamp = value => Math.min(maxIndex(), Math.max(0, value));
    function position(animate = true) {
      index = clamp(index);
      track.classList.toggle('is-instant', !animate);
      track.style.transform = `translate3d(${-index * step}px,0,0)`;
      root.dataset.carouselIndex = index;
      previous.disabled = index === 0;
      next.disabled = index === maxIndex();
      status.textContent = `${index + 1}–${Math.min(track.children.length, index + visible)} / ${track.children.length}`;
    }
    function measure() {
      visible = Math.max(1, Number(getComputedStyle(root).getPropertyValue('--carousel-visible')) || 1);
      step = track.children[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
      drag = null;
      viewport.classList.remove('is-dragging');
      position(false);
    }
    const listen = (element, type, callback) => element.addEventListener(type, callback, { signal: events.signal });
    listen(previous, 'click', () => { index -= visible; position(); });
    listen(next, 'click', () => { index += visible; position(); });
    listen(viewport, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      index = event.key === 'Home' ? 0 : event.key === 'End' ? maxIndex() : index + (event.key === 'ArrowRight' ? 1 : -1);
      position();
    });
    listen(viewport, 'dragstart', event => event.preventDefault());
    listen(viewport, 'pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, active: false };
    });
    listen(viewport, 'pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.active) {
        if (Math.abs(dy) > Math.max(8, Math.abs(dx))) { drag = null; return; }
        if (Math.abs(dx) < 8) return;
        drag.active = true;
        viewport.setPointerCapture(event.pointerId);
        viewport.classList.add('is-dragging');
        track.classList.add('is-instant');
      }
      drag.dx = dx;
      const offset = Math.min(0, Math.max(-maxIndex() * step, -index * step + dx));
      track.style.transform = `translate3d(${offset}px,0,0)`;
    });
    function finishDrag(event) {
      if (!drag || event.pointerId !== drag.id) return;
      if (event.type === 'pointerup' && drag.active && Math.abs(drag.dx) > Math.min(40, step * .2)) {
        index -= Math.sign(drag.dx) * Math.max(1, Math.round(Math.abs(drag.dx) / step));
      }
      drag = null;
      viewport.classList.remove('is-dragging');
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      position();
    }
    listen(viewport, 'pointerup', finishDrag);
    listen(viewport, 'pointercancel', finishDrag);
    listen(viewport, 'lostpointercapture', event => {
      // Touch starts with implicit capture on the card child; ignore its transfer to the viewport.
      if (event.target === viewport) finishDrag(event);
    });
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    measure();
    return { get index() { return index; }, destroy() { observer.disconnect(); events.abort(); } };
  }

  let signature = '', carousels = [];
  function render(settings, total) {
    const host = document.getElementById('campaign-secrets');
    if (!host || document.body.dataset.view === 'overlay') return;
    const nextSignature = [settings.goalCents, settings.currency, total].join(':');
    if (signature === nextSignature) return;
    signature = nextSignature;
    const money = cents => new Intl.NumberFormat('lv-LV', { style: 'currency', currency: settings.currency, maximumFractionDigits: cents % 100 ? 2 : 0, minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
    const data = progress(settings.goalCents, total);
    const reveal = index => window.DonationGoals.reveal(index, data.goals.length);
    const positions = carousels.map(carousel => carousel.index);
    const focusedId = host.contains(document.activeElement) ? document.activeElement.id : '';
    carousels.forEach(carousel => carousel.destroy());
    host.innerHTML = `
      <div class="secret-carousel secret-goals-carousel" role="region" aria-roledescription="karuselis" aria-labelledby="secret-goals-title">
      <div class="secrets-heading"><h2 id="secret-goals-title">Mērķi</h2><div class="secrets-heading-actions"><span>${data.completed} / ${data.goals.length} atklāti</span>${carouselControls('secret-goals', 'Mērķi')}</div></div>
      <div id="secret-goals-viewport" class="secret-carousel-viewport" tabindex="0" aria-label="Mērķi; pārvelc vai izmanto bulttaustiņus">
        <ol class="secret-timeline secret-carousel-track">
          <li class="secret-step is-done"><span class="secret-step-dot">${icon('check')}</span><strong>Starts</strong><span>${esc(money(0))}</span><small>Pabeigts</small></li>
          ${data.goals.map((goal, index) => {
            const done = index < data.completed, active = goal === data.next;
            return `<li class="secret-step ${done ? 'is-done' : 'is-locked'} ${active ? 'is-next' : ''}"${active ? ' aria-current="step"' : ''}><span class="secret-step-dot">${icon(done ? index === data.goals.length - 1 ? 'star' : 'check' : 'lock')}</span><strong>${esc(done ? reveal(index).title : goal.label)}</strong><span>${esc(money(goal.amountCents))}</span><small>${done ? 'Atklāts' : active ? 'Atlikuši ' + esc(money(data.remaining)) : 'Slēgts'}</small></li>`;
          }).join('')}
        </ol>
      </div>
      <span class="secret-carousel-status sr-only" aria-live="polite" aria-atomic="true"></span>
      </div>
      <section class="secret-reveal" aria-labelledby="secret-reveal-title">
        <div class="secret-reveal-image"><img src="${esc(data.next ? hiddenImage : revealedImage)}" width="1536" height="1024" alt="">${data.next ? '<span aria-hidden="true">?</span>' : ''}</div>
        <div class="secret-reveal-copy">
          <h3 id="secret-reveal-title">${data.next ? 'Nākamais Florida atklājums' : 'Visi Florida noslēpumi atklāti!'}</h3>
          <p class="secret-reveal-amount"><strong>${esc(money(data.remaining))}</strong><span>${data.next ? 'līdz atklāšanai' : 'atlicis līdz mērķim'}</span></p>
          <progress class="secret-progress" max="${data.target || 1}" value="${data.next ? data.collected : 1}" aria-label="${data.next ? esc(data.next.label) + ': ' + esc(money(data.collected)) + ' no ' + esc(money(data.target)) : 'Visi noslēpumi atklāti'}"></progress>
          <div class="secret-progress-labels"><span>${esc(money(data.next ? data.collected : settings.goalCents))}</span><span>${esc(money(data.next ? data.target : settings.goalCents))}</span></div>
          <p class="secret-reveal-note">${icon(data.next ? 'lock' : 'check')}<span>${data.next ? 'Sasniedzot šo mērķi, atklāsim vienu no mūsu Florida tripa plāniem!' : 'Paldies par atbalstu! Kopā esam sasnieguši brauciena mērķi.'}</span></p>
        </div>
      </section>
      <div class="secret-carousel secret-plans-carousel" role="region" aria-roledescription="karuselis" aria-labelledby="secret-plans-title">
      <div class="secrets-heading secret-gallery-heading"><h2 id="secret-plans-title">Ko mēs plānojam?</h2><div class="secrets-heading-actions"><span>Jauns noslēpums ik pēc ${esc(money(stepCents))}</span>${carouselControls('secret-plans', 'Plāni')}</div></div>
      <div id="secret-plans-viewport" class="secret-carousel-viewport" tabindex="0" aria-label="Plāni; pārvelc vai izmanto bulttaustiņus">
      <ol class="secret-gallery secret-carousel-track" aria-label="Visi atklātie un slēgtie noslēpumi">
        ${data.goals.map((goal, index) => {
          const done = index < data.completed, content = done ? reveal(index) : null;
          return `<li class="secret-card ${done ? 'is-unlocked' : 'is-locked'}"${goal === data.next ? ' aria-current="step"' : ''}>
            <img src="${esc(done ? revealedImage : hiddenImage)}" width="1536" height="1024" loading="lazy" alt="" style="object-position:${30 + index % 4 * 15}% center">
            <span class="secret-card-icon">${icon(done ? 'check' : 'lock')}<span class="sr-only">${done ? 'Atklāts' : 'Slēgts'}</span></span>
            <div class="secret-card-copy"><h3>${esc(done ? content.title : goal.label)}</h3><p>${esc(done ? content.description : 'Drīzumā…')}</p><span>${esc(money(goal.amountCents))}</span></div>
          </li>`;
        }).join('')}
      </ol>
      </div><span class="secret-carousel-status sr-only" aria-live="polite" aria-atomic="true"></span>
      </div>`;
    carousels = [
      createCarousel(host.querySelector('.secret-goals-carousel'), positions[0] ?? Math.max(0, data.completed - 1)),
      createCarousel(host.querySelector('.secret-plans-carousel'), positions[1] ?? 0)
    ];
    if (focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
  }
  window.DonationSecrets = { milestones, progress, render };
})();
