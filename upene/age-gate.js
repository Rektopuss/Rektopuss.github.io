(() => {
  'use strict';

  const gate = document.getElementById('age-gate');
  const heading = document.getElementById('age-heading');
  const yes = document.getElementById('age-yes');
  const no = document.getElementById('age-no');

  // Require an explicit answer on every page load; Escape cannot bypass the gate.
  gate.removeAttribute('open');
  gate.showModal();
  gate.addEventListener('cancel', event => event.preventDefault());
  yes.disabled = false;
  no.disabled = false;
  heading.focus();

  yes.addEventListener('click', () => {
    document.getElementById('age-content').hidden = false;
    document.getElementById('age-notice').hidden = false;
    gate.close();
    const title = document.getElementById('page-title');
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
    document.dispatchEvent(new Event('upene:age-confirmed'));
  }, { once: true });

  no.addEventListener('click', () => {
    heading.textContent = 'Piekļuve vietnei liegta';
    document.getElementById('age-description').textContent = 'Tu nevari piekļūt šai vietnei, jo tā ir paredzēta tikai personām no 18 gadu vecuma.';
    document.getElementById('age-actions').hidden = true;
    heading.focus();
  }, { once: true });
})();
