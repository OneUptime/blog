# Validation Summary: Does Your Browser Monitoring SDK Slow the Page? Measuring Bundle, Main-Thread, and Network Overhead

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Browser monitoring and Real User Monitoring (RUM) SDKs
- JavaScript and the User Timing API
- PerformanceObserver and the Long Tasks API
- Long Animation Frames API
- Resource Timing API and Timing-Allow-Origin
- Chrome DevTools Performance and Network panels
- Core Web Vitals: LCP, INP, and CLS
- Google `web-vitals`
- Elastic RUM JavaScript agent
- npm and POSIX shell utilities
- Browser back/forward cache (bfcache)

## Sources Consulted
- [MDN PerformanceObserver `observe()`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)
- [MDN performance data and buffer limits](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Performance_data)
- [W3C Long Tasks API](https://www.w3.org/TR/longtasks-1/)
- [MDN Long animation frame timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing)
- [MDN `performance.mark()`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/mark) and [`performance.measure()`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measure)
- [W3C Resource Timing](https://www.w3.org/TR/resource-timing/)
- [MDN Resource Timing API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)
- [MDN `transferSize`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/transferSize) and [`encodedBodySize`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/encodedBodySize)
- [Chrome DevTools Performance reference](https://developer.chrome.com/docs/devtools/performance/reference)
- [Chrome DevTools Network reference](https://developer.chrome.com/docs/devtools/network/reference)
- [Google `web-vitals` documentation](https://github.com/GoogleChrome/web-vitals)
- [Elastic RUM JavaScript agent API](https://www.elastic.co/docs/reference/apm/agents/rum-js/agent-api) and [configuration](https://www.elastic.co/docs/reference/apm/agents/rum-js/configuration)
- [npm `ci` documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [POSIX `du` specification](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/du.html)

## Issues Found
- The text said that the shell commands generated a bundle manifest, but `du -ak` reports allocated filesystem usage. Changed the description to call it a rough filesystem check and clarified that the application-defined environment switch must parse string values explicitly and remove the SDK from the control output.
- The Resource Timing example labeled `transferSize` and `encodedBodySize` generically even though both describe the fetched response, not an uploaded telemetry request body. Renamed the fields, clarified that `transferSize` is not an exact wire-byte counter, and directed upload measurement to SDK-supported counters or controlled request instrumentation reconciled with intake-side counters.
- A one-time `performance.getEntriesByType('resource')` snapshot can omit entries after the Resource Timing buffer fills. Added the default 250-entry limit and the need for early continuous observation, deliberate buffer management, or intake-side counters for complete session totals.
- The field experiment could be confounded if the independent metric snippet ran only in the control cohort. Clarified that the same snippet must run in both cohorts.
- The post described repeated `web-vitals` initialization as an eventual memory leak. The official project documentation only states that repeated calls create page-lifetime observers and listeners and may increase memory overhead, so the wording was corrected to match that documented behavior.

## Review Notes
The JavaScript examples are syntactically valid and use current APIs. The Long Tasks threshold and attribution caveat are accurate. Long Animation Frames provides the described script and forced style/layout timing, but remains limited-availability and experimental. The `npm ci`, `du`, and `sort` commands are valid; their build scripts and environment switch are necessarily application-defined. All external links in the post resolved to the intended official documentation, and no version-specific deprecations were found.
