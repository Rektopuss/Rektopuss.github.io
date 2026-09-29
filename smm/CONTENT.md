# SMM landing page — dark technical direction

Route: `/smm/`. Static HTML/CSS with a small menu script. Latvian copy, black background, electric violet accents, condensed straight type, minimal text. Locally hosted Barlow Condensed (OFL license in `assets/fonts/OFL.txt`); no external font requests or build dependencies.

## Images needed

- **Team cutout:** `assets/images/team-mockup.png` is the original AI-generated, transparent 1536 × 1024 PNG showing three fictional men and three fictional women with content production equipment. Its alt text identifies it as a visualization. The page serves transparent `team-mockup-768.webp` (108,966 bytes) and `team-mockup-1536.webp` (338,582 bytes) using responsive `srcset` and `sizes`, saving 87–96% compared with the original 2,533,132-byte PNG. CSS fades the waist into the page background. Replace these with an approved real team cutout when available; retain `.team-cutout`, descriptive alt text, and correct intrinsic dimensions. Light, rings, and viewfinder marks remain separate from the photo. Generation details are in `assets/images/team-mockup-prompt.md`.
- **Company logos:** the user-requested collaborations are Dvoretsky Distillery, Temu, BAVA autoskola, Ekocope.lv, Morex, Čiekurkalna lofti, LVBET, and Vapify, in that order. Transparent PNG/SVG logos are hosted locally in `assets/clients/`; source links and asset notes are recorded in `assets/clients/SOURCES.md`. Add or remove `.partner-logo` list items in the original `.logo-group` only. The script creates the inaccessible duplicates needed for a seamless loop automatically.
- **Studio gallery:** five fictional, photorealistic scenes generated with built-in imagegen: cameras/lights/microphones on a table, podcast room, green-screen studio, streaming workstation, and outdoor filming. Images are stored in `assets/studio/` as responsive 640 × 480 and 1280 × 960 WebP files, with lazy loading and descriptive Latvian alt text identifying them as visualizations. Full prompts and output names are in `assets/studio/PROMPTS.md`. These are mockups, not photographs of actual premises or equipment. Replace both image sizes with real photos when available; update the alt text and intrinsic dimensions accordingly. Keep each `.studio-card` figure, caption, and `data-title`. Add or remove whole figures—the controls/count update automatically. The central card is prominent, and neighboring cards sit lower, tilted behind it.

Keep the image treatment integrated: hero cutout, a slim logo strip with fading edges, and a layered studio photo stack. Give real images descriptive alt text and intrinsic dimensions.

## Content still to confirm

- Additional collaborations and any case-study details or results. The eight requested logos are present; no project outcomes are claimed.
- The contact form asks for a required email address and enquiry text, plus an optional phone number. It posts directly to FormSubmit for delivery to the confirmed business email, `rektopuss.business@gmail.com`. Instagram and the `mailto:` link remain available below the form.
- Optional studio address and equipment models. Copy uses only confirmed equipment categories.

## Search and analytics

Canonical URL: `https://rektopussmedia.com/smm/`. The root sitemap includes this URL, and the homepage links to it under services for businesses. `robots.txt` already allows crawling and points to the sitemap.

The page includes a service-specific Latvian title and description, Open Graph and Twitter preview metadata using the existing brand banner, and JSON-LD for the organization, page, and six services in an offer catalog. Keep visible service descriptions and structured data consistent. Only confirmed business details are included; add an address, service area, prices, or customer results when those details are approved. Placeholder gallery content uses `data-nosnippet`; remove that attribute when the placeholders are replaced with real content suitable for search snippets.

Analytics uses the shared `../assets/js/analytics.js` loader and GA4 property `G-7VD1EYD8FM`, matching the rest of the site. The loader intentionally excludes localhost and file previews. Its configuration was checked without sending live test hits. After deployment, verify `/smm/` page views in GA4 Realtime and inspect the canonical URL in Search Console; receipt of live Analytics data and Google indexing cannot be established from a local preview.

Local checks: metadata and JSON parsing, structured-data references, image and script paths, internal anchors, sitemap XML, one Analytics loader, production versus local Analytics initialization, and browser layouts at 320, 390, 768, 1024, and 1440 pixels. No browser JavaScript errors or horizontal page overflow were found.

Reference: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization), and [GA4 page views](https://developers.google.com/analytics/devguides/collection/ga4/views).

## Behavior

The benefits section uses a compact editorial layout: an introductory heading beside six benefits with violet SVG line icons and thin dividers. In display order, the icons represent specialists (team), equipment and software (camera), an agreed workload (adjustment sliders), staffing (person with a minus), holidays (umbrella), and payroll taxes and sick leave (checked document). Icons are decorative and hidden from assistive technology; each benefit has a visible heading. The benefit grid changes from three columns to two on phones; all copy remains visible without interaction.

Native expandable service descriptions. Mobile navigation works without JavaScript and gains a toggle with JavaScript. Keyboard focus, skip navigation, and reduced motion supported. Styles only load on `/smm/`.

The logo strip scrolls continuously right to left at 32 px/second. It pauses on hover, keyboard focus, or via the small pause button. Reduced-motion preferences disable the animation and provide a manually scrollable single list, as does the no-JavaScript fallback. Duplicate groups are hidden from assistive technology.

The studio stack wraps in both directions and supports touch swipes, mouse drags, clicking the exposed neighboring cards, and Left/Right/Home/End keys. Navigation is manual, with no automatic rotation or visible control row. Without JavaScript, all photos remain available in a horizontally scrollable strip. Only the active slide is exposed to screen readers during enhanced navigation; changes are announced. Reduced-motion preferences disable transitions.

The contact form uses a native HTML POST to `https://api.web3forms.com/submit`, so it works without JavaScript on a web server. Its public Web3Forms access key is linked to `rektopuss.business@gmail.com`. The script sets the absolute `redirect` URL to the current origin for local previews; the HTML value provides a production fallback without JavaScript. Successful submissions redirect to `/smm/paldies/`, which is excluded from search indexing. The form uses Web3Forms' `botcheck` honeypot and links to its privacy policy beside the submit button. After deployment, submit one enquiry and verify that the business inbox receives it; live delivery cannot be confirmed from a local preview. See [Web3Forms installation](https://docs.web3forms.com/getting-started/installation) and [privacy policy](https://web3forms.com/privacy).
