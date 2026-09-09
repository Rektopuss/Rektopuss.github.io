/* Afterhours donation dashboard — no build step or external dependencies. */
(function () {
  'use strict';
  const M = window.DonoModel;
  const config = window.DONO_CONFIG || {};
  const overlay = document.body.dataset.view === 'overlay';
  const scriptURL = document.currentScript.src;
  const rootURL = new URL('.', scriptURL);
  const storageKey = 'afterhours-donations-v1:' + rootURL.pathname + (new URLSearchParams(location.search).has('test') ? ':test' : '');
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let state = M.demo(), connection = '', storageWarning = '', eventSource, backendPollTimer, backendConnecting = false;
  let announcementQueue = [], announcementTimer = null;
  let missionPosition = 0.5, missionHasProgress = false;
  function decodeSnapshot(value) { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value), c => c.charCodeAt(0)))); }
  function encodeSnapshot(value) { return btoa(Array.from(new TextEncoder().encode(JSON.stringify(value)), b => String.fromCharCode(b)).join('')); }
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) state = M.validateState(JSON.parse(saved));
  } catch (_) { storageWarning = 'Pārlūka krātuve nav pieejama vai saglabātie dati nav derīgi. Pirms aizvēršanas eksportē datus.'; }
  if (!overlay && !config.apiBaseUrl && config.localResetVersion && !new URLSearchParams(location.search).has('test')) {
    try {
      const resetKey = storageKey + ':reset';
      if (localStorage.getItem(resetKey) !== config.localResetVersion) {
        state = { ...state, source: 'custom', donations: [] };
        localStorage.setItem(storageKey, JSON.stringify(state));
        localStorage.setItem(resetKey, config.localResetVersion);
      }
    } catch (_) { storageWarning = 'Neizdevās saglabāt ziedojumu atiestatīšanu. Iespējo pārlūka krātuvi.'; }
  }
  if (!overlay && !config.apiBaseUrl && config.localLanguageVersion && !new URLSearchParams(location.search).has('test')) {
    try {
      const languageKey = storageKey + ':language';
      if (localStorage.getItem(languageKey) !== config.localLanguageVersion) {
        const knownLabels = new Map([
          ['Build the next chapter.', 'Veidojam nākamo nodaļu.'],
          ['A better setup. Bigger streams. Made possible by you.', 'Labāks aprīkojums un lielākas tiešraides — pateicoties jums.'],
          ['New mic, who dis?', 'Jauns mikrofons'],
          ['Community game night', 'Kopienas spēļu vakars'],
          ['12-hour marathon', '12 stundu maratons'],
          ['The dream setup', 'Sapņu aprīkojums']
        ]);
        state = { ...state, settings: { ...state.settings, title: knownLabels.get(state.settings.title) || state.settings.title, subtitle: knownLabels.get(state.settings.subtitle) || state.settings.subtitle, milestones: state.settings.milestones.map(m => ({ ...m, label: knownLabels.get(m.label) || m.label })) } };
        localStorage.setItem(storageKey, JSON.stringify(state));
        localStorage.setItem(languageKey, config.localLanguageVersion);
      }
    } catch (_) { storageWarning = 'Neizdevās saglabāt latviešu valodas iestatījumu.'; }
  }
  if (overlay) {
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.has('data')) {
      try { state = M.validateState(decodeSnapshot(params.get('data'))); }
      catch (_) { connection = 'Nederīga datu kopija'; storageWarning = 'Pārklājuma datu kopiju neizdevās ielādēt.'; state.donations = []; }
    }
    const requestedWidget = new URLSearchParams(location.search).get('widget') || 'full';
    // Older generated links used `latest`; treat them as the replacement mission view.
    document.body.dataset.widget = requestedWidget === 'latest' ? 'mission' : requestedWidget;
  }
  const icon = (name, size = 18) => {
    const paths = { bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>', arrow: '<path d="M7 17 17 7M7 7h10v10"/>', plus: '<path d="M12 5v14M5 12h14"/>', settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>', download: '<path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/>', screen: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>', heart: '<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-5 5 8 15 8 15S25 10 20 5Z"/>', check: '<path d="m5 12 4 4L19 6"/>', upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>' };
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.bolt) + '</svg>';
  };
  function gauge() {
    let ticks = '';
    for (let i = 0; i <= 32; i++) {
      const a = Math.PI + i * Math.PI / 32, r = i % 4 === 0 ? 132 : 139;
      ticks += '<line x1="' + (200 + Math.cos(a) * r) + '" y1="' + (220 + Math.sin(a) * r) + '" x2="' + (200 + Math.cos(a) * 145) + '" y2="' + (220 + Math.sin(a) * 145) + '" class="gauge-tick ' + (i % 4 === 0 ? 'major' : '') + '"/>';
    }
    return '<svg class="gauge" viewBox="20 46 360 207" role="img" aria-labelledby="gauge-title"><title id="gauge-title">Ziedojumu mērķa progress</title><defs><linearGradient id="arc-color"><stop stop-color="#73cfb3"/><stop offset="1" stop-color="#d8f277"/></linearGradient><radialGradient id="gauge-glow"><stop stop-color="#cce97a" stop-opacity=".10"/><stop offset="1" stop-color="#cce97a" stop-opacity="0"/></radialGradient></defs><circle cx="200" cy="207" r="160" fill="url(#gauge-glow)"/><path class="gauge-track" d="M42 220 A158 158 0 0 1 358 220" pathLength="100"/><path id="gauge-progress" class="gauge-progress" d="M42 220 A158 158 0 0 1 358 220" pathLength="100" stroke-dasharray="0 100"/>' + ticks + '<text x="200" y="145" id="gauge-percent" class="gauge-percent">0%</text><g id="gauge-needle"><path d="M196 220 200 157 204 220Z" fill="#e6f4b4"/><circle cx="200" cy="220" r="9" fill="#242a27" stroke="#d8f277" stroke-width="3"/></g><text x="42" y="245" class="gauge-edge">0</text><text x="358" y="245" text-anchor="end" id="gauge-max" class="gauge-edge">2,000</text></svg>';
  }
  $('app').innerHTML = `
    <div class="shell">
      <main>
        <header class="page-header"><span class="page-header-spacer" aria-hidden="true"></span><a class="page-title" href="${esc(rootURL.href)}">ASV TRIPS v2</a><a class="tip-link" href="${esc(publicDonateURL())}" target="_blank" rel="noopener noreferrer">Ziedot ${icon('arrow', 13)}</a></header>
        <div class="content-grid">
          <section class="goal-card" aria-labelledby="campaign-title"><h1 id="campaign-title" class="sr-only"></h1>${gauge()}<div class="goal-money"><strong id="goal-total"></strong><span>/ <span id="goal-target"></span></span></div><span id="goal-remaining" class="goal-remaining"></span></section>
          <section class="card milestone-card"><div class="card-heading"><h2>Mērķi</h2><span class="muted small" id="milestone-count"></span></div><div class="mission-view" id="mission-view"><div class="mission-track" aria-hidden="true"></div><ol id="milestones" aria-label="Iepriekšējais, pašreizējais un nākamais mērķis"></ol><span class="mission-position" id="mission-position" aria-hidden="true"></span></div><p id="mission-empty" class="empty" hidden>Mērķi vēl nav pievienoti. Pievieno tos sadaļā “Pielāgot”.</p><details class="mission-details" id="mission-details"><summary><span>Skatīt visus mērķus</span><span class="mission-summary-icon" aria-hidden="true">⌄</span></summary><ol class="all-milestones" id="all-milestones" aria-label="Visi kampaņas mērķi"></ol></details></section>
          <section class="card recent-card"><div class="card-heading"><h2>Jaunākie ziedojumi</h2><span id="stat-count" class="muted small" title="Kampaņas ziedojumi"></span></div><div id="recent-list" class="donor-list"></div></section>
          <section class="card leaders-card"><div class="card-heading"><h2>Lielākie ziedotāji</h2></div><div id="leaders-list" class="donor-list"></div></section>
        </div>
        <details class="studio-bar"><summary><span id="source-badge" class="status">Demonstrācijas dati</span><span class="controls-label">${icon('settings', 14)} Vadība</span></summary><div class="studio-actions"><button class="button" id="support-button">${icon('plus', 15)} Pievienot ziedojumu</button><button class="button accent" id="simulate-button">${icon('bolt', 15)} Testa ziedojums</button><button class="button" id="edit-button">${icon('settings', 15)} Pielāgot</button><button class="button" id="import-button">${icon('upload', 15)} Importēt datus</button><button class="button" id="overlay-button">${icon('screen', 15)} OBS pārklājums</button><button class="icon-button" id="export-button" aria-label="Eksportēt paneļa datus" title="Eksportēt datus">${icon('download')}</button></div><p class="local-note" id="local-note"></p></details>
      </main>
    </div>
    <aside id="donation-alert" class="donation-alert" aria-live="polite" aria-atomic="true"></aside><div id="toast" class="toast" role="status"></div>
    <dialog id="donation-dialog"><form id="donation-form"><div class="dialog-heading"><div><span class="eyebrow">ZIEDOJUMA PRIEKŠSKATĪJUMS</span><h2>Pievienot ziedojumu</h2></div><button type="button" class="icon-button close-dialog" aria-label="Aizvērt">${icon('close')}</button></div><p class="muted">Lokāls ieraksts priekšskatījumam. Tas neveic maksājumu un netiek nosūtīts Streamlabs.</p><label>Vārds<input name="name" maxlength="60" placeholder="Anonīms"></label><div class="form-row"><label>Summa <span id="amount-currency"></span><input name="amount" type="number" min="0.01" max="100000000" step="0.01" value="25" required></label><label>Datums un laiks<input name="createdAt" type="datetime-local" required></label></div><label>Ziņa <span class="muted">nav obligāta</span><textarea name="message" maxlength="280" rows="3" placeholder="Atstāj jauku ziņu…"></textarea></label><p class="form-error" role="alert"></p><button class="button primary wide" type="submit">${icon('plus')} Pievienot panelim</button></form></dialog>
    <dialog id="settings-dialog"><form id="settings-form"><div class="dialog-heading"><div><span class="eyebrow">PIELĀGO SAVĀM VAJADZĪBĀM</span><h2>Kampaņas iestatījumi</h2></div><button type="button" class="icon-button close-dialog" aria-label="Aizvērt">${icon('close')}</button></div><label>Mērķa nosaukums<input name="title" maxlength="70" required></label><label>Apraksts<input name="subtitle" maxlength="160"></label><div class="form-row"><label>Mērķa summa<input name="goal" type="number" step="0.01" min="0.01" max="100000000" required></label><label>Valūta<select name="currency"><option>EUR</option><option>USD</option><option>GBP</option><option>CAD</option><option>AUD</option></select></label></div><p class="field-hint">Valūtas maiņa tikai nomaina apzīmējumu; summas netiek konvertētas.</p><label>Kampaņas sākums<input name="startDate" type="datetime-local" required></label><label>Starpmērķi <span class="muted">katrā rindā: summa | nosaukums</span><textarea name="milestones" rows="5" required></textarea></label><p class="field-hint">Var pievienot līdz 8 starpmērķiem. Vecāki ziedojumi netiek ieskaitīti šajā kampaņā.</p><p class="form-error" role="alert"></p><button class="button primary wide" type="submit">Saglabāt kampaņu</button><div class="danger-actions"><button class="text-button" type="button" id="clear-button">Dzēst ziedojumus</button><button class="text-button" type="button" id="reset-button">Atjaunot demonstrāciju</button></div></form></dialog>
    <dialog id="import-dialog"><form id="import-form"><div class="dialog-heading"><div><span class="eyebrow">PIEVIENO SAVUS DATUS</span><h2>Importēt ziedojumus</h2></div><button type="button" class="icon-button close-dialog" aria-label="Aizvērt">${icon('close')}</button></div><p class="muted">Importē CSV, JSON ziedojumu sarakstu vai paneļa eksportu. Tas aizstās šajā pārlūkā saglabātos ziedojumus.</p><label class="file-label">Izvēlies .csv vai .json failu<input id="import-file" type="file" accept=".csv,.json,text/csv,application/json"></label><label>Vai ielīmē datus<textarea id="import-text" rows="7" spellcheck="false" placeholder='name,amount,createdAt,message&#10;Skatītājs,25.00,2026-09-06T18:00:00Z,Paldies par straumi!'></textarea></label><p class="field-hint">Obligātās CSV kolonnas: <code>name,amount,createdAt</code>. Papildu: <code>id,message,currency</code>. Decimāldaļai izmanto punktu. Visām summām jābūt kampaņas valūtā.</p><a class="inline-link" href="${esc(new URL('sample-donations.csv', rootURL).href)}" download>Lejupielādēt CSV piemēru ${icon('download', 14)}</a><p class="form-error" role="alert"></p><button class="button primary wide" type="submit">Aizstāt ar importētajiem datiem</button></form></dialog>
    <dialog id="overlay-dialog"><div class="dialog-heading"><div><span class="eyebrow">PARĀDI TIEŠRAIDĒ</span><h2>OBS pārklājums</h2></div><button type="button" class="icon-button close-dialog" aria-label="Aizvērt">${icon('close')}</button></div><p class="muted">Ielīmē šo adresi OBS pārlūka avotā. Izmanto <strong>1200 × 300</strong> pilnajam skatam, <strong>480 × 235</strong> spidometram vai <strong>800 × 105</strong> mērķu līnijai.</p><label>Izkārtojums<select id="overlay-layout"><option value="full">Mērķis + jaunākie ziedotāji + mērķu līnija</option><option value="goal">Tikai spidometrs</option><option value="mission">Tikai mērķu līnija</option></select></label><label>Pārlūka avota adrese<input id="overlay-url" readonly aria-label="OBS pārklājuma adrese"></label><p class="field-hint" id="overlay-note">Adrese satur pašreizējo kampaņas datu kopiju. Pēc izmaiņām izveido un ielīmē OBS jaunu adresi.</p><p class="form-error" id="overlay-error" role="alert"></p><div class="form-row"><button class="button primary" id="copy-overlay">Kopēt adresi</button><a class="button" id="open-overlay" target="_blank" rel="noopener">Atvērt priekšskatījumu ${icon('arrow', 15)}</a></div><label class="checkbox-label"><input type="checkbox" id="preview-background"> Priekšskatījumā rādīt rūtiņu fonu</label></dialog>`;

  function money(amount, compact = false) {
    return new Intl.NumberFormat('lv-LV', { style: 'currency', currency: state.settings.currency, minimumFractionDigits: amount % 100 === 0 ? 0 : 2, maximumFractionDigits: 2, ...(compact ? { notation: 'compact' } : {}) }).format(amount / 100);
  }
  function relativeDate(value) {
    const minutes = Math.floor((Date.now() - Date.parse(value)) / 60000);
    if (minutes < 0) return new Date(value).toLocaleDateString();
    if (minutes < 1) return 'tikko'; if (minutes < 60) return 'pirms ' + minutes + ' min.';
    if (minutes < 1440) return 'pirms ' + Math.floor(minutes / 60) + ' st.'; return 'pirms ' + Math.floor(minutes / 1440) + ' d.';
  }
  function truncatedName(value, maxLength = 20) {
    const characters = [...String(value)];
    return characters.length <= maxLength ? characters.join('') : characters.slice(0, maxLength - 3).join('') + '...';
  }
  function render() {
    const s = state.settings, data = M.stats(state);
    const percent = data.total / s.goalCents * 100, clamped = Math.min(100, percent);
    const next = s.milestones.find(m => m.amountCents > data.total);
    $('stat-count').textContent = data.count;
    $('campaign-title').textContent = s.title;
    $('gauge-percent').textContent = Math.floor(percent) + '%'; $('gauge-max').textContent = money(s.goalCents, true);
    $('gauge-title').textContent = 'Savākti ' + money(data.total) + ' no ' + money(s.goalCents) + ', ' + Math.floor(percent) + ' procenti';
    $('gauge-progress').setAttribute('stroke-dasharray', clamped + ' 100'); $('gauge-needle').style.transform = 'rotate(' + (-90 + clamped * 1.8) + 'deg)';
    $('goal-total').textContent = money(data.total); $('goal-target').textContent = money(s.goalCents);
    $('goal-remaining').textContent = percent >= 100 ? '+' + money(data.total - s.goalCents) + ' virs mērķa' : 'Atlikuši ' + money(s.goalCents - data.total);
    const completedCount = s.milestones.filter(m => m.amountCents <= data.total).length;
    const centeredIndex = Math.max(0, completedCount - 1);
    $('milestone-count').textContent = completedCount + ' / ' + s.milestones.length;
    const currentGoal = s.milestones[centeredIndex];
    $('mission-view').hidden = !currentGoal;
    $('mission-empty').hidden = Boolean(currentGoal);
    const visibleGoalOffsets = overlay ? [0, 1] : [-1, 0, 1];
    $('milestones').innerHTML = currentGoal ? visibleGoalOffsets.map(offset => {
      const index = centeredIndex + offset, m = s.milestones[index];
      if (!m) return '<li class="milestone mission-placeholder" aria-hidden="true"></li>';
      const done = data.total >= m.amountCents, active = m === next;
      return '<li class="milestone ' + (done ? 'done' : active ? 'active' : '') + (offset === 0 ? ' centered' : '') + '"' + (offset === 0 ? ' aria-current="step" data-center="true"' : '') + ' data-index="' + index + '"><span class="mission-dot" aria-hidden="true">' + (done ? icon('check', 10) : '') + '</span><div class="milestone-label"><strong>' + esc(m.label) + '</strong><span>' + esc(money(m.amountCents)) + '</span></div><small>' + (done ? 'Pabeigts' : active ? 'Nākamais · atlikuši ' + esc(money(m.amountCents - data.total)) : 'Gaidāms') + '</small></li>';
    }).join('') : '';
    missionHasProgress = data.total > 0 && Boolean(currentGoal);
    // The website centers the current checkpoint. OBS fixes it at the left quarter.
    const currentPosition = overlay ? 0.25 : 0.5;
    const segmentWidth = overlay ? 0.5 : 1 / 3;
    missionPosition = currentPosition;
    if (currentGoal && data.total < currentGoal.amountCents) {
      missionPosition = Math.max(0, currentPosition - segmentWidth) + Math.max(0, data.total / currentGoal.amountCents) * Math.min(segmentWidth, currentPosition);
    } else if (currentGoal && s.milestones[centeredIndex + 1]) {
      const upcoming = s.milestones[centeredIndex + 1];
      missionPosition += Math.min(1, (data.total - currentGoal.amountCents) / (upcoming.amountCents - currentGoal.amountCents)) * segmentWidth;
    }
    $('mission-position').hidden = !missionHasProgress || !currentGoal || data.total === currentGoal.amountCents || completedCount === s.milestones.length;
    $('mission-position').style.left = missionPosition * 100 + '%';
    $('mission-details').hidden = s.milestones.length === 0;
    $('all-milestones').style.setProperty('--mission-list-rows', Math.ceil(s.milestones.length / 2));
    $('all-milestones').innerHTML = s.milestones.map((m, index) => {
      const done = data.total >= m.amountCents, active = m === next;
      return '<li class="all-milestone ' + (done ? 'done' : active ? 'active' : '') + '"' + (active ? ' aria-current="step"' : '') + '><span class="all-milestone-marker" aria-hidden="true">' + (done ? icon('check', 10) : index + 1) + '</span><strong>' + esc(m.label) + '</strong><span>' + esc(money(m.amountCents)) + '</span></li>';
    }).join('');
    updateMissionTrack();
    const recentDonations = data.donations.slice(0, overlay ? 4 : 5);
    $('recent-list').innerHTML = recentDonations.map(d => overlay
      ? '<div class="donor-row overlay-donor-row"><strong class="overlay-donor-name" title="' + esc(d.name) + '">' + esc(truncatedName(d.name)) + '</strong><span class="donor-amount">+' + esc(money(d.amountCents)) + '</span></div>'
      : '<div class="donor-row"><div class="donor-info"><strong>' + esc(d.name) + '<time datetime="' + esc(d.createdAt) + '" title="' + esc(new Date(d.createdAt).toLocaleString('lv-LV')) + '">' + esc(relativeDate(d.createdAt)) + '</time></strong><p>' + esc(d.message || '') + '</p></div><span class="donor-amount">+' + esc(money(d.amountCents)) + '</span></div>').join('') || '<div class="empty">Ziedojumu vēl nav.</div>';
    $('leaders-list').innerHTML = data.leaders.slice(0, 5).map((p, i) => '<div class="leader-row"><span class="rank ' + (i === 0 ? 'first' : '') + '">' + String(i + 1).padStart(2, '0') + '</span><div class="donor-info"><strong>' + esc(p.name) + '</strong><p>' + p.count + (p.count === 1 ? ' ziedojums' : ' ziedojumi') + '</p></div><span class="leader-amount">' + esc(money(p.amountCents)) + '</span></div>').join('') || '<div class="empty">Ziedotāju vēl nav.</div>';
    $('source-badge').innerHTML = '<i></i>' + esc(connection || (state.source === 'demo' ? 'Demonstrācijas dati' : 'Tavi dati · lokāls priekšskatījums'));
    $('local-note').textContent = storageWarning || (config.apiBaseUrl ? 'Savienots ar datu serveri.' : 'Saglabāts tikai šajā pārlūkā. Streamlabs konts nav savienots.');
    for (const id of ['simulate-button', 'edit-button', 'import-button']) $(id).disabled = Boolean(config.apiBaseUrl);
    $('support-button').disabled = Boolean(config.apiBaseUrl && !publicDonateURL());
  }
  function updateMissionTrack() {
    const view = $('mission-view');
    const pageWidth = overlay ? view.clientWidth : document.documentElement.clientWidth;
    view.style.setProperty('--page-width', pageWidth + 'px');
    view.style.setProperty('--progress-x', (missionHasProgress ? pageWidth / 2 + (missionPosition - 0.5) * view.clientWidth : 0) + 'px');
  }
  new ResizeObserver(updateMissionTrack).observe($('mission-view'));
  function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').classList.remove('visible'), 5000); }
  function persist(next, donation) {
    const previousTotal = M.stats(state).total;
    state = M.validateState(next);
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) { storageWarning = 'Neizdevās saglabāt pārlūka krātuvē. Eksportē datus, lai nezaudētu izmaiņas.'; toast(storageWarning); }
    render();
    if (donation) {
      announce(donation);
      const total = M.stats(state).total;
      const unlocked = state.settings.milestones.filter(m => previousTotal < m.amountCents && total >= m.amountCents);
      if (unlocked.length) { celebrate(); toast('Sasniegts mērķis: ' + unlocked.map(m => m.label).join(' · ')); }
    }
  }
  function announce(d) { announcementQueue.push(d); if (!announcementTimer) showNextAnnouncement(); }
  function showNextAnnouncement() {
    const d = announcementQueue.shift();
    if (!d) { announcementTimer = null; return; }
    const el = $('donation-alert'); el.innerHTML = '<span class="alert-heart">' + icon('heart', 26) + '</span><div><small>SAŅEMTS JAUNS ZIEDOJUMS</small><strong>' + esc(d.name) + ' <span>+' + esc(money(d.amountCents)) + '</span></strong><p>' + esc(d.message || 'Paldies, ka esi kopā ar mums!') + '</p></div>';
    el.classList.add('visible');
    announcementTimer = setTimeout(() => { el.classList.remove('visible'); announcementTimer = setTimeout(showNextAnnouncement, 400); }, 4200);
  }
  function celebrate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < 34; i++) { const confetti = document.createElement('i'); confetti.className = 'confetti'; confetti.style.cssText = '--x:' + Math.random() * 100 + 'vw;--delay:' + Math.random() * .6 + 's;--spin:' + Math.random() * 700 + 'deg;background:' + ['#d8f277', '#ad9bfb', '#73cfb3'][i % 3]; document.body.append(confetti); setTimeout(() => confetti.remove(), 3500); }
  }
  function openDialog(id) { const el = $(id); const error = el.querySelector('.form-error'); if (error) error.textContent = ''; el.showModal(); }
  function localDate(value) { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  function publicDonateURL() { try { const url = new URL(config.donateUrl); return url.protocol === 'https:' ? url.href : ''; } catch (_) { return ''; } }
  function openDonation() { $('donation-form').reset(); $('amount-currency').textContent = '(' + state.settings.currency + ')'; $('donation-form').elements.createdAt.value = localDate(Date.now()); openDialog('donation-dialog'); }
  $('support-button').addEventListener('click', () => { const url = publicDonateURL(); if (url) window.open(url, '_blank', 'noopener,noreferrer'); else openDonation(); });
  if (publicDonateURL()) $('support-button').innerHTML = icon('heart') + ' Atbalstīt tiešraidi ' + icon('arrow', 15);
  document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } }));
  $('donation-form').addEventListener('submit', e => {
    e.preventDefault(); const form = e.currentTarget;
    try { const d = { id: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9), name: form.elements.name.value, amountCents: M.cents(form.elements.amount.value), message: form.elements.message.value, createdAt: new Date(form.elements.createdAt.value).toISOString() }; persist({ ...state, source: 'custom', donations: [d, ...state.donations] }, d); $('donation-dialog').close(); }
    catch (error) { form.querySelector('.form-error').textContent = error.message; }
  });
  $('simulate-button').addEventListener('click', () => {
    const names = ['orbit_olive', 'cozybyte', 'lunar.exe', 'pixelpilot', 'softsignal'];
    const d = { id: 'test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), name: names[Math.floor(Math.random() * names.length)], amountCents: [1000, 2500, 5000, 7500, 10000][Math.floor(Math.random() * 5)], message: 'Testa ziedojums — ceļā uz nākamo mērķi! ✨', createdAt: new Date().toISOString() };
    try { persist({ ...state, donations: [d, ...state.donations] }, d); } catch (error) { toast(error.message); }
  });
  $('edit-button').addEventListener('click', () => { const f = $('settings-form').elements, s = state.settings; f.title.value = s.title; f.subtitle.value = s.subtitle; f.goal.value = s.goalCents / 100; f.currency.value = s.currency; f.startDate.value = localDate(s.startDate); f.milestones.value = s.milestones.map(m => m.amountCents / 100 + ' | ' + m.label).join('\n'); openDialog('settings-dialog'); });
  $('settings-form').addEventListener('submit', e => {
    e.preventDefault(); const f = e.currentTarget.elements;
    try {
      const milestones = f.milestones.value.split('\n').filter(line => line.trim()).map(line => { const divider = line.indexOf('|'); if (divider < 0) throw new Error('Katram starpmērķim jābūt formātā summa | nosaukums.'); const label = line.slice(divider + 1).trim(); if (!label) throw new Error('Norādi katra starpmērķa nosaukumu.'); return { amountCents: M.cents(line.slice(0, divider).trim()), label }; });
      persist({ ...state, settings: { title: f.title.value, subtitle: f.subtitle.value, goalCents: M.cents(f.goal.value), currency: f.currency.value, startDate: new Date(f.startDate.value).toISOString(), milestones } }); $('settings-dialog').close(); toast('Kampaņa atjaunināta.');
    } catch (error) { e.currentTarget.querySelector('.form-error').textContent = error.message; }
  });
  $('clear-button').addEventListener('click', () => { if (confirm('Dzēst visus šajā pārlūkā saglabātos ziedojumus? Kampaņas iestatījumi paliks.')) { persist({ ...state, source: 'custom', donations: [] }); $('settings-dialog').close(); toast('Ziedojumi dzēsti. Vari pievienot vai importēt jaunus.'); } });
  $('reset-button').addEventListener('click', () => { if (confirm('Aizstāt lokālo kampaņu un ziedojumus ar demonstrācijas datiem?')) { persist(M.demo()); $('settings-dialog').close(); toast('Demonstrācijas dati atjaunoti.'); } });
  $('import-button').addEventListener('click', () => { $('import-form').reset(); openDialog('import-dialog'); });
  $('import-file').addEventListener('change', async e => { const file = e.target.files[0]; if (!file) return; const error = $('import-form').querySelector('.form-error'); error.textContent = ''; if (file.size > 5000000) { error.textContent = 'Izvēlies failu, kas ir mazāks par 5 MB.'; e.target.value = ''; return; } try { $('import-text').value = await file.text(); } catch (_) { error.textContent = 'Failu neizdevās nolasīt.'; } });
  $('import-form').addEventListener('submit', e => { e.preventDefault(); try { const next = M.importData($('import-text').value, state); persist(next); $('import-dialog').close(); const count = M.stats(state).count; toast('Importēti ' + state.donations.length + ' ziedojumi. Šajā kampaņā ieskaitīti ' + count + '.'); } catch (error) { e.currentTarget.querySelector('.form-error').textContent = error.message; } });
  $('export-button').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'afterhours-donations-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  function updateOverlayURL() {
    const url = new URL('donations/overlay/', rootURL); if (location.protocol === 'file:') url.pathname += 'index.html';
    url.searchParams.set('widget', $('overlay-layout').value); if ($('preview-background').checked) url.searchParams.set('preview', '1');
    if (new URLSearchParams(location.search).has('test')) url.searchParams.set('test', '1');
    const snapshot = { ...state, donations: state.donations.slice(0, 50) };
    // Preserve full totals and rankings: never silently truncate a shared snapshot.
    const tooMany = state.donations.length > 50;
    if (!config.apiBaseUrl && !tooMany) url.hash = new URLSearchParams({ data: encodeSnapshot(snapshot) }).toString();
    const tooLong = url.href.length > 28000;
    const problem = !config.apiBaseUrl && (tooMany || tooLong);
    $('overlay-url').value = problem ? '' : url.href; $('open-overlay').href = problem ? '#' : url.href; $('open-overlay').setAttribute('aria-disabled', String(problem)); $('copy-overlay').disabled = problem;
    $('overlay-error').textContent = problem ? 'Datu kopijas adrese atbalsta līdz 50 ziedojumiem un 28 KB. Eksportē datus un izmanto mazāku paraugu vai pievieno kopīgo datu serveri, kas aprakstīts server/README.md.' : '';
    $('overlay-note').textContent = config.apiBaseUrl ? 'Pārklājums izmanto to pašu datu serveri, ko vietne, un saņem atjauninājumus tiešraidē.' : 'Adrese satur pašreizējos datus, tostarp parādītos vārdus un ziņas. OBS izmanto atsevišķu krātuvi: pēc izmaiņām izveido un ielīmē jaunu adresi. Vienā datu kopijā var būt līdz 50 ziedojumiem.';
  }
  function openOverlay() { openDialog('overlay-dialog'); updateOverlayURL(); }
  $('overlay-button').addEventListener('click', openOverlay);
  $('overlay-layout').addEventListener('change', updateOverlayURL); $('preview-background').addEventListener('change', updateOverlayURL);
  $('open-overlay').addEventListener('click', e => { if (e.currentTarget.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
  $('copy-overlay').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('overlay-url').value); toast('Pārklājuma adrese nokopēta.'); } catch (_) { $('overlay-url').select(); toast('Atlasi un nokopē augstāk redzamo adresi.'); } });
  window.addEventListener('storage', e => { if (!config.apiBaseUrl && e.key === storageKey && e.newValue) { try { const previous = new Set(state.donations.map(d => d.id)); state = M.validateState(JSON.parse(e.newValue)); render(); const fresh = state.donations.filter(d => !previous.has(d.id)); if (fresh.length === 1) announce(fresh[0]); } catch (_) { toast('Neizdevās nolasīt paneļa atjauninājumu.'); } } });
  if (overlay && new URLSearchParams(location.search).get('preview') === '1') document.body.classList.add('checkerboard');
  render(); setInterval(render, 60000);
  if (storageWarning) toast(storageWarning);
  if (config.apiBaseUrl) connectBackend();

  async function fetchBackendSnapshot(base, announceFresh) {
    const response = await fetch(base + '/api/dashboard', { signal: AbortSignal.timeout(10000), cache: 'no-store' });
    if (!response.ok) throw new Error('Datu serveris atbildēja ar kodu ' + response.status);
    const previous = new Set(state.donations.map(d => d.id));
    const next = M.validateState(await response.json());
    const fresh = next.donations.filter(d => !previous.has(d.id));
    state = next; connection = 'Datu serveris savienots'; storageWarning = ''; render();
    if (announceFresh && fresh.length === 1) announce(fresh[0]);
  }

  function startBackendPolling(base) {
    clearInterval(backendPollTimer);
    const seconds = Math.min(300, Math.max(10, Number(config.apiPollSeconds) || 15));
    backendPollTimer = setInterval(async () => {
      try { await fetchBackendSnapshot(base, true); }
      catch (error) { connection = 'Atjauno savienojumu · pēdējie zināmie dati'; storageWarning = error.message; render(); }
    }, seconds * 1000);
  }

  async function connectBackend() {
    if (backendConnecting) return;
    backendConnecting = true;
    connection = 'Savienojas ar datu serveri'; render();
    try {
      const url = new URL(config.apiBaseUrl); if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Izmanto datu servera HTTPS adresi.');
      const base = config.apiBaseUrl.replace(/\/$/, '');
      await fetchBackendSnapshot(base, false);
      if (config.apiTransport === 'sse') {
        eventSource?.close();
        eventSource = new EventSource(base + '/api/events');
        eventSource.addEventListener('open', () => { connection = 'Datu serveris savienots'; render(); });
        eventSource.addEventListener('snapshot', e => {
          try { const previous = new Set(state.donations.map(d => d.id)); const next = M.validateState(JSON.parse(e.data)); const fresh = next.donations.filter(d => !previous.has(d.id)); state = next; connection = 'Datu serveris savienots'; render(); if (fresh.length === 1) announce(fresh[0]); }
          catch (_) { connection = 'Nederīgi datu servera dati'; render(); }
        });
        eventSource.addEventListener('error', () => { connection = 'Atjauno savienojumu · pēdējie zināmie dati'; render(); });
      } else startBackendPolling(base);
    } catch (error) {
      connection = 'Datu serveris nav pieejams · lokāls priekšskatījums'; storageWarning = error.message; render();
      setTimeout(connectBackend, 15000);
    } finally { backendConnecting = false; }
  }
})();
