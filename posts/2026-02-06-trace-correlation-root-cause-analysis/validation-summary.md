# Validation Summary: How to Use OpenTelemetry Trace Correlation to Accelerate Root Cause Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry trace context propagation
- OpenTelemetry Python instrumentation for Requests, Flask, logging, metrics, and spans
- W3C Trace Context
- OpenTelemetry Collector Prometheus exporter
- Prometheus / OpenMetrics exemplars
- Jaeger query API trace JSON
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry Python Requests instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry Python Flask instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python logging instrumentation source: https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/instrumentation/opentelemetry-instrumentation-logging
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry metrics SDK exemplar specification: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/metrics/sdk.md#exemplar
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusexporter
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry Propagators API specification: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/context/api-propagators.md
- Jaeger API documentation: https://www.jaegertracing.io/docs/1.55/apis/
- Jaeger trace JSON example in Grafana documentation: https://grafana.com/docs/grafana/latest/datasources/jaeger/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- OpenTelemetry cloud semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/cloud/

## Issues Found
- The propagation section said every HTTP, gRPC, or message request carries a `traceparent` header. W3C Trace Context defines HTTP headers, while OpenTelemetry propagators inject/extract context through carriers appropriate to each transport. Updated the wording to distinguish HTTP headers from gRPC and messaging metadata carriers.
- The Flask example used `FlaskInstrumentor().instrument(app=app)`. The documented app-specific API is `FlaskInstrumentor().instrument_app(app)`. Updated the snippet.
- The exemplar example stated that the SDK automatically attaches trace and span IDs to histogram recordings. Exemplars depend on exemplar sampling and exporter support, even though OpenTelemetry SDKs provide exemplar mechanisms. Updated the wording to make this conditional.
- The incident query example treated Jaeger span tags as a dictionary and read `span["process"]["serviceName"]`. Jaeger trace JSON represents tags as a list of key/value objects and service names in the trace-level `processes` map keyed by `processID`. Added a tag helper and updated service-name lookup.
- The Jaeger query tag filter used `"error":"true"` as a string. Updated it to the boolean filter `"error":true`.
- The span attribute example used `deployment.version`, which is not the stable service version semantic convention. Replaced it with `service.version` and made the commit attribute explicitly custom as `deployment.commit.sha`.

## Review Notes
The Collector Prometheus exporter setting `enable_open_metrics: true` is valid and is required for exporting exemplars from that exporter. The post still uses simplified snippets with placeholder objects such as `app`, `process`, and `execute_payment`, which is acceptable for a focused blog example.
