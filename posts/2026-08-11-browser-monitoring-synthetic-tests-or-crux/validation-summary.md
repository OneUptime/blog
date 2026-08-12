# Validation Summary: Browser Monitoring, Synthetic Tests, or CrUX: Which Should You Trust?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Real User Monitoring (RUM)
- Synthetic browser monitoring
- Lighthouse and Lighthouse CI
- Chrome User Experience Report (CrUX)
- Core Web Vitals: LCP, INP, and CLS
- JavaScript `web-vitals` library
- Beacon API and Fetch API

## Sources Consulted
- Web Vitals guidance: https://web.dev/articles/vitals
- `web-vitals` official documentation: https://github.com/GoogleChrome/web-vitals/blob/main/README.md
- `web-vitals` v6 upgrade guidance: https://github.com/GoogleChrome/web-vitals/blob/main/docs/upgrading-to-v6.md
- Why lab and field data can differ: https://web.dev/articles/lab-and-field-data-differences
- Why CrUX and first-party RUM can differ: https://web.dev/articles/crux-and-rum-differences
- CrUX methodology and eligibility: https://developer.chrome.com/docs/crux/methodology
- CrUX tools and data sources: https://developer.chrome.com/docs/crux/methodology/tools
- CrUX API guide: https://developer.chrome.com/docs/crux/guides/crux-api
- CrUX History API documentation: https://developer.chrome.com/docs/crux/history-api/
- CrUX BigQuery guide: https://developer.chrome.com/docs/crux/guides/bigquery
- PageSpeed Insights and CrUX behavior: https://developer.chrome.com/docs/crux/guides/pagespeed-insights
- Lighthouse overview: https://developer.chrome.com/docs/lighthouse/overview
- Lighthouse DevTools behavior and configuration: https://developer.chrome.com/docs/devtools/lighthouse/
- Lighthouse user-flow and cold-navigation behavior: https://web.dev/articles/lighthouse-user-flows
- Lighthouse throttling documentation: https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md
- Lighthouse variability guidance: https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md
- Total Blocking Time guidance: https://web.dev/articles/tbt
- Beacon API documentation: https://developer.mozilla.org/docs/Web/API/Navigator/sendBeacon

## Issues Found
- The post described Lighthouse as using a fresh profile. A default Lighthouse navigation clears cache and site storage, but a DevTools run can still be affected by the current browser setup, including extensions and other local state. The comparison table now describes the default cache/storage reset without claiming profile isolation.
- The Lighthouse row called the environment reproducible and did not state that simulated throttling is the default. It now describes a configured lab environment and distinguishes the default simulated throttling from other configured throttling modes.
- The INP explanation attributed Lighthouse's limitation to the absence of a population of interactions and treated Total Blocking Time too generally as a diagnostic. It now states that a standard Lighthouse navigation performs no user input and that TBT is a useful lab proxy, not a substitute for field INP.
- The RUM example called an undefined `routeTemplate` function and therefore would have thrown before sending its first metric. It now includes a safe application hook that falls back to the low-cardinality value `"unknown"` until it is connected to the application's router.
- The RUM example used the current `location.pathname` when a metric callback could report after the URL changed. It now prefers the metric's `navigationURL`, with the current location as a fallback, so the route is attributed to the measured navigation.
- The RUM example did not explain that callbacks can report an updated value for the same metric instance. It now sends `delta` and tells receivers to replace values by metric name and ID, or sum the deltas, rather than treating every callback as a separate visit.
- The browser-comparison row implied that every Core Web Vital could necessarily be captured from Safari and Firefox. It now qualifies non-Chrome RUM coverage by each metric API's browser support; in the current `web-vitals` support matrix, `onCLS()` remains Chromium-only.
- The incident guidance claimed synthetic availability always provides the quickest answer. It now makes the narrower, accurate claim that a synthetic availability check provides a direct answer even without real-user traffic.

## Review Notes
- All six links in the post's Official Documentation section resolve to the intended current documentation.
- The route normalizer and release value are application-specific. The example now has safe `"unknown"` fallbacks so it runs before those hooks are configured and does not emit raw, potentially high-cardinality paths.
- CrUX API and History API provide URL- and origin-level records when eligibility and sample thresholds are met; the BigQuery dataset is origin-level. The post does not imply that every interface has the same granularity.
- CrUX uses rolling aggregate data and therefore reacts more slowly than a minute-by-minute first-party RUM stream. The post correctly avoids comparing unlike URL scopes, form factors, windows, and percentiles.
- The post contains no version-pinned commands or configuration formats with deprecation concerns.
