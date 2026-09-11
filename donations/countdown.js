(function () {
  'use strict';

  const goalCard = document.querySelector('.goal-card');
  if (!goalCard || document.body.dataset.view === 'overlay') return;

  // Midnight on 1 March in Riga (UTC+02:00), regardless of the visitor's timezone.
  const deadline = Date.parse('2027-03-01T00:00:00+02:00');
  goalCard.insertAdjacentHTML('afterend', `
    <section class="campaign-countdown" aria-labelledby="countdown-title">
      <div class="countdown-heading">
        <h2 id="countdown-title"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg><span>Līdz ziedojumu noslēgumam</span></h2>
        <p>Ziedojumus vācam līdz <time datetime="2027-03-01T00:00:00+02:00">1. martam.</time></p>
      </div>
      <div class="countdown-digits" role="timer" aria-label="Laiks līdz ziedojumu noslēgumam" aria-live="off">
        <div class="countdown-unit"><strong id="countdown-days">00</strong><span>Dienas</span></div>
        <div class="countdown-unit"><strong id="countdown-hours">00</strong><span>Stundas</span></div>
        <div class="countdown-unit"><strong id="countdown-minutes">00</strong><span>Minūtes</span></div>
        <div class="countdown-unit"><strong id="countdown-seconds">00</strong><span>Sekundes</span></div>
      </div>
      <p class="countdown-note"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/></svg><span id="countdown-message" role="status">Paspēj palīdzēt, lai šis trips kļūst par realitāti!</span></p>
    </section>`);

  const fields = ['days', 'hours', 'minutes', 'seconds'].map(unit => document.getElementById('countdown-' + unit));
  let timer;
  function updateCountdown() {
    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const values = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
    fields.forEach((field, index) => { field.textContent = String(values[index]).padStart(2, '0'); });
    if (seconds === 0) {
      document.getElementById('countdown-message').textContent = 'Ziedojumu vākšana ir noslēgusies. Paldies par atbalstu!';
      clearInterval(timer);
    }
    return seconds;
  }

  if (updateCountdown() > 0) timer = setInterval(updateCountdown, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateCountdown();
  });
})();
