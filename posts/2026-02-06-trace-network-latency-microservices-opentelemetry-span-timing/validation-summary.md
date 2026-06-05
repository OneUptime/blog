# Validation Summary: How to Trace Network Latency Between Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OpenTelemetry Python Flask instrumentation
- OpenTelemetry Python Requests instrumentation
- OTLP gRPC exporter
- OpenTelemetry Collector configuration
- Flask
- Python
- HTTP distributed tracing

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python OTLP gRPC trace exporter API/source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/exporter/otlp/proto/grpc/trace_exporter.html
- OpenTelemetry Python Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python Requests instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/requests.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector batch processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor

## Issues Found
- The post described span timing as a way to calculate "actual network latency" and said OpenTelemetry could answer the question "precisely." This was too strong. OpenTelemetry HTTP client and server spans measure application-layer operations, so the timestamp differences estimate service-to-service overhead rather than pure TCP/network latency. I changed the wording to "estimate" and clarified the included overheads.
- The post stated that the gap between the client span start and server span start represents network transit time. This omitted client-side request handling, connection setup or pool wait, and server-side dispatch/queuing. I updated the explanation to describe it as request-side service-to-service delay.
- The example said a Python script "pulls spans from an OTLP-compatible backend." OTLP is an ingestion/export protocol, while querying traces is backend-specific. I changed the wording to say the spans should be retrieved through the backend's trace query API before running the calculation.
- The calculation function and output used `compute_network_latency`, `request_network_ms`, `response_network_ms`, and `total_network_overhead_ms`, which overstated what the values represent. I renamed them to `compute_service_path_latency`, `request_path_ms`, `response_path_ms`, and `total_path_overhead_ms`.

## Review Notes
The Python instrumentation examples use current OpenTelemetry Python APIs for Flask, Requests, `TracerProvider`, `BatchSpanProcessor`, and the OTLP gRPC span exporter. The Collector receiver, batch processor, exporter, and trace pipeline configuration are structurally consistent with current Collector documentation. The latency calculation remains an approximation and depends on accurate clock synchronization and the backend preserving client/server span timestamps and parent-child relationships.
