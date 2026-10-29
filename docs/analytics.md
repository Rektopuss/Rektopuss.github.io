# Analytics reporting

The shared `assets/js/analytics.js` sends page views to `G-7VD1EYD8FM` only after consent, on the production domains. Page titles, content groups and canonical reporting URLs are explicit, rather than inferred from inconsistent legacy titles.

| Reporting path | Page label (followed by “\| Rektopuss Media”) | Content group |
| --- | --- | --- |
| `/` | Sākumlapa | Sākumlapa |
| `/bonusi/` | Bonusi un atlaides | Piedāvājumi |
| `/asv/` | ASV TRIPS v2 — Ziedojumi | Ziedojumi |
| `/smm/` | Sociālo tīklu pārvaldība un video saturs | Pakalpojumi |
| `/smm/paldies/` | Paldies par ziņu | Pakalpojumi |
| `/3x3/` | 3x3 hokeja turnīrs — Pieteikšanās | Turnīri |
| `/turnirs/` | 3x3 hokeja turnīrs — Rezultāti | Turnīri |
| `/turnirs/schedule.html` | 3x3 hokeja turnīrs — Spēļu grafiks | Turnīri |
| `/giveaway/` | Skaties un laimē — Balvas | Piedāvājumi |
| `/watchmewin/` | WatchMeWin — Pāreja uz partnera lapu | Piedāvājumi |

`www`, directory URLs and `index.html` variants report under `https://rektopussmedia.com`. `/donations/` is the same campaign as `/asv/` and reports under `/asv/`. This normalization changes reporting, without redirecting visitors.

Known internal referrers preserve their normalized page path. External referrers retain the origin only. Page URLs exclude queries and fragments. Standard UTM labels are passed separately using Google's `campaign_*` fields, with source/medium lowercased; arbitrary parameters are excluded. Use campaign labels, never personal information, in UTM values.

Local previews, `?test` campaign previews, OBS overlays, the tournament admin and U-PENE are untracked. U-PENE already had Analytics disabled; this change does not enable it. Unknown routes require a deliberate entry in the reporting map.

There is one automatic page view per tag initialization, with no additional manual page-view call. Policy dialogs and consent controls do not generate page views. Google's automatically collected/enhanced-measurement event names are managed by Google and the property's settings. No new lead, purchase or donation-completion events are asserted: a thank-you page visit or an outbound payment click alone does not verify a transaction.

## Button and link clicks

Functional actions are explicitly annotated with `data-analytics-action`. A shared capture listener records `button_click` only while consent is valid, on tracked production pages. It works for keyboard activation, nested icons and buttons rendered later by the donation dashboard. It does not delay or change navigation.

Event parameters:

| Parameter | Meaning |
| --- | --- |
| `button_id` | Stable action ID, e.g. `open_usa_campaign`, `social_instagram`, `donate` |
| `button_label` | Curated Latvian label, e.g. “Atvērt ASV ziedojumu kampaņu” |
| `page_title`, `page_location`, `content_group` | The page's standard reporting identity |

Coverage includes the home-page cards and social links, partner offers and bonus rules, donation buttons and campaign video links, SMM navigation/contact buttons and service descriptions, giveaway links, the partner redirect fallback, and the schedule reset button. Each SMM service has its own action ID. Pages with Analytics disabled remain untracked. The registration form inside Google's cross-origin iframe cannot be observed by this page's click listener. Inert placeholder/share controls and donation-dashboard administration tools are not annotated.

Privacy/consent controls are excluded. Events do not copy visible button text, form values, donor records, email addresses or target URLs; only allowlisted action labels are sent. A send-message click is an attempt, and a donation click opens the payment page; neither is counted as a completed lead/payment.

In GA Admin → Data display → Custom definitions, create **event-scoped** dimensions for `button_id` (“Pogas ID”) and `button_label` (“Pogas nosaukums”). Then filter an Exploration to `Event name = button_click`, use Page title and Pogas nosaukums as rows, and Event count as the metric. This account-level step has not been performed. Google may also emit its own outbound `click` events through Enhanced Measurement; use `button_click` alone for this breakdown rather than adding both event counts together.

## Verification and limits

Run `node --test tests/privacy.test.cjs` with `jsdom` available. Tests cover every tracked document, consent, aliases, referrals, campaign attribution and preview exclusions.

These changes apply to future collection after deployment. Previously recorded titles/URLs are not rewritten. The live dashboard, Enhanced Measurement settings, key events, filters and any account-level event transformations were not accessible during this source review. Validate the deployed changes in GA DebugView/Realtime with consent granted.

WatchMeWin immediately redirects externally, so a page-view request can be lost during navigation; it must not be treated as a guaranteed partner conversion. Retention settings are also controlled in the Analytics account.

References: [Google's page-view guide](https://developers.google.com/analytics/devguides/collection/ga4/views), [configuration fields](https://developers.google.com/analytics/devguides/collection/ga4/reference/config).
