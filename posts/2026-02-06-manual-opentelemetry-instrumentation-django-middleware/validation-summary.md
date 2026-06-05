# Validation Summary: How to Add Manual OpenTelemetry Instrumentation to Django Middleware

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- Django middleware
- OpenTelemetry Python API and SDK
- OpenTelemetry tracing
- OpenTelemetry metrics
- OTLP HTTP exporters
- OpenTelemetry HTTP semantic conventions

## Sources Consulted
- Django middleware documentation: https://docs.djangoproject.com/en/dev/topics/http/middleware/
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Python sampling reference: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OneUptime OTLP configuration guidance for its ingest endpoint and token header: https://oneuptime.com/blog/post/2026-01-24-configure-opentelemetry-protocol-otlp/view

## Issues Found
- The SDK setup configured only tracing, while the post later claimed that middleware metrics would be recorded. Added OpenTelemetry Python metrics SDK setup with `MeterProvider`, `PeriodicExportingMetricReader`, and `OTLPMetricExporter`.
- The OneUptime OTLP header used `x-oneuptime-service-token`, while current OneUptime examples use `x-oneuptime-token`. Updated the trace and metric exporter examples.
- The basic middleware used older HTTP semantic convention attributes such as `http.method`, `http.url`, `http.target`, and `http.status_code`. Updated the examples and test assertions to current stable attributes such as `http.request.method`, `url.full`, `url.path`, and `http.response.status_code`.
- The request span name used the raw path, which current OpenTelemetry HTTP semantic conventions say instrumentations must not use as the default span target because it can be high-cardinality. Changed the basic example span name to the request method.
- The span status logic marked all 4xx server responses as errors and explicitly set OK for successful responses. Current HTTP semantic conventions require server spans to leave 1xx-4xx status unset unless application context says otherwise, and to mark 5xx responses as errors. Updated the example accordingly.
- The middleware measured response body size using `len(response.content)` unconditionally, which fails for streaming responses. Added a `hasattr(response, "content")` guard.
- The business context example was shown before authentication in the request flow, which means `request.user` may not be populated. Updated the middleware ordering example and flow diagram so business context runs after authentication.
- The metrics example imported unused tracing APIs, used older HTTP attribute names, and recorded duration in milliseconds under the standard `http.server.request.duration` metric, whose current semantic convention unit is seconds. Removed unused imports, updated attributes, changed duration to seconds, and made custom request/active counters explicitly application-prefixed.
- The rate-limit and error middleware assumed `request.user` always exists. Added `hasattr(request, "user")` checks to avoid failures when authentication middleware is absent or ordered differently.
- The sampling section described middleware as implementing adaptive sampling after response processing. OpenTelemetry Python sampling decisions are made when spans are created, so the section was corrected to describe sampling hint attributes for downstream tail-sampling policies.

## Review Notes
- Local checks: all embedded Python snippets parsed successfully with `ast.parse`, the Bash snippet passed `bash -n`, the related OneUptime article URL returned HTTP 200, and `validation.json` was created in valid JSON format.
- Runtime validation against a live Django app or OTLP backend was not performed in this workspace because Django and OpenTelemetry packages are not installed locally.
