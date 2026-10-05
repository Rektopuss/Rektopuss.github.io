# U-PENE QR landing page

QR destination: https://rektopussmedia.com/upene/

This static page works on GitHub Pages without a backend. Each page opening or refresh independently chooses one of exactly five slots with equal probability; repeat selections are possible. Only that selected video is displayed. There is no video list, next button, or other in-page control for selecting a different slot; reopen or refresh the page to get a new draw. Nothing is stored on the visitor's device. Videos require a tap to play and do not autoplay.

Selection uses the browser's cryptographic random generator when available, with a `Math.random` fallback. The other four videos are hidden from the page interface, but the five IDs are public in `videos.js`. This is an interface restriction, not access control; a static page cannot keep those IDs secret or prevent visitors from opening them directly on YouTube.

## Add the five videos

Edit `videos.js` and replace each empty `id` with the YouTube video ID (11 characters, e.g. the value after `v=` in a YouTube URL). Set each `title` to its display title. Use videos that allow embedding. Empty or invalid IDs show the coming-soon placeholder. All five slots participate in selection, so fill all five before launching if every visitor should receive a playable video.

## Product image

The included `assets/product.png` is a transparent bottle cutout generated using the supplied product photograph as its reference. The generation instructions are saved in `assets/product-prompt.md`. It is referenced directly by `#product-image` in `index.html`.

To use the exact original product photograph, replace `upene/assets/product.png` with that file and update the image's `width` and `height` in `index.html` to match its dimensions. For a different filename or format, also update its `src`.

## Publish

Deploy these files using the repository's existing GitHub Pages workflow. The directory serves `/upene/`; GitHub Pages redirects `/upene` to that URL. Verify the final public URL before printing the QR code.
