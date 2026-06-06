# Validation Summary: How to Compare OTLP/gRPC vs OTLP/HTTP for Telemetry Export

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OTLP/gRPC
- OTLP/HTTP
- OpenTelemetry Collector
- OpenTelemetry Python OTLP exporters
- OpenTelemetry JavaScript OTLP exporters
- NGINX gRPC and HTTP proxying
- TLS and CORS

## Sources Consulted
- OpenTelemetry OTLP Specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Python OTLP exporter API docs: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Python OTLP exporter source: https://github.com/open-telemetry/opentelemetry-python
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- NGINX release documentation for the HTTP/2 directive: https://docs.nginx.com/nginx/releases/
- NGINX gRPC proxy documentation/blog: https://blog.nginx.org/blog/nginx-1-13-10-grpc

## Issues Found
- The OTLP/gRPC fundamentals described the transport as a "persistent bidirectional connection." OTLP uses request/response export calls over gRPC; changed this to "persistent connection" to avoid implying bidirectional streaming.
- The Collector YAML referenced `batch` and `otlp` in the service pipeline without defining the processor or exporter. Added minimal `processors.batch` and `exporters.otlp` entries so the example is structurally complete.
- The Collector CORS example used an `Authorization` header in browser and SDK examples but allowed only `Content-Type`. Added `Authorization` to `allowed_headers`.
- The Python gRPC exporter snippet used `Compression.Gzip` without importing the gRPC `Compression` enum. Added `from grpc import Compression`.
- The Python HTTP exporter snippet used `Compression.Gzip` without importing the OpenTelemetry HTTP exporter `Compression` enum. Added `from opentelemetry.exporter.otlp.proto.http import Compression`.
- The explicit Python OTLP/HTTP endpoints omitted `/v1/traces`. The Python exporter does not append the trace path when an endpoint is passed directly, so the examples now include `/v1/traces`.
- The JSON serialization example implied the shown Python OTLP/HTTP protobuf exporter could be configured for JSON without showing a real supported option. Reworded the snippet to say that JSON requires an SDK/exporter that explicitly supports OTLP/HTTP JSON.
- The NGINX gRPC example used the deprecated `listen ... http2` parameter. Updated it to the current `http2 on;` directive form.

## Review Notes
The benchmark table is framed as rough illustrative numbers and not sourced to a specific benchmark. It is acceptable as general guidance, but future revisions would be stronger if they linked to a reproducible benchmark methodology.
