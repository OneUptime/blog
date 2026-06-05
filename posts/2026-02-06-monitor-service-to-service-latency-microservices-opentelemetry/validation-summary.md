# Validation Summary: How to Monitor Service-to-Service Latency in Microservices with OpenTelemetry

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python tracing API and SDK
- OpenTelemetry Python metrics API and SDK
- OpenTelemetry FastAPI instrumentation
- OpenTelemetry HTTPX instrumentation
- OpenTelemetry Collector
- OpenTelemetry Collector spanmetrics connector
- OpenTelemetry HTTP and peer service semantic conventions
- FastAPI
- HTTPX
- OTLP over gRPC
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python FastAPI instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry Python HTTPX instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/httpx/httpx.html
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- OpenTelemetry peer service attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/peer/
- OpenTelemetry Collector spanmetrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector connector documentation: https://opentelemetry.io/docs/collector/components/connector/

## Issues Found
- The B3 propagator imports were active even though B3 was only shown as an optional commented configuration. Moved those imports into the commented optional block so the base tracing example does not require `opentelemetry-propagator-b3`.
- The custom span example used older HTTP semantic attributes: `http.method`, `http.url`, and `http.status_code`. Updated them to the current stable names `http.request.method`, `url.full`, and `http.response.status_code`.
- The custom span example used deprecated `peer.service`. Updated it to `service.peer.name` and adjusted the service map explanation and Collector dimensions to match.
- The span status example used a less canonical Python call form. Updated it to use `Status(StatusCode.ERROR)`, matching the OpenTelemetry Python documentation.
- The metrics module created the meter and instruments before `setup_metrics()` installed the SDK `MeterProvider`, which could leave the instruments as no-op instruments. Moved meter and instrument creation into `setup_metrics()` after `metrics.set_meter_provider(provider)`.
- The metrics example said bucket boundaries were chosen but did not configure any bucket boundary advisory. Added `explicit_bucket_boundaries_advisory` to the histogram.
- The manual metric attributes used the older `http.method` attribute name. Updated it to `http.request.method`.
- The Collector `spanmetrics` histogram buckets were written as bare numbers even though the connector documents duration values such as `5ms` and `1s`. Updated the buckets to explicit duration values.
- The Collector `spanmetrics` configuration used deprecated `dimensions_cache_size`. Replaced it with `aggregation_cardinality_limit`.

## Review Notes
The post is technically relevant and the examples are valid after the corrections above. The Python snippets were syntax-checked with `python3` AST parsing. The examples still use a custom latency metric in milliseconds for readability, while current built-in OpenTelemetry HTTP duration semantic conventions use seconds for standard HTTP client/server duration metrics.
