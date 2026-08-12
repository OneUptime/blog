# Validation Summary: Why Is Lighthouse Fast While Real Users Are Slow? Segment RUM by Device, Network, Region, and Cache State

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Lighthouse navigation audits, throttling, user flows, and performance-score variability
- Real User Monitoring (RUM) and cohort analysis
- Core Web Vitals: LCP, CLS, and INP; supporting metrics TBT and TTFB
- JavaScript browser APIs, including `hardwareConcurrency`, Device Memory, and Network Information
- Navigation Timing and Resource Timing
- Browser HTTP cache, service workers, back/forward cache, CDN caching, and prefetching
- Long Animation Frames and Long Tasks

## Sources Consulted

- Lighthouse user-flow documentation: https://github.com/GoogleChrome/lighthouse/blob/main/docs/user-flows.md
- Lighthouse throttling documentation: https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md
- Lighthouse variability documentation: https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md
- Lighthouse performance scoring: https://developer.chrome.com/docs/lighthouse/performance/performance-scoring
- Chrome DevTools throttling: https://developer.chrome.com/docs/devtools/settings/throttling
- Web Vitals overview and lab/field guidance: https://web.dev/articles/vitals and https://web.dev/articles/lab-and-field-data-differences
- INP and TBT documentation: https://web.dev/articles/inp and https://web.dev/articles/tbt
- LCP optimization and subpart documentation: https://web.dev/articles/optimize-lcp
- Field-debugging guidance: https://web.dev/articles/debug-performance-in-the-field and https://web.dev/articles/crux-and-rum-differences
- Back/forward-cache guidance: https://web.dev/articles/bfcache
- HTML Standard definition of `hardwareConcurrency`: https://html.spec.whatwg.org/multipage/workers.html#dom-navigator-hardwareconcurrency
- Device Memory API: https://www.w3.org/TR/device-memory/
- Network Information API and Save Data API: https://wicg.github.io/netinfo/ and https://wicg.github.io/savedata/
- MDN references for `Navigator.connection` and `NetworkInformation.saveData`: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/connection and https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData
- Navigation Timing Level 2: https://www.w3.org/TR/navigation-timing-2/
- Resource Timing: https://www.w3.org/TR/resource-timing/
- MDN references for `transferSize` and `deliveryType`: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize and https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/deliveryType
- MDN service-worker controller reference: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/controller
- MDN Long Animation Frame and Long Task references: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming and https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming

## Issues Found

1. The post described Lighthouse generally as measuring only one page load and stopping after load, although that specifically describes a standard navigation audit; Lighthouse also supports timespan, snapshot, and user-flow modes. The wording now scopes those statements to a standard navigation audit. The throttling comparison was also changed from the imprecise "applied at the network layer" to the documented simulated, request-level, proxy-level, and packet-level distinctions.
2. The device section said the two hardware-hint values may be reduced for privacy and named their buckets `cpu` and `ram`. `hardwareConcurrency` may expose fewer logical processors, while `deviceMemory` is an approximate, coarsened, and clamped value rather than currently available RAM. The explanation was corrected, the returned fields were renamed `logicalProcessors` and `deviceMemory`, and the example segment labels no longer imply that logical-processor count measures CPU speed.
3. The network example treated a missing `saveData` property as `"off"` whenever `navigator.connection` existed. It now checks that `saveData` is Boolean and preserves `"unknown"` when the property is unsupported. The surrounding phrase "Client hints" was changed to "Browser-provided hints" because the JavaScript properties are not themselves HTTP Client Hint headers.
4. The LCP diagnosis attributed increased element render delay only to main-thread and rendering work. The text now also covers render-blocking dependencies and delayed DOM insertion or visibility changes, all of which can increase that LCP subpart. It also uses the exact term "resource load duration" instead of "download".
5. The cache section wrote the `PerformanceNavigationTiming.type` value as "back/forward." The actual enum value is `back_forward`, and that value does not prove a back/forward-cache restore. The post now uses the exact enum and identifies the `pageshow` event's `persisted` property as the bfcache-restore signal.
6. The post suggested that a handful of observations was sufficient for segmented percentiles. Because p75 and p95 estimates from tiny cohorts are unstable and there is no universal safe count, the guidance now requires enough representative samples for a stable estimate while retaining the existing recommendation to enforce minimum counts.
7. The statement that an unreproduced RUM signal "still stands" was too categorical because instrumentation and telemetry bias can also produce misleading field results. It now says that non-reproduction alone does not invalidate the signal, calls for telemetry verification, and marks Long Animation Frame or Long Task attribution as availability-dependent.

## Review Notes

- All three JavaScript examples are syntactically valid after the corrections and use current, non-deprecated APIs.
- The Network Information API, Device Memory API, `PerformanceResourceTiming.deliveryType`, Long Animation Frames, and Long Tasks do not have uniform browser support. The post appropriately treats unsupported signals as unknown or qualifies their use by support.
- `transferSize === 0` remains evidence rather than a definitive cache verdict because local-cache delivery and restricted cross-origin timing can both produce zero; the post explains this correctly.
- There is no universal minimum sample count for a stable percentile. The appropriate threshold depends on traffic, sampling, variance, and the decision being made.
- The post contains no terminal commands, configuration snippets, or version-specific instructions.
- All seven links in the post's Official Documentation section resolved to the intended resources during review.
