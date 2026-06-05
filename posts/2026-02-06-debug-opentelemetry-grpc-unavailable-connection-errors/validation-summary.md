# Validation Summary: How to Debug OpenTelemetry gRPC 'Unavailable' Connection Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry SDKs and OTLP exporters
- OpenTelemetry Collector
- OTLP/gRPC and OTLP/HTTP
- gRPC status codes
- Python, Node.js, and Go OpenTelemetry exporters
- Docker Compose networking
- Kubernetes DNS and NetworkPolicy
- Linux networking tools (`ss`, `netstat`, `nc`, `curl`)

## Sources Consulted
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry JavaScript OTLP gRPC exporter documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry Collector TLS configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- gRPC status code documentation: https://grpc.io/docs/guides/status-codes/
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Local `ss`, `docker ps`, and `curl` help output

## Issues Found
- The Python TLS example used `ssl_channel_credentials()` without importing it. Added `from grpc import ssl_channel_credentials` so the snippet is runnable.
- The environment-variable TLS example claimed the approach works across all SDKs. OpenTelemetry documents these variables in the specification, but language support can vary, so the wording now says it applies to SDKs that support standard OTLP environment variables.
- The Kubernetes debug pod command omitted `--restart=Never`. Added it to match the official `kubectl run` pattern for interactive one-off pods.
- The Docker Compose example used the obsolete top-level `version: '3.8'` field. Removed it because current Compose treats `version` as informative and warns that it is obsolete.
- The HTTP exporter note said the HTTP exporter always requires a path. Clarified that directly configured signal-specific HTTP exporter endpoints should include `/v1/traces`, `/v1/metrics`, or `/v1/logs`; the generic `OTEL_EXPORTER_OTLP_ENDPOINT` behavior can append paths automatically.
- The debug logging section used `OTEL_PYTHON_LOG_LEVEL`, which is not documented in the current OpenTelemetry Python SDK environment variables. Removed it and kept the standard `OTEL_LOG_LEVEL`.
- The debug logging explanation overstated that logs will show exact DNS lookups and TLS handshakes. Reworded it to say debug logs can provide more detail about connection attempts, exporter failures, collector errors, and related clues.

## Review Notes
The remaining examples are technically sound for a general troubleshooting guide. Exact SDK defaults and environment-variable support still vary by language and version, so future updates should keep language-specific setup examples aligned with each SDK's current documentation.
