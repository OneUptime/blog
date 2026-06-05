# Validation Summary: How to Instrument a SaaS Multi-Tenant Application with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- OpenTelemetry Python API
- OpenTelemetry baggage and context propagation
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Collector routing connector
- Starlette middleware
- Prometheus / Grafana queries
- W3C Baggage propagation

## Sources Consulted
- OpenTelemetry Python baggage API: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Python propagation docs: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP spans semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Collector transform processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector tail sampling processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector routing connector docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus compatibility notes: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/

## Issues Found
- The Starlette middleware sample used `JSONResponse` without importing it. Added the correct `from starlette.responses import JSONResponse` import and removed an unused `Span` import.
- The middleware comment said the current span was created by "OTLP HTTP instrumentation." OTLP is an export protocol, not the server instrumentation layer. Updated the comment to refer to ASGI/Starlette instrumentation.
- The HTTP request duration metric used `unit="ms"` and accepted `duration_ms`, but the stable OpenTelemetry HTTP metric semantic convention uses seconds (`unit="s"`). Updated the example to record `duration_s`.
- The metrics example used older HTTP attribute names (`http.method`, `http.status_code`). Updated them to the stable semantic convention attributes `http.request.method` and `http.response.status_code`.
- The routing connector example matched `attributes["tenant.plan"]` without specifying an OTTL context. The routing connector defaults to resource context, while the article sets `tenant.plan` on spans. Added `context: span` to both routing table entries.
- The Grafana/Prometheus example used metric and label names that did not match the default OpenTelemetry-to-Prometheus translation for a seconds histogram and stable HTTP status attribute. Updated the queries to use `http_server_request_duration_seconds_count`, `http_server_request_duration_seconds_bucket`, and `http_response_status_code`.

## Review Notes
The remaining code is illustrative and depends on application-provided functions such as `decode_jwt`, `get_tenant_plan`, and `compute_tenant_usage`. The tenant-related attribute names are custom attributes, which is appropriate for application-specific tenant context, but teams should still manage metric cardinality carefully.
