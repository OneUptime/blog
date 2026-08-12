# Validation Summary: Browser Metrics After Page Load: LCP, INP, CLS, and Long Tasks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Core Web Vitals: Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS)
- `web-vitals` 6.1.0 attribution build
- Performance API and `PerformanceObserver`
- Event Timing API and `PerformanceEventTiming`
- Layout Instability API
- Long Tasks API and Long Animation Frames API
- User Timing API (`performance.mark()`, `performance.measure()`, and cleanup methods)
- Soft Navigations API in Chrome 151+
- Browser Real User Monitoring (RUM)

## Sources Consulted
- [Web Vitals](https://web.dev/articles/vitals)
- [Largest Contentful Paint](https://web.dev/articles/lcp)
- [Optimize Largest Contentful Paint](https://web.dev/articles/optimize-lcp)
- [Interaction to Next Paint](https://web.dev/articles/inp)
- [Cumulative Layout Shift](https://web.dev/articles/cls)
- [`web-vitals` 6.1.0 documentation and attribution types](https://github.com/GoogleChrome/web-vitals/blob/v6.1.0/README.md)
- [Event Timing API specification](https://w3c.github.io/event-timing/)
- [Layout Instability API specification](https://wicg.github.io/layout-instability/)
- [Long Tasks API specification](https://w3c.github.io/longtasks/)
- [Performance Timeline specification](https://w3c.github.io/performance-timeline/)
- [Timing Entry Names Registry](https://w3c.github.io/timing-entrytypes-registry/)
- [Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames)
- [User Timing specification](https://w3c.github.io/user-timing/)
- [Soft Navigations and Interaction Contentful Paint draft](https://wicg.github.io/soft-navigations/)
- [Chrome Soft Navigations documentation](https://developer.chrome.com/docs/web-platform/soft-navigations)
- [Chrome 151 release notes](https://developer.chrome.com/release-notes/151)
- [Web Cryptography API Level 2](https://w3c.github.io/webcrypto/)
- [Performance data entry types and buffers](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Performance_data)

## Issues Found
- The LCP scope table described only the initial navigation lifecycle. Chrome 151 and `web-vitals` 6 support opt-in measurement for supported soft navigations, so the scope now distinguishes the initial navigation default from enabled soft-navigation measurement.
- The Core Web Vitals threshold guidance omitted the recommendation to evaluate the 75th percentile separately for mobile and desktop. That segmentation is now explicit.
- The Soft Navigations API was called standardized, but its specification is an incubating WICG Draft Community Group Report and is not a W3C Standard or Standards Track document. The wording now calls it incubating while retaining the accurate Chrome 151 rollout information.
- The LCP attribution breakdown used imprecise labels that could misclassify network and server time. It now uses the official four subparts: time to first byte, resource load delay, resource load duration, and element render delay.
- The CLS example did not export the metric `id`. Because `onCLS()` can report more than once and creates a new metric instance after a back/forward cache restore, the example now includes `id` so ingestion can correctly upsert, deduplicate, or aggregate reports.
- The Long Tasks prose used inconsistent boundary wording. It now says 50 milliseconds or longer, matching the API's reporting threshold and the table in the post.
- The statement that all performance entry buffers are finite was incorrect: the registry defines infinite buffers for marks and measures, while the long-task buffer has a finite maximum. The statement now refers specifically to the long-task entry buffer.
- The custom action example cleared its marks but left each `PerformanceMeasure` stored on the performance timeline. It now calls `performance.clearMeasures("action.search")` to prevent repeated actions from accumulating measure entries on a long-lived page.

## Review Notes
- The `web-vitals/attribution` imports and all referenced INP and CLS attribution property names are valid in `web-vitals` 6.1.0.
- Consumers of repeated Web Vitals reports still need an ingestion policy: upsert the cumulative value by metric `id`, or send and sum `delta` values grouped by `id`.
- `crypto.randomUUID()` requires a secure context, so the custom timing example assumes HTTPS or another potentially trustworthy origin such as localhost.
- The double-`requestAnimationFrame()` boundary is correctly described as a render opportunity rather than proof that pixels reached the display; animation-frame callbacks may also be paused in hidden tabs.
- Soft-navigation metrics remain a progressive enhancement for Chromium 151+; retaining the portable custom route metric is correct.
- Long-task `entry.name` provides only coarse culprit-context attribution. The post correctly presents Long Animation Frames as a richer, browser-dependent diagnostic enhancement.
