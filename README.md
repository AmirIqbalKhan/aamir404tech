# 404 Tech studio

A responsive, client-focused website for Amir Iqbal Khan’s independent digital studio.

## Run locally

- Node.js 22.12+ is recommended.
- Run `npm ci`, then `npm run dev`.
- Run `npm run build` and `npm run preview` for a production preview with the Vercel security headers.
- Run `npm test` for the browser checks. Tests use the installed Google Chrome browser.

## Deployment

Vercel builds with `npm run build` and serves `dist`. Static metadata and artwork live in `public`. The canonical address remains https://aamir404tech.vercel.app/. No backend or external form service is required.

## Shader behavior

The `shaders` dependency is pinned to 4.0.4 and loaded asynchronously after the page. Its standard JavaScript API includes a full component registry, so its larger runtime stays separate from the initial app script. The production shader chunk is approximately 724 kB gzipped; the initial application script is approximately 3.15 kB gzipped. Vite reports a size warning for the deferred shader chunk. Telemetry is disabled. Only visible canvases animate, capped at two on desktop and one on mobile. Reduced motion and unavailable or failed WebGPU use static artwork. The hero pause button controls all animated visuals. Pointer ripples are enabled only for fine pointers with hover.

## Content

Service descriptions are in `service-data.json` and server-readable HTML in `index.html`; keep both aligned when editing. The five previews are illustrative demonstrations, not client project claims. Existing engineering prose is preserved in native HTML disclosures. Contact is through hello@404tech.dev; the selected service is included in the main email subject.

## Brand assets

Run `node scripts/generate-brand-assets.mjs` to regenerate the social preview, touch icon, and ICO from the SVG identity. This uses the installed Chrome browser.

## Validation

Browser coverage includes the five service tabs at 375, 768, and 1440 pixels, expanded engineering notes, keyboard interaction, mobile menu dismissal, clipboard success and failure, no JavaScript, reduced motion, missing GPU support, and automated WCAG AA checks. Shader scheduling and terminal failure tests use the actual scheduling module with a controlled GPU boundary; the live shaders are also inspected in the browser. Responsive screenshots are saved in `qa/`.
