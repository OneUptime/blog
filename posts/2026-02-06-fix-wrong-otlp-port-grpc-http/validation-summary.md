# Validation Summary: How to Fix the Common Mistake of Using the Wrong OTLP Port

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OTLP/gRPC
- OTLP/HTTP
- Node.js OpenTelemetry exporters
- Python OpenTelemetry exporters
- grpcurl
- curl
- Linux networking tools (`netstat`, `ss`)

## Sources Consulted
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry JavaScript OTLP gRPC trace exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry JavaScript OTLP HTTP trace exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-http.html
- OpenTelemetry JavaScript OTLP protobuf trace exporter docs: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_exporter-trace-otlp-proto.OTLPTraceExporter.html
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python OTLP HTTP trace exporter source docs: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/exporter/otlp/proto/http/trace_exporter.html
- OpenTelemetry Python OTLP gRPC trace exporter source docs: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/exporter/otlp/proto/grpc/trace_exporter.html
- grpcurl official repository: https://github.com/fullstorydev/grpcurl
- Local command help for `curl`, `ss`, and `netstat`

## Issues Found
- The post said OTLP/HTTP uses HTTP/1.1. The OTLP specification allows OTLP/HTTP over HTTP/1.1 or HTTP/2, so the wording was corrected.
- The Node.js HTTP/protobuf example used `@opentelemetry/exporter-trace-otlp-http`, which the OpenTelemetry JS docs describe as HTTP/JSON. The package was changed to `@opentelemetry/exporter-trace-otlp-proto`, which is the JS protobuf-over-HTTP trace exporter.
- The package table listed `exporter-trace-otlp-http` for HTTP/protobuf. It was updated to `exporter-trace-otlp-proto` to match the corrected Node.js example.

## Review Notes
The core port mapping is correct: OTLP/gRPC defaults to 4317 and OTLP/HTTP defaults to 4318. The HTTP endpoint paths (`/v1/traces`, `/v1/metrics`, `/v1/logs`), Collector receiver configuration shape, Python exporter imports, environment variable values, and diagnostic commands are technically valid. Environment-variable support can vary by language and setup, but the variables shown are standard OpenTelemetry configuration.
