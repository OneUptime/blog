# Validation Summary: How to Set Up OpenTelemetry for a Small Team Without a Dedicated SRE

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry auto-instrumentation
- OpenTelemetry Python instrumentation
- OpenTelemetry JavaScript/Node.js SDK
- OpenTelemetry Java agent
- OpenTelemetry Collector
- OTLP over HTTP/protobuf and gRPC
- Docker Compose
- Kubernetes ConfigMaps and Deployments
- Tracing, metrics, sampling, and alerting

## Sources Consulted
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python zero-code instrumentation configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry Java SDK and agent configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector troubleshooting/debug exporter documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector logging-to-debug exporter migration announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Collector official releases: https://github.com/open-telemetry/opentelemetry-collector-releases

## Issues Found
- The Python auto-instrumentation snippet used port 4318 but did not specify OTLP/HTTP. Added `--exporter_otlp_protocol http/protobuf` so the endpoint and protocol match the OpenTelemetry Python configuration guidance.
- The Python command block was marked as `python` even though it contained shell commands. Changed the fence to `bash`.
- The Node.js example set `serviceName` directly on `NodeSDK`, while current OpenTelemetry JavaScript docs set service identity through resource attributes. Replaced it with `resourceFromAttributes` and `ATTR_SERVICE_NAME`.
- The Node.js OTLP HTTP/protobuf example imported `@opentelemetry/exporter-trace-otlp-http`; current OpenTelemetry JavaScript docs use `@opentelemetry/exporter-trace-otlp-proto` for HTTP/protobuf. Updated the import.
- The Java agent example used the OTLP HTTP port without explicitly setting the protocol. Added `-Dotel.exporter.otlp.protocol=http/protobuf` for clarity and portability.
- Shared environment-variable examples used the OTLP HTTP port without specifying `OTEL_EXPORTER_OTLP_PROTOCOL`. Added `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` to the managed backend, Docker Compose, standard service configuration, and Kubernetes ConfigMap examples.
- The Collector Docker image was pinned to `otel/opentelemetry-collector:0.91.0`, which is outdated for a 2026 guide. Updated it to `otel/opentelemetry-collector:0.153.0`, the current official release available during validation.
- The Collector configuration used the deprecated/removed `logging` exporter. Replaced it with the current `debug` exporter and changed `loglevel: debug` to `verbosity: detailed`.
- The Collector backend exporter used the gRPC `otlp` exporter with an HTTPS HTTP-style endpoint. Changed it to the `otlphttp` exporter and updated pipelines to export via `otlphttp`.

## Review Notes
The high-level guidance is technically sound. In future revisions, consider making vendor examples deliberately generic or timestamped, because free tiers and product names can change faster than OpenTelemetry APIs.
