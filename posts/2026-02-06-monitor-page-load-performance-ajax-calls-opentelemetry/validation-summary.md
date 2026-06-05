# Validation Summary: How to Monitor Page Load Performance and AJAX Calls with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript browser tracing
- OpenTelemetry Document Load Instrumentation
- OpenTelemetry Fetch Instrumentation
- OpenTelemetry XMLHttpRequest Instrumentation
- Navigation Timing and Resource Timing APIs
- Browser Fetch API and AbortController

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry `@opentelemetry/instrumentation` API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- OpenTelemetry Fetch Instrumentation API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-fetch.html
- OpenTelemetry Document Load Instrumentation package README: https://www.npmjs.com/package/@opentelemetry/instrumentation-document-load
- MDN PerformanceTiming documentation: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming
- MDN Navigation and resource timings guide: https://developer.mozilla.org/en-US/docs/Web/Performance/Navigation_and_resource_timings
- MDN PerformanceResourceTiming requestStart documentation: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/requestStart

## Issues Found
- The setup snippet used older OpenTelemetry JS APIs: `new Resource(...)` and `provider.addSpanProcessor(...)`. Updated it to use `resourceFromAttributes(...)`, semantic convention constants, and the `spanProcessors` provider option used by current OpenTelemetry JS packages.
- The document-load trace explanation incorrectly described DNS, TCP, TLS, and request/response phases as child spans. Updated the prose and Mermaid diagram to show document/resource fetch spans with network timing phases recorded as span events.
- The timing example incorrectly showed Navigation Timing values as `performance.timing.*` span attributes. Replaced it with an event-oriented example that reflects how document-load instrumentation records network timing.
- The custom page-load metric example used deprecated `performance.timing.navigationStart`. Updated it to use `performance.getEntriesByType('navigation')` with `performance.timeOrigin`.
- The custom metadata loop could pass unsupported OpenTelemetry attribute value types. Added a primitive-type check before setting attributes.
- Removed unused `context` imports from two examples.
- The retry example treated retry count as total attempts, passed custom retry options through to `fetch()`, and only cleared the timeout on successful requests. Updated it to use `maxAttempts`, strip custom options before calling `fetch()`, and clear the timeout in a `finally` block.
- The performance summary used `responseStart` alone as TTFB. Updated it to calculate `responseStart - requestStart`.

## Review Notes
Browser instrumentation in OpenTelemetry JavaScript is still documented as experimental. The post is technically accurate after the fixes, but future reviews should re-check the OpenTelemetry JS browser packages because their APIs and semantic convention defaults can change between releases.
