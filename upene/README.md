# U-PENE store locator

QR destination: https://rektopussmedia.com/upene/

This static page works on GitHub Pages without a backend or a map API key. It displays 81 locations: all 72 AlkOutlet stores, all eight locations in the Spirits & Wine directory, and Hidden Bottles in Old Riga, on a Leaflet map with OpenStreetMap tiles, plus a permanent address list and Google Maps directions links. The bottle image and original branding are retained.

Selecting a store in the list zooms to its custom teardrop marker and opens its address popup. The pin uses an outlined serif U inspired by the bottle label, saved in `assets/store-pin.svg`. The list shows three complete rows at a time and scrolls to additional stores; it also supports keyboard scrolling. “Rādīt visus” restores the view of all stores. Mouse-wheel zoom is disabled so the map does not interrupt page scrolling. The addresses and directions work without JavaScript and if the map provider is unavailable. No visitor location is requested.

The age gate saves a “Jā” confirmation in localStorage under `upene-age-confirmation` for 24 hours from the click. Returning visits within that period reveal the content and map automatically without extending the expiry. Expired, invalid, or future-dated confirmations require a fresh answer. A “Nē” answer is never saved. If storage is blocked, the current visit still works and the next visit asks again. This age confirmation is separate from analytics consent.

Google Analytics uses the shared site's opt-in controls: no Google Analytics script loads until analytics is accepted or a valid saved acceptance exists. The cookie banner appears after the age dialog is dismissed when no choice is saved. Visitors can reject or withdraw through “Sīkdatņu iestatījumi”. The analytics choice lasts 180 days; confirming age never grants analytics consent. See `../docs/analytics.md` for reporting and verification details.

## Store data

The `.store-list` in `index.html` is the source of store data. Each list item holds `data-lat` and `data-lng`, the branch name, address, and directions link. `store-map.js` builds markers and popups from those entries. To add a location, copy a list item and update its coordinates, labels, visible number, and directions destination; also update the count in `.store-top`.

Set `data-retailer` on each list item so the marker title and popup use the correct shop name. Without this attribute, only the displayed shop name is used; no retailer is assumed.

All 72 enabled AlkOutlet stores were added on 2026-11-25 from the [official store directory](https://alkoutlet.lv/musu-veikali) and its [public map data](https://alkoutlet.lv/stores/get). Addresses and coordinates come directly from that data, with whitespace normalized. Visible addresses omit postal codes and administrative districts to fit the list; directions retain the full published address. The AlkOutlet entries follow the original nine locations, sorted by branch name using Latvian collation. XL branches are labeled accordingly. This is a static snapshot; it does not make a runtime request to AlkOutlet or confirm product inventory.

Spirits & Wine branches and addresses were checked on 2026-11-03 against the [official retailer directory](https://www.spiritsandwine.lv/lv/contacts):

- Andrejosta — Andrejostas iela 5, Rīga.
- Spice Life — Jaunmoku iela 13, Rīga.
- Domina — Ieriķu iela 3, Rīga.
- Teika Plaza — Brīvības gatve 201, Rīga.
- Sāga — Biķeru iela 4, Ulbroka.
- Via Jurmala Outlet — Jaunā iela 12, Piņķi.
- A7 — Džutas, Krustkalni, Ķekavas pagasts.
- Internetveikals — Buļļu iela 47A, Rīga.

Hidden Bottles (formerly Kolekcija Dzērieni) was added at Jēkaba iela 3/5, Vecrīga, Rīga. Address verified against the [shop's own website](https://www.kolekcijadzerieni.lv/news/params/post/5198255/lectures--tastings-of-latvian-spirits), with the current name confirmed by its [business listing](https://www.tripadvisor.com/Attraction_Review-g274967-d34667283-Reviews-The_Hidden_Bottles-Riga_Riga_Region.html). Building coordinates come from the [Jēkaba iela 3/5 address directory](https://www.lursoft.lv/adrese/jekaba-iela-3/5-riga-lv-1050/uznemumi).

Buļļu iela 47A is explicitly labeled as the internet store. All locations, including branches outside Riga, are included. Pins indicate the store building or shopping centre, not an exact entrance. Building coordinates were cross-checked using [Andrejosta](https://lv.near-place.com/spiritswine-andrejostas-iela-5-riga/da), [Spice Life](https://yandex.com/maps/11474/riga/house/Zk0YdgRpSkEPQFtsfXVycH9jbA%3D%3D/), [Domina](https://lv.geoview.info/domina_shopping%2C20037953112w), [Teika Plaza](https://postmapia.com/en/latvia/riga/riga/klientu-centrs-teika-plaza), [Sāga shopping centre](https://nsking.lv/amlocator/index/ajax/), [Via Jurmala Outlet](https://latvia.worldplaces.me/review/94690466-via-jurmala-outlet-village.html), [A7](https://mapcarta.com/W220039366), and [Buļļu iela 47A](https://www.lursoft.lv/adrese/bullu-iela-47a-riga-lv-1067). Directions use the store name and street address. Product stock and opening hours are not live; the page links to the retailer's contacts to check availability.

Leaflet 1.9.4 CSS/JS load from unpkg with integrity hashes. Map tiles load from OpenStreetMap with visible attribution. Keep that attribution and review the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) if traffic grows substantially.

The previous video files (`videos.js` and `script.js`) are preserved but no longer loaded by the page.

## Creator logos

The “Radīts kopā” section highlights the two product creators with links to their websites. Rektopuss Media uses the existing repository asset `../assets/images/branding/rektopuss.png`. Dvoretsky Distillery uses `assets/dvoretsky-logo.png`, downloaded from the [official website's logo asset](https://dvoretsky.eu/wp-content/uploads/2019/12/dvoretsky-full-b.png). Both logos are displayed in monochrome to fit the page's light background; the original image files are preserved. The section adapts to mobile and the large-screen layout.

## Product image

The included `assets/product.png` is a transparent bottle cutout generated using the supplied product photograph as its reference. The generation instructions are saved in `assets/product-prompt.md`. It is referenced directly by `#product-image` in `index.html`.

To use the exact original product photograph, replace `upene/assets/product.png` with that file and update the image's `width` and `height` in `index.html` to match its dimensions. For a different filename or format, also update its `src`.

## Publish

Deploy these files using the repository's existing GitHub Pages workflow. The directory serves `/upene/`; GitHub Pages redirects `/upene` to that URL. Verify the final public URL before printing the QR code.
