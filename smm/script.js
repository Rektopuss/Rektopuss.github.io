document.documentElement.classList.add('js');

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
  menuButton.querySelector('span').textContent = '+';
}

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(isOpen));
  navigation.classList.toggle('is-open', isOpen);
  menuButton.querySelector('span').textContent = isOpen ? '−' : '+';
});

navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});

window.matchMedia('(min-width: 601px)').addEventListener('change', closeMenu);
document.querySelector('#year').textContent = new Date().getFullYear();

const headlineFirst = document.querySelector('.headline-line');
const headlineSecond = document.querySelector('.headline-second');

function fitHeadline() {
  const firstWidth = headlineFirst.getBoundingClientRect().width;
  const secondWidth = headlineSecond.getBoundingClientRect().width;
  if (!secondWidth || Math.abs(firstWidth - secondWidth) < .25) return;
  const currentSize = parseFloat(getComputedStyle(headlineSecond).fontSize);
  headlineSecond.style.setProperty('--headline-second-size', `${currentSize * firstWidth / secondWidth}px`);
}

// Measure real glyph widths after font loading and whenever the first line resizes.
let headlineFrame;
const headlineResize = new ResizeObserver(() => {
  cancelAnimationFrame(headlineFrame);
  headlineFrame = requestAnimationFrame(fitHeadline);
});
headlineResize.observe(headlineFirst);
document.fonts.ready.then(fitHeadline);

const partners = document.querySelector('.partners');
const logoViewport = partners.querySelector('.logo-viewport');
const logoTrack = partners.querySelector('.logo-track');
const logoGroup = logoTrack.querySelector('.logo-group');
const logoPause = partners.querySelector('.logo-pause');

function sizeLogoLoop() {
  const groupWidth = logoGroup.getBoundingClientRect().width;
  if (!groupWidth || !logoGroup.children.length) return;

  // Always cover the viewport plus one full group, even with only a few logos.
  const copies = Math.ceil(logoViewport.clientWidth / groupWidth);
  while (logoTrack.children.length > copies + 1) logoTrack.lastElementChild.remove();
  while (logoTrack.children.length < copies + 1) {
    const copy = logoGroup.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    logoTrack.append(copy);
  }
  logoTrack.style.setProperty('--logo-distance', `${groupWidth}px`);
  logoTrack.style.setProperty('--logo-duration', `${groupWidth / 32}s`);
  partners.classList.add('is-ready');
  logoPause.hidden = false;
}

logoPause.addEventListener('click', () => {
  const paused = partners.classList.toggle('is-paused');
  const label = paused ? 'Turpināt logo kustību' : 'Apturēt logo kustību';
  logoPause.setAttribute('aria-pressed', String(paused));
  logoPause.setAttribute('aria-label', label);
  logoPause.title = label;
});

const logoResize = new ResizeObserver(sizeLogoLoop);
logoResize.observe(logoViewport);
logoResize.observe(logoGroup);
sizeLogoLoop();

// A circular stack: indices wrap, so there is no cloned-slide reset at either end.
const studioCarousel = document.querySelector('.studio-carousel');
const studioDeck = studioCarousel.querySelector('.studio-deck');
const studioCards = [...studioDeck.querySelectorAll('.studio-card')];
const studioAnnouncement = studioCarousel.querySelector('.studio-announcement');
let studioIndex = 0;
let studioPointer = null;

function showStudio(index, announce = false) {
  studioIndex = (index + studioCards.length) % studioCards.length;
  studioCards.forEach((card, i) => {
    const offset = (i - studioIndex + studioCards.length) % studioCards.length;
    card.classList.toggle('is-active', offset === 0);
    card.classList.toggle('is-next', offset === 1);
    card.classList.toggle('is-previous', offset === studioCards.length - 1 && offset !== 0 && offset !== 1);
    card.setAttribute('aria-hidden', String(offset !== 0));
    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'slaids');
    card.setAttribute('aria-label', `${i + 1} no ${studioCards.length}: ${card.dataset.title}`);
  });
  if (announce) {

    studioAnnouncement.textContent = `${studioCards[studioIndex].dataset.title}. Attēls ${studioIndex + 1} no ${studioCards.length}.`;
  }

}

studioCarousel.addEventListener('keydown', (event) => {
  const targets = { ArrowLeft: studioIndex - 1, ArrowRight: studioIndex + 1, Home: 0, End: studioCards.length - 1 };
  if (!(event.key in targets)) return;
  event.preventDefault();
  showStudio(targets[event.key], true);
});

studioDeck.addEventListener('dragstart', (event) => event.preventDefault());
studioDeck.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  studioPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, card: event.target.closest('.studio-card') };
  studioDeck.setPointerCapture(event.pointerId);

});
studioDeck.addEventListener('pointermove', (event) => {
  if (!studioPointer || studioPointer.id !== event.pointerId) return;
  const dx = event.clientX - studioPointer.x;
  const dy = event.clientY - studioPointer.y;
  if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
    studioDeck.classList.add('is-dragging');
    studioDeck.style.setProperty('--drag-x', `${Math.max(-55, Math.min(55, dx * .35))}px`);
  }
});

function releaseStudioPointer(event) {
  if (!studioPointer || studioPointer.id !== event.pointerId) return;
  const gesture = studioPointer;
  studioPointer = null;
  studioDeck.classList.remove('is-dragging');
  studioDeck.style.removeProperty('--drag-x');
  if (studioDeck.hasPointerCapture(event.pointerId)) studioDeck.releasePointerCapture(event.pointerId);
  if (event.type === 'pointerup') {
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (Math.abs(dx) > Math.max(32, studioDeck.clientWidth * .08) && Math.abs(dx) > Math.abs(dy)) {
      showStudio(studioIndex + (dx < 0 ? 1 : -1), true);
    } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && gesture.card) {
      const index = studioCards.indexOf(gesture.card);
      if (index !== studioIndex) showStudio(index, true);
    }
  }

}
studioDeck.addEventListener('pointerup', releaseStudioPointer);
studioDeck.addEventListener('pointercancel', releaseStudioPointer);
studioDeck.addEventListener('lostpointercapture', releaseStudioPointer);

if (studioCards.length) {
  studioCarousel.classList.add('is-ready');
  showStudio(0);
}
