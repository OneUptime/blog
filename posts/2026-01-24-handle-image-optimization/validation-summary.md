# Validation Summary: How to Handle Image Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTML responsive images (`picture`, `source`, `img`, `srcset`, `sizes`)
- Image formats: WebP, AVIF, PNG, SVG, JPEG
- HTTP content negotiation with `Accept` and `Vary`
- Express.js static file responses
- Sharp image processing
- Native lazy loading and Intersection Observer
- Cloudflare Image Resizing with Workers
- AWS CloudFront Lambda@Edge
- Vite and `vite-plugin-image-optimizer`
- Resource Timing API and `PerformanceObserver`

## Sources Consulted
- MDN Web Docs: Image file type and format guide - https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types
- MDN Web Docs: `<img>` element, `srcset`, `sizes`, `loading`, and dimensions - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img
- MDN Web Docs: `Accept` header and content negotiation - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept
- MDN Web Docs: `Vary` header - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Vary
- Express response API: `res.sendFile()` - https://expressjs.com/en/5x/api/response/
- Sharp API: output options, WebP, AVIF, JPEG, and buffers - https://sharp.pixelplumbing.com/api-output/
- Sharp API: resizing images - https://sharp.pixelplumbing.com/api-resize/
- Cloudflare Images docs: Transform via Workers `fetch()` - https://developers.cloudflare.com/images/optimization/transformations/transform-via-workers/
- Cloudflare Images docs: transformation parameters - https://developers.cloudflare.com/images/optimization/features/
- AWS CloudFront docs: Lambda@Edge event structure - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html
- `vite-plugin-image-optimizer` official README - https://github.com/FatehAK/vite-plugin-image-optimizer
- MDN Web Docs: `PerformanceResourceTiming.transferSize` - https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize

## Issues Found
- The Express example used `fs.access()` and `path` without showing the imports. Added `fs.promises` and `path` imports so the snippet is runnable in context.
- The Express example passed relative paths to `res.sendFile()`. Express requires an absolute path unless a `root` option is supplied, so the snippet now builds absolute paths with `path.join(__dirname, 'images')`.
- The Express content-negotiation example did not set `Vary: Accept`. Added `res.vary('Accept')` so shared caches keep separate AVIF, WebP, and JPEG variants.
- The Express route interpolated a request parameter directly into filesystem paths. Added `path.basename()` to keep the example constrained to a filename.
- The custom lazy-loading example preloaded only `data-src`, even when `data-srcset` existed. Updated it to set `tempImg.srcset` before `tempImg.src` so responsive candidates participate in preloading.
- The Vite example imported `vite-plugin-image-optimizer` as a default export. The plugin documents the named `ViteImageOptimizer` export, so the import and plugin call were corrected.
- The Vite AVIF options used `speed`, but Sharp's AVIF output option is `effort`. Changed `speed: 5` to `effort: 5`.
- The Vite comment said the plugin generated WebP versions automatically. The documented plugin optimizes matching assets; it does not generate alternate WebP variants from JPEG/PNG input in that configuration. Updated the comment to describe build cache behavior.
- The image performance example divided by `imageMetrics.length` without handling pages with no image resource entries. Added an early return when no image metrics are collected.

## Review Notes
- The browser support percentages in the format table are broad summary figures and can drift over time. The recommendations remain technically sound, especially the use of `<picture>` fallbacks for AVIF and WebP.
- `transferSize` can be `0` for cached or cross-origin resources without `Timing-Allow-Origin`, so analytics based on it should account for that in production dashboards.
- The CloudFront Lambda@Edge example assumes corresponding `.avif` and `.webp` objects exist at the rewritten paths; otherwise the origin will return a miss or error.
