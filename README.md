# JINX — What survives us

A responsive, single-page reading experience for **JINX**, an original dark science-fiction story set primarily in California from 2165 to 2180.

**Content advisory:** graphic violence, blood imagery, mass death, and grief. The archive hides plot explanations by default; opening a chapter displays the full, unabridged story.

## Website

- Full chapter reader with chapter navigation, adjustable text size, saved position, and explicit read markers.
- Searchable character explorer, including the distinction between original people, counterparts, AI, and Egon's identities.
- An interactive five-ship mission map and Earth-reference timeline.
- Emotion and gore/violence/peril charts parsed directly from the tables in [SOT.md](SOT.md), rather than a second hard-coded set of ratings.
- A plot-spoiler switch, keyboard-accessible controls, reduced-motion support, and mobile layouts.
- No frameworks, external fonts, trackers, third-party scripts, dependencies, or production build step.

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

## Local preview

Use Node.js 20 or newer. There are no packages to install.

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

```sh
npm run check
npm test
```

The dependency-free Node tests cover the real chapter files, SOT chart parsing and validation, reading-record validation, relative paths, and HTTP serving under `/JINX/`.

Before publishing a content change, also check the chapter reader, spoiler control, search, timeline, chart selection, and a mobile viewport in a browser.

## Editing the story and site

| File | Purpose |
| --- | --- |
| [SOT.md](SOT.md) | Canon, character purposes, continuity log, and editorial rating tables. Contains full spoilers. |
| [Story](Story) | Original plain-text chapters. The reader loads these files directly. |
| [index.html](index.html) | The one-page layout and accessible reader shell. |
| [assets/site.css](assets/site.css) | Responsive visual design, original CSS planet artwork, and reading styles. |
| [assets/content.js](assets/content.js) | Curated spoiler-safe summaries, cast, timeline, fleet, and parsing/validation helpers. |
| [assets/app.js](assets/app.js) | Website interactions, content loading, and local reading progress. |
| [tools/serve.mjs](tools/serve.mjs) | Local-only static preview server; not needed by GitHub Pages. |
| [tests/site.test.mjs](tests/site.test.mjs) | Dependency-free automated checks. |

Chapter wording and chart values update automatically when their source files change. If names, paths, timeline events, fleet facts, or character relationships change, update the curated summaries in `assets/content.js` and run the checks.

Do not rename the three source table headings without updating the parser:

- `Whole-story emotion matrix`
- `Emotional progression and viewpoint`
- `Whole-story intensity chart`

Missing or malformed source files produce visible errors and retry controls; the site does not substitute invented story data.

Reading progress is stored only in the visitor's browser under `jinx-reading-v1`. Reset it using **Reset reading progress** in the reading room. If browser storage is unavailable, the site explains that progress is session-only. Plot spoilers start off on each page load.
