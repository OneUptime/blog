# Validation Summary: Why Browser Monitoring Misses SPA Route Changes

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered

- JavaScript browser instrumentation
- Single-page application routers and same-document navigation
- History API, `pushState()`, `replaceState()`, and `popstate`
- Navigation Timing, User Timing, Event Timing, and `requestAnimationFrame()`
- Navigation API
- Chrome Soft Navigations API and Interaction Contentful Paint
- Core Web Vitals and Interaction to Next Paint (INP)
- Real User Monitoring (RUM)
- OpenTelemetry JavaScript tracing, context propagation, and semantic conventions
- W3C Trace Context, CORS, and browser telemetry export

## Sources Consulted

- [Chrome: Measuring soft navigations](https://developer.chrome.com/docs/web-platform/soft-navigations)
- [Chrome 151 release notes](https://developer.chrome.com/release-notes/151)
- [WICG: Soft Navigations and Interaction Contentful Paint](https://wicg.github.io/soft-navigations/)
- [web.dev: How SPA architectures affect Core Web Vitals](https://web.dev/articles/vitals-spa-faq)
- [W3C Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/)
- [WHATWG HTML Standard: Navigation and session history](https://html.spec.whatwg.org/multipage/nav-history-apis.html)
- [MDN: History.pushState()](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)
- [MDN: Window popstate event](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event)
- [W3C User Timing Level 3](https://www.w3.org/TR/user-timing/)
- [MDN: Performance.mark()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/mark)
- [MDN: Performance.measure()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measure)
- [W3C Event Timing API](https://www.w3.org/TR/event-timing/)
- [MDN: Event.timeStamp](https://developer.mozilla.org/en-US/docs/Web/API/Event/timeStamp)
- [MDN: Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
- [MDN: Event.preventDefault()](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault)
- [MDN: Window.requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [OpenTelemetry JavaScript Tracer API](https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Tracer.html)
- [OpenTelemetry JavaScript Span API](https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html)
- [OpenTelemetry JavaScript TimeInput](https://open-telemetry.github.io/opentelemetry-js/types/_opentelemetry_api._opentelemetry_api.TimeInput.html)
- [OpenTelemetry browser semantic conventions](https://opentelemetry.io/docs/specs/semconv/browser/)
- [OpenTelemetry semantic-convention naming guidance](https://opentelemetry.io/docs/specs/semconv/general/naming/)
- [OpenTelemetry app attribute registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/app/)
- [OpenTelemetry service attribute registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/)
- [OpenTelemetry JavaScript cross-origin propagation allowlist](https://open-telemetry.github.io/opentelemetry-js/types/_opentelemetry_sdk-trace-web.PropagateTraceHeaderCorsUrls.html)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [WHATWG Fetch Standard: CORS protocol](https://fetch.spec.whatwg.org/#http-new-header-syntax)

## Issues Found

- The post repeatedly described the Soft Navigations API as standardized. The current specification is a WICG Draft Community Group Report, not a W3C Standard or Standards Track document. Removed the `standardized` qualifier while retaining the accurate Chrome-specific API guidance.
- The Chrome 151 statement was stale future-tense wording. Chrome 151 reached stable release on July 28, 2026 with `soft-navigation` and `interaction-contentful-paint` entries. Updated the post to state that Chrome 151 ships the feature unflagged.
- `routeCommitted()` retained a transition across two awaited animation frames without checking whether it had failed, been superseded, or already completed. Added an identity check after the await so an invalidated completion cannot emit a second terminal `success` outcome.
- The link-click example called the SPA router without cancelling the anchor's default navigation. Added an eligibility guard and `event.preventDefault()`, and documented that modified/non-primary, download, cross-origin, and non-current-context links must not be intercepted.
- The route-start contract implied that every user-initiated navigation exposes its original input timestamp. Browser chrome back/forward input timing is not exposed to page code. Updated the boundary to use captured in-page input timing when available and the earliest router/navigation callback otherwise.
- The post called Event Timing and INP standardized measures. Event Timing remains a W3C Working Draft, while INP is a Core Web Vital derived from Event Timing data. Reworded the claim to describe that relationship accurately.
- The sample did not state that per-transition User Timing entries need cleanup in a long-lived SPA. Clarified that `cleanup(id)` must remove transition state and marks, and that completed measures should be cleared after export when they are no longer needed.
- The OpenTelemetry example implied that `tracer.startSpan()` alone connects route work, fetch/XHR spans, and server traces. `startSpan()` does not activate the new span. Added explicit context creation and re-entry, plus guidance for later callbacks or `startActiveSpan()` with an appropriate browser context manager.
- The custom OpenTelemetry attributes used the existing `app.*` semantic-convention namespace. Replaced them with a unique placeholder company namespace and directed readers to use the stable `service.version` resource attribute for the application release.
- The cross-origin trace-propagation guidance mentioned only `traceparent` and did not distinguish client destination allowlisting from server CORS configuration. Updated it to cover trusted destination allowlisting, caller-origin permission, and all enabled injected headers (`traceparent`, plus `tracestate` and `baggage` when used).

## Review Notes

- The final Chrome 151 fields used by the observer example—`name`, `navigationId`, `interactionId`, and `startTime`—are valid, and `{ type: "soft-navigation", buffered: true }` is the documented observer configuration.
- The Soft Navigations API is currently Chrome/Chromium-specific in practical deployment. Feature detection remains necessary for older Chrome versions and other browser engines.
- Two nested animation frames provide a pragmatic render opportunity, but `requestAnimationFrame()` is commonly paused in background tabs. Production implementations that must always terminate a route should add a visibility-aware timeout or fallback.
- Browser OpenTelemetry client instrumentation remains experimental/mostly unspecified, and its browser semantic conventions remain at Development status.
- All external links present in the post resolved successfully during validation.
