# JINX — What survives us

A responsive, single-page reading experience for **JINX**, an original dark science-fiction story set primarily in California from 2165 to 2180.

**Content advisory:** graphic violence, blood imagery, mass death, and grief. The archive hides plot explanations by default; opening a chapter displays the full, unabridged story.

## Website

- Cover-first book reader with animated 3D opening and page turns, chapter navigation, adjustable text size, saved position, and explicit read markers.
- Complete English, Telugu, Hindi, and Spanish editions, with downloadable EPUB and PDF books using the JINX cover.
- Searchable character explorer, including the distinction between original people, counterparts, AI, and Egon's identities.
- An interactive five-ship mission map and Earth-reference timeline.
- Six original animated key moments with scene scrubbing, spoiler protection, and direct chapter entry.
- A clearly labeled [REDOVERSE](https://unigalactix.github.io/REDOVERSE/) companion-world reference in the REDO section.
- A spoiler-gated REDO Volume 1 preview: the post-awakening discovery of four moons and two suns, with Part 1 **Rage of Rak** and Part 2 **Wrath of God (Theo)**.
- Emotion and gore/violence/peril charts parsed directly from the tables in [SOT.md](SOT.md), rather than a second hard-coded set of ratings.
- A plot-spoiler switch, keyboard-accessible controls, reduced-motion support, and mobile layouts.
- No runtime frameworks, trackers, third-party scripts, remote translation calls, or required server-side code. Fonts and book downloads are self-hosted. Development dependencies are used only to regenerate the downloadable books and run browser tests.

## Deploy with GitHub Pages from a branch

The site is designed for **https://unigalactix.github.io/JINX/**.

1. Push this repository to `Unigalactix/JINX` on the `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **main** and **/ (root)**, then **Save**.
5. Wait for the Pages deployment to finish and open the URL shown in Settings.

Keep [index.html](index.html), [assets](assets), [Story](Story), [SOT.md](SOT.md), and [.nojekyll](.nojekyll) at their current paths. The empty `.nojekyll` file bypasses Jekyll so that the Markdown reference remains available at its original URL.

All production asset and content URLs are relative. The site works under `/JINX/` as well as at a domain root; no custom domain or Actions workflow is required.

**Publication note:** deploying this repository publishes the story and its full reference, including spoilers. The spoiler switch is a reading preference, not access control. Do not add private notes, credentials, or material you do not intend to publish.

## Book cover

The standalone book cover reads **JINX - A Rajesh Kodaganti's Migration**. Its 1600 x 2400 portrait composition adapts the website hero's cracked moon, orbital ellipse, stars, curved horizon, ivory typography, and coral accent.

- [PNG cover](assets/jinx-book-cover.png): ready-to-use image with the typography preserved.
- [SVG cover](assets/jinx-book-cover.svg): scalable, editable artwork with no external assets. It uses the website's system-font families; font appearance can vary by device.

Preview it at **http://127.0.0.1:4173/assets/jinx-book-cover.svg** with the local server running. This is a front-cover design, not a print-ready wraparound jacket with a spine or bleed.

## Reading and downloading the book

**Begin the story** opens the cover. Click the cover or **Open book** to turn it open; **Next page**, **Previous page**, the left/right arrow keys, Page Up/Page Down, and horizontal touch swipes turn individual pages. The chapter menu jumps to a chapter with the same page-turn animation. **Back to cover** keeps your current reading place.

The reader measures text against the available page area, splitting long paragraphs at word boundaries without dropping text. Resizing the window or changing text size repaginates around the current paragraph. Mobile uses the same single-page reader. Each turn animates a physical leaf around its spine for 720 ms; the operating system's reduced-motion preference replaces the 3D rotation with a brief 120 ms fade.

Use the language menu for **English**, **తెలుగు**, **हिन्दी**, or **Español**. Language changes retain the current chapter and nearby paragraph. English is loaded from the original chapter files; the three translations are stored in [assets/books](assets/books). Translated editions are AI-assisted drafts and should receive a fluent human editorial review before commercial publication. The original English cover is shared by all four editions.

**EPUB** and **PDF** download the entire selected-language book, not just the visible page. Each edition includes the cover and a chapter table of contents. EPUB files include fonts for Indic text; PDFs are pre-generated with shaped, embedded fonts rather than relying on a visitor's print dialog.

Missing chapters, malformed translations, and missing required fonts produce a visible retry error. The reader never substitutes English content for an unavailable translated edition. Keyboard focus is contained in the dialog and returns to the launching control when it closes.

## Immersive key moments

Open **Key moments** from the navigation to explore six locally authored SVG scenes:

- **The falling Moon:** scrub the 2165–2180 forecast. With plot spoilers enabled, the scene reveals the December 21, 2177 fragment strikes and their aftermath. The Earth remains intact; the original 15-year forecast is not presented as the actual impact date.
- **The unstained blade:** a 22-second sunrise-to-sunset time lapse, moving sun, changing light and ground shadow, fast combat silhouettes, five trailing afterimages, blade streaks, and 10,000 symbolic field marks. Combat begins at noon and settles at sunset. Stylized blood spatters gather on the scene's edges and the stranger's clothing, while the blade remains clean. Scrubbing backward or replaying resets every effect. Sunrise is an atmospheric lead-in, not a change to the prologue's noon opening.
- **The red coastline:** the 666-second anomaly, stylized blood rain, Egon on the rock, and the Pacific, with three distant lightning events and water reflections. **Enable thunder** optionally adds locally synthesized, low-frequency rumbles delayed behind the lightning; sound starts muted and is never fetched from an external service.
- **Twelve within:** a single shared-body portrait surrounded by all twelve identities. Play a randomized sequence, select a name, or focus another identity at random. Notes follow the canon; this is not a clinical simulation or an association between DID and violence.
- **The departure:** five separate AI-operated ships, dormant counterparts, and the Earth-side people left behind.
- **The other rain:** clear rain on Zan, the ocean Hades, and Agape and Ales, the two moons shown in the existing JINX story. This scene is retained rather than rewritten with later discoveries.

**Play scene**, **Pause scene**, **Replay**, and the progress slider control each scene. Scene buttons also support Left/Right, Home, and End keys. **Read this chapter** opens the existing animated book at the corresponding chapter and retains its chosen language.

There is no autoplay, automatic audio, strobing, or external artwork request. Lightning uses a gradual 1.15-second localized glow, with events at least five seconds apart, rather than rapid full-screen flashes. Playback and any active thunder stop when the scene leaves the viewport, the tab is hidden, the reader opens, or the scene/spoiler preference changes. Pausing or scrubbing also stops sound, and switching scenes resets thunder to muted. Each sequence ends rather than looping indefinitely. Reduced-motion users receive static scenes and can explore with the slider and identity buttons; continuous playback and thunder audio are disabled. Unsupported or blocked audio produces a visible message without disabling the visuals.

The blade, red coastline, and Zan scenes stay visually locked until plot spoilers are enabled. Revealing a scene uses the same global spoiler control as the rest of the archive. Artwork is interpretive, not a literal orbital or clinical simulation.

The REDOVERSE link opens a companion worldbuilding reference in a new tab. This site retains JINX's 2165–2180 chronology and 35-light-year distance. The two moons described in JINX are not presented as the final total: the author-approved **REDO Volume 1** revelation establishes **four moons and two suns**, discovered after landing on Zan and fully awakening into consciousness.

The separate sequel panel includes **Part 1 - Rage of Rak** and **Part 2 - Wrath of God (Theo)**. Its description and four-moon/two-sun illustration follow the global spoiler switch; **Reveal REDO sequel details** turns that switch on. No additional moon names, discovery mechanism, precise discovery date, or unwritten plot events are invented. This update changes only the website and canon tracker in [SOT.md](SOT.md), not JINX's chapter text, translated editions, EPUBs, or PDFs.

## Local preview

Use Node.js 20 or newer. Previewing the committed site and downloadable books does not require installing packages.

```sh
npm run dev
```

Open **http://127.0.0.1:4173/**.

To reproduce a GitHub Pages project URL:

```sh
npm run dev -- --base=/JINX/ --port=4173
```

Open **http://127.0.0.1:4173/JINX/**. Choose another port if 4173 is already occupied.

Do not double-click the HTML file to preview: browsers restrict the `fetch` calls needed for local chapter and chart files under `file://`.

## Checks

Install development dependencies and Chromium once to run the browser/document checks:

```sh
npm ci
npx playwright install chromium
```

```sh
npm run check
npm test
```

Tests cover the real chapter files, SOT chart parsing, reading records, translation block parity, EPUB/PDF structure, and HTTP serving under `/JINX/`. Browser tests verify actual rotation keyframes, forward/backward navigation, exact rendered text across every chapter and language, mobile reflow, download controls, saved progress, reduced motion, and missing-translation recovery.

Key-moment checks cover animation progression/completion, pause/replay, scrubbing, offscreen suspension, spoiler gating, lunar dates, all twelve identity choices, random-focus bounds, chapter entry, responsive layouts, reduced motion, and the REDOVERSE reference.

Blade and rain tests additionally verify sunrise/noon/sunset states, moving shadows and afterimages, clean-blade continuity, scoped/resettable blood overlays, lightning timing, opt-in Web Audio, sound cancellation, and audio-error recovery.

Before publishing a content change, also check the book reader, spoiler control, search, timeline, chart selection, and a mobile viewport in a browser.

### Regenerate downloadable editions

```sh
npm run build:books
```

The generated EPUBs, PDFs, font assets, and font stylesheet are committed static assets and work directly on GitHub Pages. Rebuild them after changing the story, translations, or cover. A single edition can be regenerated with `npm run build:books -- --language=en` (also `te`, `hi`, or `es`). Do not publish outdated downloads after editing a source chapter.

## Editing the story and site

| File | Purpose |
| --- | --- |
| [SOT.md](SOT.md) | Canon, character purposes, continuity log, and editorial rating tables. Contains full spoilers. |
| [Story](Story) | Original plain-text chapters. The reader loads these files directly. |
| [index.html](index.html) | The one-page layout and accessible reader shell. |
| [assets/site.css](assets/site.css) | Responsive visual design, original CSS planet artwork, and reading styles. |
| [assets/content.js](assets/content.js) | Curated spoiler-safe summaries, cast, timeline, fleet, and parsing/validation helpers. |
| [assets/app.js](assets/app.js) | Website interactions, content loading, and local reading progress. |
| [assets/book-reader.js](assets/book-reader.js) | Localized book controls, measured pagination, page-turn animation, and reader state. |
| [assets/book.css](assets/book.css) | Responsive book pages, cover, spine, and animated leaf styling. |
| [assets/moments.js](assets/moments.js) | Canon-grounded scene descriptions, original SVG artwork, timeline state, and animation controls. |
| [assets/moments.css](assets/moments.css) | Cinematic scene layout, transport controls, spoiler locks, and responsive styling. |
| [assets/books](assets/books) | Full translated story data and the four downloadable EPUB/PDF editions. |
| [assets/book-fonts.css](assets/book-fonts.css), [assets/fonts](assets/fonts) | Self-hosted Indic fonts and their license notices. |
| [tools/build-books.mjs](tools/build-books.mjs) | Reproducible EPUB/PDF and font-asset generation. |
| [tools/serve.mjs](tools/serve.mjs) | Local-only static preview server; not needed by GitHub Pages. |
| [tests/site.test.mjs](tests/site.test.mjs) | Dependency-free automated checks. |
| [tests/moments.test.mjs](tests/moments.test.mjs) | Scene, spoiler, timeline, identity, accessibility, and reference-link checks. |
| [tests/book-reader.test.mjs](tests/book-reader.test.mjs), [tests/book-browser.test.mjs](tests/book-browser.test.mjs), [tests/books.test.mjs](tests/books.test.mjs) | Edition integrity, browser pagination/animation, and downloadable-book checks. |

English reader wording and chart values update automatically when their source files change. Update all three translations and regenerate the downloadable books after story edits; translations must preserve the English paragraph order, count, and scene breaks. If names, paths, timeline events, fleet facts, or character relationships change, update the curated summaries in `assets/content.js` and run the checks.

Do not rename the three source table headings without updating the parser:

- `Whole-story emotion matrix`
- `Emotional progression and viewpoint`
- `Whole-story intensity chart`

Missing or malformed source files produce visible errors and retry controls; the site does not substitute invented story data.

Reading progress is stored only in the visitor's browser under `jinx-reading-v1`. Reset it using **Reset reading progress** in the reading room. If browser storage is unavailable, the site explains that progress is session-only. Plot spoilers start off on each page load.

The book language is stored separately under `jinx-book-language`. Existing chapter scroll-position ratios migrate naturally to page-position ratios; chapter read markers are retained.
