# Validation Summary: How to Set Up DocumentLoadInstrumentation for React Page Load Performance

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry Web SDK
- DocumentLoadInstrumentation
- React
- Browser Navigation Timing API
- Browser PerformanceObserver, Paint Timing, Largest Contentful Paint, and Event Timing APIs
- OTLP trace export over HTTP

## Sources Consulted
- OpenTelemetry Document Load Instrumentation README: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-document-load
- OpenTelemetry Web SDK README: https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-web
- OpenTelemetry npm package metadata and type declarations for `@opentelemetry/instrumentation-document-load`, `@opentelemetry/sdk-trace-web`, `@opentelemetry/resources`, and `@opentelemetry/semantic-conventions`
- MDN Navigation Timing API: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Navigation_timing
- MDN PerformanceNavigationTiming: https://developer.mozilla.org/docs/Web/API/PerformanceNavigationTiming
- MDN LargestContentfulPaint: https://developer.mozilla.org/docs/Web/API/LargestContentfulPaint
- MDN PerformanceEventTiming: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming
- Chrome Developers note on FID replacement by INP: https://developer.chrome.com/blog/first-input-delay-in-crux
- React `createRoot` documentation: https://react.dev/reference/react-dom/client/createRoot

## Issues Found
- Updated the OpenTelemetry resource setup to use `resourceFromAttributes` instead of the removed `new Resource(...)` constructor pattern in current OpenTelemetry JS packages.
- Replaced deprecated `SemanticResourceAttributes` usage with current semantic convention constants such as `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- Added the missing `@opentelemetry/instrumentation` package to the install command because the examples import `registerInstrumentations` from it.
- Updated `WebTracerProvider` setup to pass `spanProcessors` in the constructor instead of calling `provider.addSpanProcessor(...)`, which is not part of the current OpenTelemetry JS 2.x provider API.
- Fixed `DocumentLoadInstrumentation` custom attributes configuration so `applyCustomAttributesOnSpan` uses the documented object shape with a `documentLoad` callback.
- Corrected wording that implied DocumentLoadInstrumentation directly measures interactivity; it captures document load, resource, paint, and browser lifecycle timing, while interactivity needs additional tracking.
- Corrected the LCP custom span timing. The prior example added `entry.startTime + entry.renderTime`, double-counting the timestamp. The fixed version uses `renderTime`, `loadTime`, or `startTime` as the LCP timestamp.
- Replaced First Input Delay tracking with Interaction to Next Paint candidate tracking using `PerformanceEventTiming`, because FID is no longer the current Core Web Vitals responsiveness metric.
- Added `requestIdleCallback` fallbacks for examples that used idle scheduling, improving browser compatibility.
- Fixed the alerting example so the `firstContentfulPaint` threshold is actually checked, and added a guard for missing navigation timing entries.

## Review Notes
The examples are illustrative browser/React snippets rather than a complete application, so they were reviewed for API correctness and syntax consistency against current documentation. Production RUM deployments should also account for collector CORS settings, frontend token exposure, sampling, and browser support differences for newer performance entry types.
