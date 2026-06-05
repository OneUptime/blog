# Validation Summary: How to Decide When You Need OpenTelemetry vs Simple Application Logging

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- Application logging
- Python logging
- OpenTelemetry Python tracing, metrics, sampling, and logging instrumentation
- OpenTelemetry Go tracing
- HTTP semantic conventions
- Distributed tracing, metrics, logs, SLOs, and sampling

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry metrics concepts: https://opentelemetry.io/docs/concepts/signals/metrics/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Python logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/logging.html
- OpenTelemetry Python sampling API documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry signals documentation: https://opentelemetry.io/docs/concepts/signals/

## Issues Found
- The first Python OpenTelemetry example used `time.time()` without importing `time`. Added `import time`.
- The Go tracing example had an incomplete import block: `context.Context` was used without importing `context`, and `attribute` was imported but unused. Added `context`, removed the unused import, and declared a tracer with `otel.Tracer(...)`.
- The HTTP request duration example claimed percentiles are automatically calculated directly from the instrumentation. Updated the wording to clarify that backends can use histogram data to calculate percentile views.
- The HTTP metric attributes used outdated or inaccurate names. Updated `http.method` to `http.request.method`, added `url.scheme`, and changed `http.status_code` to `http.response.status_code`.
- The hybrid Python example used `Status` and `StatusCode` without importing them. Added the missing import.
- The trace sampling example used `TracerProvider` without importing it. Added the missing import.
- The article described OpenTelemetry as capturing exactly three signal types. Adjusted the wording to refer to primary signal types such as traces, metrics, and logs, which is more accurate as OpenTelemetry evolves.

## Review Notes
The article is technically sound after the targeted fixes. Some snippets remain illustrative and depend on application-specific functions such as `charge_credit_card`, `validateOrder`, and `issue_refund`, which is appropriate for this guide.
