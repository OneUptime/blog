# Validation Summary: Detect Frontend Regressions Without Traffic Confounders

## Status

validated

## Post Type

Technical guide / frontend-observability reference

## Technologies Covered

- Real User Monitoring (RUM)
- Core Web Vitals and the Google `web-vitals` library
- Interaction to Next Paint (INP), Largest Contentful Paint (LCP), and Cumulative Layout Shift (CLS)
- Browser page lifecycle, back/forward cache, prerendering, and soft navigations
- Canary releases and randomized control/candidate comparisons
- Bot, crawler, and synthetic-monitor traffic classification
- Googlebot DNS and published-IP verification
- Chrome and Firefox browser extensions
- Population standardization, weighted distributions, percentiles, confidence intervals, resampling, and control charts
- JavaScript error collection, source maps, and symbolication

## Sources Consulted

- [Google `web-vitals` documentation and API](https://github.com/GoogleChrome/web-vitals/blob/main/README.md)
- [`web-vitals` changelog](https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md)
- [Best practices for measuring Web Vitals in the field](https://web.dev/articles/vitals-field-measurement-best-practices)
- [Core Web Vitals definitions and p75 assessment](https://web.dev/articles/vitals)
- [Interaction to Next Paint](https://web.dev/articles/inp)
- [Back/forward cache and Core Web Vitals](https://web.dev/articles/bfcache)
- [Chrome prerender documentation](https://developer.chrome.com/docs/web-platform/prerender-pages)
- [Chrome soft-navigation documentation](https://developer.chrome.com/docs/web-platform/soft-navigations)
- [Chrome UX Report API](https://developer.chrome.com/docs/crux/api)
- [Chrome UX Report metrics methodology](https://developer.chrome.com/docs/crux/methodology/metrics)
- [Google's procedure for verifying crawler and fetcher requests](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests)
- [Googlebot documentation and verification guidance](https://developers.google.com/search/docs/crawling-indexing/googlebot#verifying-googlebot)
- [Chrome extension content scripts and isolated worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome `ExecutionWorld` reference](https://developer.chrome.com/docs/extensions/reference/api/scripting#type-ExecutionWorld)
- [Chrome web-accessible extension resources](https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources)
- [Chrome DevTools `#sourceURL` guidance](https://developer.chrome.com/docs/devtools/javascript/source-maps#sourceurl)
- [MDN `runtime.getURL()` and Firefox's `moz-extension://` URLs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getURL)
- [MDN User-Agent Client Hints API](https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API)
- [MDN `Navigator.webdriver`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/webdriver)
- [MDN `Error.stack`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stack)
- [W3C Long Tasks API](https://www.w3.org/TR/longtasks-1/)
- [W3C Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/)
- [NIST completely randomized designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri331.htm)
- [NIST control-chart guidance](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)
- [NIST grouped-percentile guidance](https://www.itl.nist.gov/div898/software/dataplot/refman2/auxillar/groupper.htm)
- [CDC statistical methods for direct standardization](https://www.cdc.gov/heart-disease-stroke-atlas/statistical-methods/index.html)
- [Prometheus metric and label naming guidance](https://prometheus.io/docs/practices/naming/)

## Issues Found

1. The post treated the `web-vitals` metric ID as if it identified an entire page visit. It actually identifies a metric instance and is used to deduplicate or combine repeated reports for that instance; different metrics from the same visit need a separate shared visit ID. Corrected the observation-unit explanation and clarified that a bfcache restore creates new metric instances for a separate visit.
2. The `visit_kind` example omitted lifecycle categories exposed by current `web-vitals`, including reloads, non-bfcache history navigations, discarded-page restores, and opt-in soft navigations. Expanded the bounded enum and stated that soft-navigation observations should remain separate because their support and semantics differ from full-page navigations.
3. The canary design did not require unbiased random assignment, so simultaneity and stickiness alone could leave candidate and control populations confounded. Added random assignment of eligible experiment units and changed the categorical claim that the design “controls” external factors to the more accurate statement that it helps balance them.
4. The Googlebot section referred only to reverse DNS verification. A PTR lookup alone is insufficient under Google's documented procedure, which requires a reverse lookup, validation of the returned Google hostname, and a forward lookup that resolves to the original source IP. Changed the text to specify reverse-then-forward DNS verification or source-IP matching against Google's published ranges.
5. The device-mix example could be read as implying that two cohort p75 values and their weights alone determine the blended p75. They do not; the complete cohort distributions matter. Reworded the example to hold those distributions fixed and make the blended-p75 result explicitly dependent on their shapes.
6. The percentile-standardization paragraph implied that a percentile calculated from histogram buckets is exact. Changed it to require aligned buckets and to describe the result as an approximation or bound limited by histogram resolution; exact recomputation requires the weighted observations or a sufficiently detailed representation of their distribution.
7. The release comparison table called its first-party error metric a session rate even though the post defines and later computes a visit rate. Renamed it to `first-party error-visit rate` so the label matches the numerator and denominator.

## Review Notes

- The post is a technical guide with schema, formula, measurement-design, traffic-classification, rollout, and statistical implementation details, so it was fully reviewed rather than classified as a non-code post.
- The remaining claims about missing INP for visits without qualifying interaction, new metric instances after bfcache restoration, immutable release tagging, direct standardization of means and threshold rates, non-composability of stratum percentiles, control charts, error-rate denominators, extension execution worlds, and server-side crawler verification agree with the cited documentation.
- Extension-scheme stack frames are useful evidence, but JavaScript stack formatting is non-standard and eval source names can be assigned with `//# sourceURL`. The post appropriately treats extension attribution as evidence rather than proof and retains mixed and opaque errors.
- User-Agent Client Hints remains limited-availability and is marked experimental by MDN. The post does not depend on universal support and includes an `unknown` category, so no change was required.
- Navigation Timing Level 2 is currently a Working Draft. The post uses it as relevant lifecycle documentation and does not claim Recommendation status.
- For sticky user- or session-level assignments, confidence intervals and resampling should preserve the assignment/dependence unit rather than treating repeated visits as independent. Repeated alert evaluations and many stratum comparisons also need an explicit false-alarm policy in a concrete implementation.
- All external links in the post resolved to the described official or authoritative resources during this review.
