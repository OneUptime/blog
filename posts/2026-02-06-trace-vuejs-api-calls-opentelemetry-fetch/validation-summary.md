# Validation Summary: How to Trace Vue.js API Calls with OpenTelemetry Fetch Instrumentation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry browser tracing
- OpenTelemetry fetch instrumentation
- OpenTelemetry XMLHttpRequest instrumentation
- OTLP HTTP trace exporter
- Vue.js 3 Composition API
- JavaScript Fetch API
- Browser Performance API

## Sources Consulted
- OpenTelemetry Fetch Instrumentation API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-fetch.html
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry semantic conventions JavaScript package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry resource concepts documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry deployment semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- MDN Fetch API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
- Vue Composition API documentation: https://vuejs.org/guide/extras/composition-api-faq

## Issues Found
- The tracing setup used the old `new Resource(...)`, `SemanticResourceAttributes`, and `provider.addSpanProcessor(...)` style. Updated it to `resourceFromAttributes(...)`, stable `ATTR_*` semantic convention constants, and `spanProcessors` in the `WebTracerProvider` constructor.
- The fetch custom attribute hook assumed `request.url` always exists. Current fetch instrumentation passes `Request | RequestInit`, so `fetch(url, options)` can provide a `RequestInit` without a URL. Updated the snippet to derive the URL from `Request` or `Response`.
- Several manual HTTP span attributes used older names such as `http.method`, `http.url`, `http.target`, and `http.status_code`. Updated them to current stable semantic convention names where applicable.
- The `APIClient` class was imported by name in the retry example but was not exported by name in the client snippet. Updated the class declaration to `export class APIClient`.
- The component example claimed API calls would create child spans, but the component span was not made active. Wrapped the API call in `context.with(trace.setSpan(...))` so the child-span relationship works as described.
- The retry helper ended its span only on failed operations. Moved `span.end()` into a `finally` block so successful retries close the span too.
- The retry client attempted to retry 5xx responses, but `fetch` resolves HTTP error responses instead of throwing. Updated the retry wrapper to throw an error with `error.response` attached when `response.ok` is false.

## Review Notes
OpenTelemetry browser instrumentation remains experimental, and the fetch instrumentation documentation notes that experimental packages may introduce breaking changes. Future reviews should re-check the exact package versions used by the application.
