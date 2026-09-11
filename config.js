/* Public settings only. This file is published by GitHub Pages.
 * NEVER put Streamlabs tokens, client secrets, or private API keys here.
 * See server/.env.example and server/README.md for the future backend.
 */
const isLocalPreview = ["localhost", "127.0.0.1"].includes(location.hostname);
const isTestPreview = new URLSearchParams(location.search).has("test");
const productionApiBaseUrl = "https://asv-trips-donations-api.rektopuss.workers.dev";

window.DONO_CONFIG = {
  // The local backend is used only while the site runs from localhost.
  apiBaseUrl: isTestPreview ? "" : isLocalPreview ? "http://localhost:8787" : productionApiBaseUrl,
  // The Node backend supports live SSE; the Cloudflare Worker uses reliable polling.
  apiTransport: isLocalPreview ? "sse" : "poll",
  apiPollSeconds: 15,
  // Display the campaign target at zero while the first live snapshot loads.
  initialGoalCents: 1000000,
  // Add your public Streamlabs tip-page URL, NOT an API token.
  donateUrl: "https://streamlabs.com/rektopuss_official/tip",
  // One-time local reset requested for this prototype. Applied once per browser;
  // later donations survive refreshes. Goal and milestone settings are preserved.
  localResetVersion: "donations-zero-1",
  // One-time translation of the original built-in demo campaign labels.
  localLanguageVersion: "lv-1",
  brand: "AFTERHOURS"
};
