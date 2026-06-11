# Validation Summary: How to Create DNS Prefetching

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNS resolution
- HTML resource hints: `dns-prefetch`, `preconnect`, `prefetch`, `preload`
- JavaScript DOM APIs
- PerformanceObserver and PerformanceResourceTiming
- `X-DNS-Prefetch-Control`
- `Save-Data` client hint / data saver behavior

## Sources Consulted
- MDN: Using dns-prefetch - https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/dns-prefetch
- MDN: rel="preconnect" - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preconnect
- MDN: rel="prefetch" - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/prefetch
- MDN: rel="preload" - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload
- MDN: PerformanceResourceTiming - https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming
- MDN: X-DNS-Prefetch-Control header - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-DNS-Prefetch-Control
- W3C: Resource Hints - https://www.w3.org/TR/2023/DISC-resource-hints-20230314/

## Issues Found
- The post described DNS prefetching as eliminating DNS latency. Updated this to say it can hide the latency when the browser honors the hint and the cached result is still valid.
- The resource-hints diagram described `preload` as "Download + parse". Updated this to "High-priority download" because `rel="preload"` initiates an early fetch for resources needed soon; parsing/execution depends on the resource and later use.
- The timing comparison implied `dns-prefetch` and `preconnect` always remove DNS or connection setup time. Updated the wording to make clear this depends on DNS being resolved and the preconnected socket still being open.
- The Performance API note said DNS time of `0ms` indicates a prefetched or cached lookup. Added the cross-origin `Timing-Allow-Origin` caveat because Resource Timing DNS and connection fields are returned as `0` by default for cross-origin resources.
- The summary said a few lines of HTML can save hundreds of milliseconds on every page load. Narrowed this to first requests to external domains.

## Review Notes
The examples are syntactically valid HTML and JavaScript. `X-DNS-Prefetch-Control` is documented by MDN as non-standard and browser-dependent, so it is suitable to mention with that caveat in mind. The JavaScript examples are intentionally simple and do not normalize duplicate domains that differ only by port or trailing slash, but this is not technically incorrect for the tutorial's purpose.
