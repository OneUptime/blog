# Validation Summary: INP Is Poor but LCP Is Fine: Finding the Long Task or Event Handler Behind Slow Interactions

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Interaction to Next Paint (INP) and Largest Contentful Paint (LCP)
- Core Web Vitals and real-user monitoring (RUM)
- JavaScript and the PerformanceObserver API
- Event Timing API and PerformanceEventTiming
- Long Tasks API
- Long Animation Frames API
- GoogleChrome/web-vitals attribution build, reviewed against version 6.1.0
- Prioritized Task Scheduling API and scheduler.yield()
- Web Workers
- Chrome DevTools Performance panel and Lighthouse user flows

## Sources Consulted
- [web.dev: Interaction to Next Paint](https://web.dev/articles/inp)
- [web.dev: Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp)
- [web.dev: Optimize long tasks](https://web.dev/articles/optimize-long-tasks)
- [W3C: Event Timing API](https://www.w3.org/TR/event-timing/)
- [W3C: Long Tasks API](https://www.w3.org/TR/longtasks-1/)
- [W3C: Long Animation Frames API](https://www.w3.org/TR/long-animation-frames/)
- [GoogleChrome/web-vitals v6.1.0 README and attribution reference](https://github.com/GoogleChrome/web-vitals/blob/v6.1.0/README.md)
- [GoogleChrome/web-vitals v6.1.0 INP type definitions](https://github.com/GoogleChrome/web-vitals/blob/v6.1.0/src/types/inp.ts)
- [GoogleChrome/web-vitals v6.1.0 INP attribution implementation](https://github.com/GoogleChrome/web-vitals/blob/v6.1.0/src/attribution/onINP.ts)
- [GoogleChrome/web-vitals v6.1.0 changelog](https://github.com/GoogleChrome/web-vitals/blob/v6.1.0/CHANGELOG.md)
- [MDN: PerformanceEventTiming.interactionId](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming/interactionId)
- [MDN: Long animation frame timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing)
- [MDN: Scheduler.yield()](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield)
- [WHATWG HTML Standard: Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [Chrome for Developers: Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames)
- [Chrome DevTools: Performance features reference](https://developer.chrome.com/docs/devtools/performance/reference/)
- [web.dev: Lighthouse user flows](https://web.dev/articles/lighthouse-user-flows)

## Issues Found
- The field example derived the route from `location.href` when the `onINP` callback ran. Because the callback can run after a later navigation, this could attribute the metric to the wrong URL. Changed it to prefer `metric.navigationURL`, added `metric.navigationType`, and documented how exact SPA interaction routes require route-history correlation or supported soft-navigation reporting.
- The example treated optional `interactionType` and `interactionTarget` attribution as always present. Added bounded `unknown` fallbacks, consistent with the current `web-vitals` 6.1.0 types and the post's privacy guidance.
- The lifecycle discussion did not distinguish document `loadState` from navigation and application lifecycle state. Clarified that `loadState` only represents document-loading phases, while navigation type and application telemetry cover bfcache, SPA-navigation, and idle state.
- The reporting example did not explain that `onINP` can emit multiple updates for one metric ID. Added guidance to upsert by ID or send `metric.delta`, while retaining the correct statement that a bfcache restore receives a new metric object and ID.
- The raw Event Timing section could be read as using one event entry's phase split for the whole interaction. Clarified that interaction latency is the maximum event duration and that interaction-level phases must account for all relevant entries presented in the same frame.
- The raw observer did not explain that `durationThreshold: 40` only affects entries after observer registration. Added the Event Timing rule that buffered historical entries are limited to the platform's default 104-millisecond threshold.
- The diagnostic payload could imply that `interactionId` is globally unique. Clarified that it is scoped to a `Window` and must be paired with page-visit context in telemetry.
- Long Animation Frame function attribution identifies a script entry point, not necessarily the slow nested function. Tightened the wording accordingly.

## Review Notes
- Long Animation Frame and Long Tasks support remains browser-dependent; the post correctly feature-detects both entry types and treats their attribution as diagnostic evidence.
- Long Animation Frame script attribution covers scripts over 5 milliseconds and can be limited by origin and execution context. A DevTools trace remains necessary for precise root-cause proof, as the post states.
- `scheduler.yield()` is not universally available, but the feature check and `setTimeout(..., 0)` task-boundary fallback are current and valid.
- The example helper functions and telemetry transport are application-specific placeholders and must enforce sampling, payload bounds, and privacy controls in their implementations.
