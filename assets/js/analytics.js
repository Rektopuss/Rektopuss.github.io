(function (window, document) {
  'use strict';
  if (window.RektopussPrivacy) return;
  const measurementId = 'G-7VD1EYD8FM';
  const disableKey = 'ga-disable-' + measurementId;
  const consentName = 'rektopuss_consent';
  const policyVersion = 1;
  const lifetimeSeconds = 180 * 24 * 60 * 60;
  const root = new URL('../../', document.currentScript.src);
  // One reporting identity per public page; aliases share the same identity.
  const pages = {
    '/': { title: 'Sākumlapa | Rektopuss Media', group: 'Sākumlapa' },
    '/bonusi/': { title: 'Bonusi un atlaides | Rektopuss Media', group: 'Piedāvājumi' },
    '/asv/': { title: 'ASV TRIPS v2 — Ziedojumi | Rektopuss Media', group: 'Ziedojumi' },
    '/smm/': { title: 'Sociālo tīklu pārvaldība un video saturs | Rektopuss Media', group: 'Pakalpojumi' },
    '/smm/paldies/': { title: 'Paldies par ziņu | Rektopuss Media', group: 'Pakalpojumi' },
    '/3x3/': { title: '3x3 hokeja turnīrs — Pieteikšanās | Rektopuss Media', group: 'Turnīri' },
    '/turnirs/': { title: '3x3 hokeja turnīrs — Rezultāti | Rektopuss Media', group: 'Turnīri' },
    '/turnirs/schedule.html': { title: '3x3 hokeja turnīrs — Spēļu grafiks | Rektopuss Media', group: 'Turnīri' },
    '/giveaway/': { title: 'Skaties un laimē — Balvas | Rektopuss Media', group: 'Piedāvājumi' },
    '/watchmewin/': { title: 'WatchMeWin — Pāreja uz partnera lapu | Rektopuss Media', group: 'Piedāvājumi' }
  };
  function reportingPath(pathname) {
    let path = pathname.replace(/\/index\.html$/, '/');
    if (!path.endsWith('/') && !path.split('/').pop().includes('.')) path += '/';
    return path === '/donations/' ? '/asv/' : path;
  }
  const pagePath = reportingPath(window.location.pathname);
  const page = pages[pagePath];
  // Curated labels only: never derive Analytics values from user-entered text or URLs.
  const clickActions = {
    open_bonuses: 'Bonusi un atlaides', open_usa_campaign: 'Atvērt ASV ziedojumu kampaņu',
    home: 'Atgriezties sākumlapā',
    social_telegram: 'Telegram', social_youtube: 'YouTube', social_tiktok: 'TikTok',
    social_twitch: 'Twitch', social_kick: 'Kick', social_instagram: 'Instagram',
    social_facebook: 'Facebook', social_wikipedia: 'Vikipēdija',
    offer_ekocope: 'EKOCOPE piedāvājums', offer_watchmewin: 'WatchMeWin piedāvājums',
    offer_temu: 'Temu piedāvājums', watchmewin_terms: 'WatchMeWin vispārīgie noteikumi',
    watchmewin_bonus_terms: 'WatchMeWin bonusu noteikumi', bonus_details: 'Skatīt bonusa noteikumus',
    responsible_gambling: 'Atbildīgas spēles informācija',
    donate: 'Atvērt ziedošanu Streamlabs', donation_alternative: 'Skatīt alternatīvu atbalsta veidu',
    donation_partner_register: 'Atvērt atbalsta partnera reģistrāciju', previous_usa_videos: 'Skatīties iepriekšējo ASV braucienu',
    contact_section: 'Sākt sadarbību / sazināties', services_section: 'Skatīt pakalpojumus',
    clients_section: 'Skatīt klientus', studio_section: 'Skatīt studiju un aprīkojumu',
    contact_email: 'Sazināties e-pastā', contact_send_click: 'Nosūtīt ziņu — pogas klikšķis',
    back_to_services: 'Atgriezties pakalpojumu lapā', menu_toggle: 'Pārslēgt izvēlni',
    logo_motion_toggle: 'Pārslēgt logo animāciju', service_details: 'Atvērt vai aizvērt pakalpojuma aprakstu',
    service_planning: 'Pakalpojums — Plānošana un konsultēšana', service_video: 'Pakalpojums — Filmēšana un montāža',
    service_social: 'Pakalpojums — Sociālo tīklu pārvaldība', service_studio: 'Pakalpojums — Studija un tehnika',
    service_influencers: 'Pakalpojums — Influenceru mārketings', service_brand_faces: 'Pakalpojums — Zīmola sejas',
    schedule_reset: 'Atiestatīt spēļu grafika filtrus',
    giveaway_casino: 'Balvu akcija — kazino piedāvājums', giveaway_sports: 'Balvu akcija — sporta piedāvājums',
    giveaway_video: 'Skatīties balvu akcijas video', partner_redirect: 'Turpināt uz WatchMeWin'
  };
  const trackingEnabled = document.currentScript.dataset.analytics !== 'off' && Boolean(page) &&
    !new URLSearchParams(window.location.search).has('test');
  const production = ['rektopussmedia.com', 'www.rektopussmedia.com'].includes(window.location.hostname);
  const cookieDomain = production ? '; Domain=rektopussmedia.com' : '';
  const cookieSecurity = window.location.protocol === 'https:' ? '; Secure' : '';
  let consent = null, memoryOnly = false, analyticsStarted = false, banner, status, returnFocus, policyDialog, policyFocus;
  window[disableKey] = true;

  function reportingReferrer() {
    try {
      if (!document.referrer) return '';
      const referrer = new URL(document.referrer);
      if (!['https:', 'http:'].includes(referrer.protocol)) return '';
      if (['rektopussmedia.com', 'www.rektopussmedia.com'].includes(referrer.hostname)) {
        const path = reportingPath(referrer.pathname);
        return 'https://rektopussmedia.com' + (pages[path] ? path : '/');
      }
      // External paths can contain private data; the origin preserves referral attribution.
      return referrer.origin + '/';
    } catch (_) { return ''; }
  }

  function campaignParameters() {
    const query = new URLSearchParams(window.location.search);
    const fields = {
      utm_id: 'campaign_id', utm_source: 'campaign_source', utm_medium: 'campaign_medium',
      utm_campaign: 'campaign_name', utm_term: 'campaign_term', utm_content: 'campaign_content'
    };
    const campaign = {};
    Object.entries(fields).forEach(([parameter, field]) => {
      const value = (query.get(parameter) || '').trim();
      // Campaign labels only: omit control characters, email-like values and oversized input.
      if (!value || value.length > 100 || /[\u0000-\u001f\u007f@]/.test(value)) return;
      campaign[field] = ['utm_source', 'utm_medium'].includes(parameter) ? value.toLowerCase() : value;
    });
    return campaign;
  }

  function trackButtonClick(event) {
    const element = event.target.closest && event.target.closest('[data-analytics-action]');
    if (!element || element.closest('.privacy-links,.privacy-consent,.privacy-policy,[inert]') ||
        element.disabled || element.getAttribute('aria-disabled') === 'true') return;
    const action = element.dataset.analyticsAction;
    if (!Object.prototype.hasOwnProperty.call(clickActions, action)) return;
    syncConsent();
    if (!trackingEnabled || !production || !consent || !consent.analytics ||
        window[disableKey] || typeof window.gtag !== 'function') return;
    window.gtag('event', 'button_click', {
      send_to: measurementId,
      button_id: action,
      button_label: clickActions[action],
      page_title: page.title,
      page_location: 'https://rektopussmedia.com' + pagePath,
      content_group: page.group
    });
  }

  function validConsent(value) {
    const now = Date.now();
    return value && value.version === policyVersion && typeof value.analytics === 'boolean' &&
      Number.isFinite(value.savedAt) && value.savedAt <= now && now - value.savedAt < lifetimeSeconds * 1000
      ? value : null;
  }

  function readConsent() {
    // Direct file previews may reject cookies while still supporting localStorage.
    // Live domains keep the shared cookie authoritative for www/apex withdrawal.
    if (!production) {
      try {
        const stored = window.localStorage.getItem(consentName);
        if (stored !== null) return validConsent(JSON.parse(stored));
      } catch (_) { /* Fall back to cookies when browser storage is unavailable. */ }
    }
    try {
      const entry = document.cookie.split('; ').find(item => item.startsWith(consentName + '='));
      if (!entry) return null;
      return validConsent(JSON.parse(decodeURIComponent(entry.slice(consentName.length + 1))));
    } catch (_) { return null; }
  }

  function clearAnalyticsCookies() {
    let names;
    try { names = document.cookie.split(';').map(item => item.trim().split('=')[0]); }
    catch (_) { return; }
    const domains = ['', window.location.hostname];
    if (production) domains.push('rektopussmedia.com');
    const paths = new Set(['/']);
    const segments = window.location.pathname.split('/').filter(Boolean);
    for (let i = 1; i <= segments.length; i++) {
      const path = '/' + segments.slice(0, i).join('/');
      paths.add(path); paths.add(path + '/');
    }
    names.filter(name => /^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl_)/.test(name)).forEach(name => {
      domains.forEach(domain => paths.forEach(path => {
        try {
          document.cookie = name + '=; Max-Age=0; Path=' + path +
            (domain ? '; Domain=' + domain : '') + '; SameSite=Lax' + cookieSecurity;
        } catch (_) { /* Cookie access can be disabled by the browser. */ }
      }));
    });
  }

  function startAnalytics() {
    // Previews never send visits to the live Analytics property.
    if (!trackingEnabled || !production || !['https:', 'http:'].includes(window.location.protocol)) return;
    window[disableKey] = false;
    if (analyticsStarted) return;
    analyticsStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    // Basic consent mode: no Google script or cookieless pings before an opt-in.
    window.gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: lifetimeSeconds,
      cookie_update: false,
      cookie_domain: 'rektopussmedia.com',
      cookie_flags: 'SameSite=Lax;Secure',
      page_title: page.title,
      content_group: page.group,
      // Stable host/path prevent duplicate rows from www, index.html and the donations alias.
      page_location: 'https://rektopussmedia.com' + pagePath,
      page_referrer: reportingReferrer(),
      // Preserve campaign attribution without putting arbitrary queries into page reports.
      ...campaignParameters()
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    script.onload = function () {
      if (!consent || !consent.analytics) clearAnalyticsCookies();
    };
    document.head.appendChild(script);
  }

  function applyConsent() {
    if (consent && consent.analytics) startAnalytics();
    else {
      // Google's opt-out flag also blocks subsequent measurement on loaded pages.
      window[disableKey] = true;
      clearAnalyticsCookies();
    }
    if (banner) {
      banner.querySelector('[data-privacy-current]').textContent = consent
        ? 'Pašreizējā izvēle: ' + (consent.analytics ? 'analītika atļauta.' : 'tikai nepieciešamās sīkdatnes.')
        : '';
      banner.querySelector('[data-privacy-close]').hidden = !consent;
    }
  }

  function closeBanner() {
    banner.hidden = true;
    if (returnFocus && returnFocus.isConnected) returnFocus.focus();
    else {
      const settings = document.querySelector('[data-privacy-settings]');
      if (settings && banner.contains(document.activeElement)) settings.focus();
    }
  }

  function saveChoice(analytics) {
    consent = { version: policyVersion, analytics, savedAt: Date.now() };
    if (!production) {
      try { window.localStorage.setItem(consentName, JSON.stringify(consent)); }
      catch (_) { /* Try cookies independently below. */ }
    }
    try {
      document.cookie = consentName + '=' + encodeURIComponent(JSON.stringify(consent)) +
        '; Max-Age=' + lifetimeSeconds + '; Path=/; SameSite=Lax' + cookieDomain + cookieSecurity;
    } catch (_) { /* Local previews can still persist through localStorage. */ }
    const saved = readConsent();
    memoryOnly = !saved || saved.savedAt !== consent.savedAt || saved.analytics !== analytics;
    applyConsent();
    closeBanner();
    status.textContent = (analytics ? 'Analītika atļauta.' : 'Analītika izslēgta.') +
      (memoryOnly ? ' Pārlūks neļauj saglabāt izvēli. Tā attiecas tikai uz šo atvērto lapu.' : ' Sīkdatņu izvēle saglabāta.');
  }

  function openSettings(trigger) {
    if (!banner) return;
    const settingsReturn = policyDialog.open ? policyFocus : (trigger || document.activeElement);
    if (policyDialog.open) { policyFocus = null; policyDialog.close(); }
    returnFocus = settingsReturn;
    if (policyDialog.contains(returnFocus)) returnFocus = document.querySelector('.privacy-links [data-privacy-settings]');
    applyConsent();
    banner.hidden = false;
    banner.querySelector('h2').focus();
  }

  function syncConsent() {
    const next = memoryOnly && consent && Date.now() - consent.savedAt < lifetimeSeconds * 1000
      ? consent : readConsent();
    if (JSON.stringify(next) === JSON.stringify(consent)) return;
    consent = next;
    memoryOnly = false;
    applyConsent();
    if (banner) banner.hidden = Boolean(consent) || !trackingEnabled;
  }

  function openPolicy(name, trigger) {
    const policy = window.RektopussPolicies && window.RektopussPolicies[name];
    if (!policy || !policyDialog) return;
    if (!policyDialog.open) policyFocus = trigger || document.activeElement;
    policyDialog.querySelector('#privacy-policy-title').textContent = policy.title;
    const content = policyDialog.querySelector('.privacy-policy-content');
    content.innerHTML = policy.html;
    content.scrollTop = 0;
    if (!policyDialog.open) policyDialog.showModal();
    policyDialog.querySelector('[data-policy-close]').focus();
  }

  function initUI() {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('assets/css/privacy.css', root).href;
    if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href === stylesheet.href)) document.head.appendChild(stylesheet);
    banner = document.createElement('section');
    banner.className = 'privacy-consent';
    banner.setAttribute('aria-labelledby', 'privacy-consent-title');
    banner.setAttribute('lang', 'lv');
    banner.hidden = Boolean(consent) || !trackingEnabled;
    banner.innerHTML = '<div class="privacy-consent-copy"><h2 id="privacy-consent-title" tabindex="-1">Sīkdatnes</h2>' +
      '<p>Ar jūsu atļauju izmantojam Google Analytics apmeklējumu statistikai.</p>' +
      '<p class="privacy-current" data-privacy-current></p>' +
      '<p class="privacy-consent-details">' +
      '<button type="button" class="privacy-text-button" data-privacy-policy="cookies">Sīkdatņu politika</button> · ' +
      '<button type="button" class="privacy-text-button" data-privacy-policy="privacy">Privātuma politika</button></p></div>' +
      '<div class="privacy-consent-actions"><button type="button" data-privacy-reject>Tikai nepieciešamās</button>' +
      '<button type="button" data-privacy-accept>Atļaut</button></div>' +
      '<button type="button" class="privacy-close" data-privacy-close aria-label="Aizvērt sīkdatņu iestatījumus">×</button>';
    document.body.appendChild(banner);
    policyDialog = document.createElement('dialog');
    policyDialog.className = 'privacy-policy';
    policyDialog.setAttribute('lang', 'lv');
    policyDialog.setAttribute('aria-labelledby', 'privacy-policy-title');
    policyDialog.innerHTML = '<div class="privacy-policy-header"><h2 id="privacy-policy-title"></h2>' +
      '<button type="button" data-policy-close aria-label="Aizvērt politiku">×</button></div>' +
      '<div class="privacy-policy-content"></div>';
    document.body.appendChild(policyDialog);
    policyDialog.querySelector('[data-policy-close]').addEventListener('click', () => policyDialog.close());
    policyDialog.addEventListener('close', () => {
      if (policyFocus && policyFocus.isConnected) policyFocus.focus();
    });
    policyDialog.addEventListener('click', event => {
      if (event.target !== policyDialog) return;
      const bounds = policyDialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) policyDialog.close();
    });
    status = document.createElement('p');
    status.className = 'privacy-sr-only';
    status.setAttribute('role', 'status');
    document.body.appendChild(status);
    document.querySelectorAll('[data-privacy-settings],[data-privacy-policy]').forEach(button => { button.hidden = false; });
    document.querySelectorAll('[data-privacy-policy]').forEach(button => { button.setAttribute('aria-haspopup', 'dialog'); });
    document.addEventListener('click', function (event) {
      const settings = event.target.closest('[data-privacy-settings]');
      if (settings) { event.preventDefault(); openSettings(settings); }
      const policy = event.target.closest('[data-privacy-policy]');
      if (policy) { event.preventDefault(); openPolicy(policy.dataset.privacyPolicy, policy); }
    });
    banner.querySelector('[data-privacy-reject]').addEventListener('click', () => saveChoice(false));
    banner.querySelector('[data-privacy-accept]').addEventListener('click', () => saveChoice(true));
    banner.querySelector('[data-privacy-close]').addEventListener('click', closeBanner);
    banner.addEventListener('keydown', event => {
      if (event.key === 'Escape' && consent) closeBanner();
    });
    applyConsent();
  }

  consent = readConsent();
  applyConsent();
  window.RektopussPrivacy = { openSettings, openPolicy };
  // Delegation includes buttons rendered later by the donation dashboard; capture precedes navigation.
  document.addEventListener('click', trackButtonClick, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI, { once: true });
  else initUI();
  // Share choices across www/apex and respect changes in other open tabs and expiry.
  window.setInterval(syncConsent, 1000);
  window.addEventListener('pageshow', syncConsent);
  window.addEventListener('storage', event => {
    if (!production && (event.key === consentName || event.key === null)) syncConsent();
  });
  document.addEventListener('visibilitychange', syncConsent);
})(window, document);
