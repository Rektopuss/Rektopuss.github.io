(() => {
  'use strict';

  const gate = document.getElementById('age-gate');
  const heading = document.getElementById('age-heading');
  const yes = document.getElementById('age-yes');
  const no = document.getElementById('age-no');
  const storageKey = 'upene-age-confirmation';
  const confirmationLifetime = 24 * 60 * 60 * 1000;

  const revealContent = (focusTitle = false) => {
    document.getElementById('age-content').hidden = false;
    document.getElementById('age-notice').hidden = false;
    gate.close();
    if (focusTitle) {
      const title = document.getElementById('page-title');
      title.setAttribute('tabindex', '-1');
      title.focus({ preventScroll: true });
    }
    document.dispatchEvent(new Event('upene:age-confirmed'));
  };

  gate.removeAttribute('open');
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    const elapsed = Date.now() - saved?.confirmedAt;
    if (saved?.version === 1 && Number.isFinite(saved.confirmedAt) && elapsed >= 0 && elapsed < confirmationLifetime) {
      revealContent();
      return;
    }
    localStorage.removeItem(storageKey);
  } catch {
    // Unavailable storage or invalid saved data must still allow a fresh answer.
  }

  // Without a current confirmation, Escape cannot bypass the gate.
  gate.showModal();
  gate.addEventListener('cancel', event => event.preventDefault());
  yes.disabled = false;
  no.disabled = false;
  heading.focus();

  yes.addEventListener('click', () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, confirmedAt: Date.now() }));
    } catch {
      // The current visit still works when the browser blocks storage.
    }
    revealContent(true);
  }, { once: true });

  no.addEventListener('click', () => {
    heading.textContent = 'Piekļuve vietnei liegta';
    document.getElementById('age-description').textContent = 'Tu nevari piekļūt šai vietnei, jo tā ir paredzēta tikai personām no 18 gadu vecuma.';
    document.getElementById('age-actions').hidden = true;
    heading.focus();
  }, { once: true });
})();
