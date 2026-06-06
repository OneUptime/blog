# Validation Summary: How to Avoid the Anti-Pattern of Sending OTLP/HTTP Traffic to the gRPC Port

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OTLP/gRPC
- OTLP/HTTP
- OpenTelemetry JavaScript exporters
- OpenTelemetry Python gRPC exporter
- OpenTelemetry Collector OTLP receiver
- OpenTelemetry Collector health_check extension
- curl

## Sources Consulted
- OpenTelemetry OTLP Specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Protocol Exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP Exporter Configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Collector extensions documentation: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector health_check extension package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/healthcheckextension

## Issues Found
- The introduction described the mismatch as specifically "HTTP/1.1 requests to a gRPC endpoint." OTLP/HTTP may use HTTP/1.1 or HTTP/2 according to the OTLP specification, so I changed this to "OTLP/HTTP requests to a gRPC endpoint."
- The post listed `ECONNREFUSED` as a possible symptom of HTTP traffic hitting an active gRPC port. That error means the port is not listening or not reachable, so I clarified that it applies when the gRPC port is not listening or not exposed.
- The diagnostic section said HTTP exporters "must" use port 4318 and gRPC exporters "must" use port 4317. The OTLP spec defines these as default ports, but endpoints can be configured differently, so I changed the wording to identify them as defaults.
- The curl test for port 4317 expected "binary garbage or connection reset." A plain curl request to a gRPC endpoint is more accurately expected to fail with a protocol error or closed/reset connection, so I updated the expected result.
- The environment variable section said the SDK would pick the right port based on protocol, but the example explicitly sets both protocol and endpoint. I changed the wording to say the protocol and endpoint should be set together.
- The reverse mismatch section said port 4318 expects HTTP/1.1. OTLP/HTTP can use HTTP/1.1 or HTTP/2, and the important distinction is OTLP/HTTP paths and payloads versus the OTLP gRPC service, so I corrected that explanation.

## Review Notes
The JavaScript and Python exporter imports and constructor options are valid for the discussed OTLP exporters. The Collector OTLP receiver and health_check extension configuration snippets match official Collector configuration patterns. The `@opentelemetry/exporter-trace-otlp-http` dependency version shown is older, but it is only used as an example of identifying the exporter package and does not affect the technical point.
