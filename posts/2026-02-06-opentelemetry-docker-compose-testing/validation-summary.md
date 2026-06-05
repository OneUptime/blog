# Validation Summary: How to Test OpenTelemetry Instrumentation in Docker Compose Environments Before

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry SDK environment variables
- OpenTelemetry Collector
- OpenTelemetry Collector OTLP, file, and debug exporters
- Jaeger all-in-one
- Docker Compose
- Bash
- Python
- Kubernetes Deployment environment variables
- PostgreSQL

## Sources Consulted
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector troubleshooting documentation for the debug exporter: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector file exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/fileexporter
- Jaeger deployment documentation for all-in-one and OTLP ports: https://www.jaegertracing.io/docs/1.76/deployment/
- Docker Compose `up` CLI reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Local CLI/image checks: `docker compose up --help`, `docker run --rm otel/opentelemetry-collector-contrib:latest components`, and Docker image inspection for `otel/opentelemetry-collector-contrib:latest`.

## Issues Found
- The Compose snippet used the obsolete top-level `version: '3.8'` field. Removed it because current Docker Compose uses the Compose Specification and treats `version` as only informative/obsolete.
- The application services sent telemetry to OTLP gRPC port `4317` without explicitly setting the OTLP protocol. Added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` to avoid SDKs using the current HTTP/protobuf default against the gRPC port.
- The Collector exported to `jaeger:4317`, but the Jaeger all-in-one service did not enable the OTLP receiver. Added `COLLECTOR_OTLP_ENABLED: "true"` to the Jaeger service.
- The file exporter wrote to `/tmp/traces.json`, but the OpenTelemetry Collector contrib image runs as a non-root user and the file exporter documentation requires an explicitly writable path. Added a mounted `./file-exporter:/file-exporter` directory, set the local test Collector container to run as root, and changed the file exporter path to `/file-exporter/traces.json` with `create_directory: true`.

## Review Notes
The snippets parse as valid YAML/Python. The local Collector contrib image reports the required `otlp`, `batch`, `debug`, and `file` components. The example still uses `latest` image tags, which is workable for a local tutorial but should be pinned in production-grade examples for repeatability.
