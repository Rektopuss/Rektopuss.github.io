(function (window, document) {
  'use strict';
  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
  if (!['http:', 'https:'].includes(window.location.protocol) || localHosts.has(window.location.hostname)) return;

  const measurementId = 'G-7VD1EYD8FM';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
  document.head.appendChild(script);
})(window, document);
