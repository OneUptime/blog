# Validation Summary: How to Monitor E-Commerce Session Replay Correlation with OpenTelemetry Trace

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry JavaScript Web SDK
- OpenTelemetry Fetch instrumentation
- W3C Trace Context propagation
- Browser fetch API
- Session replay custom events
- OpenTelemetry Python tracing API

## Sources Consulted
- OpenTelemetry JS Web SDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-web.html
- OpenTelemetry JS WebTracerProvider API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-web.WebTracerProvider.html
- OpenTelemetry JS instrumentation registration documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- OpenTelemetry JS Fetch instrumentation documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-fetch.html
- OpenTelemetry JS Resources documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The JavaScript `WebTracerProvider` example passed a plain object as `resource`. Current OpenTelemetry JS expects a `Resource` object, so the example now imports `resourceFromAttributes` from `@opentelemetry/resources` and uses it to create the resource.
- The fetch custom-attribute hook assumed the request always had `url` and `method` properties. Current Fetch instrumentation types pass `Request | RequestInit`, so the example now handles `Request` instances separately and falls back to response URL and default method values.
- The backend example read `X-Session-Replay-Id`, but the frontend checkout fetch examples did not send that header. Added `getCorrelationHeaders()` to the bridge and spread those headers into each checkout request so the backend example can receive the replay ID as described.

## Review Notes
- OpenTelemetry JS browser instrumentation and fetch instrumentation are still documented as experimental, and releases may include breaking changes.
- The `ZoneContextManager` is valid, but OpenTelemetry's Web SDK documentation notes that it requires transpiling code targeting ES2017 or newer back to ES2015.
