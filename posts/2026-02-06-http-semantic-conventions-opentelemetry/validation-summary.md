# Validation Summary: How to Apply HTTP Semantic Conventions in OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry HTTP semantic conventions
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry JavaScript HTTP and Express instrumentation
- OpenTelemetry Python SDK
- OpenTelemetry Python requests instrumentation
- Express
- Python requests
- OTLP trace exporters

## Sources Consulted
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry JavaScript HTTP instrumentation docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-http.html
- OpenTelemetry JavaScript HTTP instrumentation config API: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_instrumentation-http.HttpInstrumentationConfig.html
- OpenTelemetry JavaScript resource docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry Python requests instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry Python requests instrumentation source docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/requests.html
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/

## Issues Found
- The JavaScript setup used `new Resource(...)` from `@opentelemetry/resources`, which is outdated in current OpenTelemetry JS examples. Changed it to `resourceFromAttributes(...)`.
- The JavaScript and Python auto-instrumentation examples described stable HTTP semantic convention attributes without enabling stable HTTP semconv emission. Added `OTEL_SEMCONV_STABILITY_OPT_IN=http` in both examples and clarified the prose.
- The span naming section said HTTP client spans should always use only the HTTP method. Updated it to mention that a low-cardinality URL template may be included when available and enabled.
- The manual header examples set `http.request.header.*` attributes to scalar strings. Updated them to use string arrays, which matches the HTTP header semantic convention value type.
- The status-code example set a span status message based on the HTTP status code. Removed the message because the OpenTelemetry HTTP span spec says not to set a status description when the reason can be inferred from `http.response.status_code`.
- The attribute reference labeled `http.response.status_code` as always required. Changed the wording to note that it applies when a response status code was sent or received.
- The body-size attributes were presented as simply optional. Clarified that these are optional or opt-in attributes because `http.request.body.size` and `http.response.body.size` are currently development/opt-in semantic conventions.
- The sanitization section implied semantic conventions provide sanitization hooks and that a request hook removes sensitive headers. Reworded it to refer to instrumentation hooks/configuration and adjusted the example to only add safe headers plus configure query-parameter redaction.

## Review Notes
The Python semantic convention constants used in the manual span example were checked against the current `opentelemetry-semantic-conventions` package in an isolated temporary install. The SQL examples remain backend-specific pseudocode, but the attribute names they query are consistent with the stable HTTP conventions after the semconv opt-in clarifications.
