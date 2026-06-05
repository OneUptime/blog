# Validation Summary: How to Troubleshoot Collector Startup Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector and OpenTelemetry Collector Contrib
- Collector YAML configuration
- Collector receivers, processors, exporters, connectors, extensions, and service pipelines
- Kubernetes ConfigMaps, Deployments, Services, and resource limits
- Docker and Docker Compose
- Linux/macOS diagnostic commands for files, ports, processes, and logs

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Collector exporter helper package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- Current `otel/opentelemetry-collector-contrib:latest` Docker image, version 0.153.0, using `--help`, `validate`, `components`, and runtime smoke tests

## Issues Found
- The post stated that the OTLP receiver `endpoint` field is required. Current Collector validation accepts an OTLP gRPC receiver without an explicit endpoint because endpoints have defaults. Changed the example to use the actual required OTLP receiver condition: at least one protocol must be configured.
- Several sample error messages did not match the current Collector validation output. Updated the `betch`, `transform`, undefined exporter, and connector cycle examples to align with current validation wording.
- One network-connectivity configuration snippet defined `processors` twice. Removed the duplicate key so the YAML example does not rely on duplicate-map behavior.
- The exporter `timeout` comment described it as a startup connection timeout. Updated it to describe the documented behavior: timeout per export attempt.
- The Docker debug logging example used `OTEL_LOG_LEVEL=debug`, which configures SDK internal logger behavior and did not enable Collector debug logs in a current Collector smoke test. Replaced it with the documented `--set=service.telemetry.logs.level=debug` override.

## Review Notes
The article uses `latest` container tags for examples, which is common in tutorials but not ideal for reproducible production deployments. Consider pinning Collector image versions in future production-oriented posts.
