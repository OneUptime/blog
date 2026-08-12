# Validation Summary: How bfcache and Prerendering Distort Performance Metrics

## Status

validated

## Post Type

Technical guide / browser-monitoring implementation guide

## Technologies Covered

- JavaScript browser APIs
- Back/forward cache (bfcache)
- `pageshow`, `pagehide`, and `PageTransitionEvent.persisted`
- Navigation Timing Level 2 and `PerformanceNavigationTiming`
- Chromium Speculation Rules prerendering
- `Document.prerendering` and `prerenderingchange`
- `PerformanceNavigationTiming.activationStart`
- Core Web Vitals: LCP, INP, and CLS
- Google's `web-vitals` library
- Page Visibility and real-user monitoring lifecycle design

## Sources Consulted

- [WHATWG HTML: `PageTransitionEvent` and `persisted`](https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-pagetransitionevent-interface)
- [web.dev back/forward cache guide](https://web.dev/articles/bfcache)
- [MDN `pageshow` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event)
- [MDN `pagehide` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event)
- [Chrome Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [MDN `Crypto.randomUUID()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
- [W3C Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/)
- [Chrome prerendering guidance](https://developer.chrome.com/docs/web-platform/prerender-pages)
- [MDN `Document.prerendering`](https://developer.mozilla.org/en-US/docs/Web/API/Document/prerendering)
- [MDN `prerenderingchange` event](https://developer.mozilla.org/en-US/docs/Web/API/Document/prerenderingchange_event)
- [MDN `PerformanceNavigationTiming.activationStart`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming/activationStart)
- [WICG Prerendering Revamped: Navigation Timing extension](https://wicg.github.io/nav-speculation/prerendering.html#performance-navigation-timing-extension)
- [GoogleChrome `web-vitals` documentation](https://github.com/GoogleChrome/web-vitals/blob/main/README.md)
- [GoogleChrome `web-vitals` LCP implementation](https://github.com/GoogleChrome/web-vitals/blob/main/src/onLCP.ts)
- [GoogleChrome `web-vitals` CLS implementation](https://github.com/GoogleChrome/web-vitals/blob/main/src/onCLS.ts)
- [GoogleChrome `web-vitals` INP implementation](https://github.com/GoogleChrome/web-vitals/blob/main/src/onINP.ts)

## Issues Found

1. The first `pageshow` example started a `normal` view for every non-persisted event. A non-persisted `pageshow` can fire while a document is still prerendering, before activation, so combining the examples could create a premature normal view and a second view on `prerenderingchange`. Changed the handler to start views only for persisted bfcache restores and made the activation-gated bootstrap responsible for initial normal, loaded-history, and prerender visits.
2. The lifecycle model named a `history_reload` cohort, but the code never produced it and the rest of the post used “loaded back/forward.” Renamed the bounded value to `loaded_back_forward` and classified a newly loaded history traversal with `PerformanceNavigationTiming.type === 'back_forward'`.
3. The prerender lifecycle description implied that a document was always fully loaded and rendered before activation. Chrome can activate an incomplete prerender and continue loading it in the foreground. Changed the description to say loading and rendering have begun and may continue after activation.
4. The code called `beginVisibleVisit()` from `pageshow`, although `pageshow` is not a general visibility signal and can occur for background or prerendered documents. Added the event-semantics clarification and instructions to gate and deduplicate on Page Visibility when the product's visit definition requires actual visibility.
5. The `activationStart` subtraction example did not explicitly require both values to use the same clock. Clarified that the custom timestamp must be a performance timestamp from the same document time origin and must occur after activation.

## Review Notes

- `document.prerendering`, `prerenderingchange`, and `activationStart` remain limited-availability, experimental APIs centered on Chromium's modern prerender implementation. The post correctly scopes this section to Chromium and recommends browser/version cohorts.
- `activationStart` is supplied by the WICG prerendering extension to `PerformanceNavigationTiming`; it is not currently defined by Navigation Timing Level 2 itself.
- The post's `web-vitals` claims are correct: metrics are reported again after a bfcache restore subject to documented exceptions, restored visits receive new metric objects and IDs, repeated metric-function registration is discouraged, and INP is not reported when no interaction occurs.
- The bfcache hit ratio is an observed proxy rather than a strict eligibility rate. Browser session restoration and related cases can preserve a `back_forward` type, and the post already warns readers to define eligibility and browser support before setting a target.
- Exact prerender waste cannot be derived from activated target-page visits alone. Requested-versus-activated instrumentation is an estimate because a speculation rule is a hint that the browser may decline to start; the dashboard's “wasted prerenders” question should be interpreted with that limitation.
- `startView`, `finishCurrentView`, `reportRestore`, and `routeTemplate` are intentionally application- or SDK-defined placeholders. `crypto.randomUUID()` requires a secure context, so production monitoring should run over HTTPS.
