# Validation Summary: Measure Hydration Delay Before a Page Becomes Interactive

## Status
validated

## Post Type
Technical guide / browser performance instrumentation guide

## Technologies Covered
- Server-side rendering and client-side hydration
- JavaScript and the browser Performance API
- User Timing API (`performance.mark()` and `performance.measure()`)
- PerformanceObserver
- Largest Contentful Paint, Paint Timing, and Element Timing
- Event Timing and Interaction to Next Paint (INP)
- `web-vitals/attribution` 6.1.0
- Pointer Events and keyboard events
- Long Tasks, Long Animation Frames, Resource Timing, and Server Timing
- Back/forward cache and Page Visibility lifecycle handling

## Sources Consulted
- W3C User Timing specification: https://www.w3.org/TR/user-timing/
- W3C Performance Timeline specification: https://www.w3.org/TR/performance-timeline/
- W3C High Resolution Time specification: https://www.w3.org/TR/hr-time/
- WHATWG DOM Standard event model: https://dom.spec.whatwg.org/#events
- W3C Pointer Events specification: https://w3c.github.io/pointerevents/
- W3C Event Timing specification: https://w3c.github.io/event-timing/
- W3C Largest Contentful Paint specification: https://www.w3.org/TR/largest-contentful-paint/
- W3C Paint Timing specification: https://www.w3.org/TR/paint-timing/
- W3C Element Timing specification: https://w3c.github.io/element-timing/
- W3C Long Tasks API specification: https://w3c.github.io/longtasks/
- W3C Long Animation Frames API specification: https://w3c.github.io/long-animation-frames/
- W3C Resource Timing specification: https://www.w3.org/TR/resource-timing/
- W3C Server Timing specification: https://www.w3.org/TR/server-timing/
- Google web.dev Interaction to Next Paint guide: https://web.dev/articles/inp
- Google web.dev Largest Contentful Paint guide: https://web.dev/articles/lcp
- Google web.dev back/forward cache guide: https://web.dev/articles/bfcache
- Google web.dev rendering and hydration guide: https://web.dev/articles/rendering-on-the-web
- Chrome for Developers retired Time to Interactive documentation: https://developer.chrome.com/docs/lighthouse/performance/interactive
- `web-vitals` 6.1.0 documentation: https://github.com/GoogleChrome/web-vitals/blob/v6.1.0/README.md
- `web-vitals` 6.1.0 INP attribution implementation: https://github.com/GoogleChrome/web-vitals/blob/v6.1.0/src/attribution/onINP.ts
- MDN User Timing documentation: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing
- MDN PerformanceObserver documentation: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver
- MDN LargestContentfulPaint documentation: https://developer.mozilla.org/en-US/docs/Web/API/LargestContentfulPaint

## Issues Found
- The post stated that Event Timing and INP do not measure a lost pre-hydration attempt. Event Timing can create and time an entry even when no listener handles the event; what it cannot determine is whether the application handled the user's intent. Updated the interval table and INP explanation to preserve that distinction and to keep asynchronous action completion as a separate application metric.
- The INP example assumed that `generateTarget` always made `attribution.interactionTarget` an allowlisted name. In `web-vitals` 6.1.0, the attribution implementation can bypass `generateTarget` and use `PerformanceEventTiming.targetSelector` when no live target node is available. Added a final allowlist check before reporting the value and corrected the accompanying explanation so a generated selector is not serialized inadvertently.

## Review Notes
- The User Timing, PerformanceObserver, early-input capture, LCP candidate, bfcache, INP aggregation, and long-task examples are syntactically valid and use current APIs. The framework hydration functions are explicitly identified as placeholders and must be connected to a version-specific lifecycle that guarantees the relevant boundary is usable.
- The boundary LCP interval is correctly labeled as a custom component metric rather than final page-level LCP. The raw LCP API stops producing candidates after qualifying input or scroll and is not reset after a bfcache restoration; the post correctly recommends separate lifecycle handling and the official `web-vitals` library for page-level LCP.
- First Contentful Paint is a lower bound on when a particular control could have painted, so a readiness timestamp minus FCP is an upper bound on that control's visible-to-ready duration. The post correctly treats FCP only as a broad fallback rather than proof of component visibility.
- The early-input sample intentionally limits pointer evidence to primary-button `pointerdown` and keyboard evidence to Enter/Space. Applications that need direct assistive-technology activation coverage can add a deduplicated `click` path while retaining the same allowlist and privacy controls.
