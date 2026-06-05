# Validation Summary: How to Build an Error Triage Dashboard from OpenTelemetry Span Events

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing and semantic conventions
- OpenTelemetry Collector span metrics connector
- Grafana Tempo and TraceQL
- Prometheus and PromQL
- Python, Flask, and Requests

## Sources Consulted
- OpenTelemetry trace exception specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry RPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/
- OpenTelemetry Collector span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector span metrics connector metadata and source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/spanmetricsconnector
- Grafana Tempo TraceQL query documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Flask quickstart and API routing documentation: https://flask.palletsprojects.com/
- Requests quickstart and API documentation: https://requests.readthedocs.io/

## Issues Found
- The Collector configuration used the deprecated `spanmetrics` connector type. Updated it to `span_metrics`, matching the current connector metadata while preserving the same pipeline behavior.
- The Collector configuration used deprecated `dimensions_cache_size`. Replaced it with `aggregation_cardinality_limit`, which is the current span metrics connector setting for controlling tracked dimension combinations.
- The HTTP dimensions used older semantic convention names, `http.method` and `http.status_code`. Updated them to `http.request.method` and `http.response.status_code` while keeping `http.route`.
- The PromQL examples used `traces_spanmetrics_calls_total`, but the current default namespace is `traces.span.metrics`, which Prometheus normalizes to `traces_span_metrics_calls_total`.
- The top exception types query tried to read `exception_type` from the calls counter. Exception type is an event attribute, so the Collector configuration now enables the span metrics events metric with `exception.type`, and the query uses `traces_span_metrics_events_total`.
- The TraceQL example used `status = error`. Updated it to the explicit intrinsic form `span:status = error`, which matches current TraceQL documentation.
- The Python example parsed Tempo trace details as `batches`, which does not match OTLP JSON trace responses. Updated it to iterate `resourceSpans`, `scopeSpans`, spans, and events.
- The Python example only handled string-valued OTLP attributes and ignored HTTP errors. Added a small attribute value helper and `raise_for_status()` calls.
- The Python example used `datetime.utcnow()`. Replaced it with timezone-aware `datetime.now(timezone.utc)`.
- Clarified that recording an exception event alone is not enough; the span status must also be set to `ERROR`.

## Review Notes
The guide is now technically consistent with current OpenTelemetry Collector span metrics behavior and current OpenTelemetry HTTP semantic conventions. Future readers may still need to adapt PromQL labels if their collector uses legacy feature gates, non-default namespaces, or older instrumentation that emits pre-stable HTTP attributes.
