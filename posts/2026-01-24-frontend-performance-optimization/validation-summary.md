# Validation Summary: How to Handle Frontend Performance Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Core Web Vitals
- JavaScript PerformanceObserver API
- Event Timing API
- React lazy loading and Suspense
- HTML responsive images, lazy loading, and preload hints
- CSS containment, content-visibility, will-change, and font loading
- Intersection Observer API
- Virtual scrolling

## Sources Consulted
- web.dev, "Web Vitals": https://web.dev/articles/vitals
- web.dev, "Interaction to Next Paint (INP)": https://web.dev/articles/inp
- web.dev, "Cumulative Layout Shift (CLS)": https://web.dev/articles/cls
- web.dev, "Browser-level image lazy loading for the web": https://web.dev/articles/browser-level-image-lazy-loading
- MDN Web Docs, "PerformanceEventTiming": https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming
- MDN Web Docs, "LargestContentfulPaint": https://developer.mozilla.org/en-US/docs/Web/API/LargestContentfulPaint
- MDN Web Docs, "HTMLImageElement / img element": https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img
- MDN Web Docs, "rel=preload": https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload
- React documentation, "lazy": https://react.dev/reference/react/lazy
- WHATWG HTML Standard, "Images": https://html.spec.whatwg.org/multipage/images.html

## Issues Found
- The INP code measured the maximum event duration seen by the Event Timing API, which is not the Core Web Vitals INP calculation. Updated the example to group entries by `interactionId` and report the 98th percentile interaction duration, matching the documented INP approach.
- The CLS code accumulated all unexpected layout shifts for the full page lifetime. Updated it to use session windows with a one-second gap and five-second cap, then report the maximum session value.
- The React `lazy()` example did not mention that lazy-loaded component modules must provide a default export. Added a short code comment to make the requirement explicit.
- The responsive image example used `loading="lazy"` on a "Hero image", which can be harmful for an above-the-fold LCP image. Renamed the alt text to "Gallery image" so the lazy-loading example no longer implies lazy loading the primary hero/LCP image.

## Review Notes
The examples are intentionally simplified and suitable for illustrating concepts. For production Core Web Vitals reporting, the official `web-vitals` JavaScript library is still preferable because it handles browser support, edge cases, page lifecycle details, and attribution more completely than short hand-written snippets.
