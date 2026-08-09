# Validation Summary: OpenTelemetry Collector Returns “Unimplemented MetricsService”: Are You Sending the Wrong Signal to Jaeger?

## Status
validated

## Post Type
Troubleshooting and configuration guide

## Technologies Covered

- OpenTelemetry Protocol (OTLP/gRPC and OTLP/HTTP)
- OpenTelemetry SDK environment-based configuration
- OpenTelemetry Collector receivers, exporters, pipelines, and internal telemetry
- Jaeger OTLP ingestion and Service Performance Monitoring (SPM)
- gRPC status codes and server reflection
- grpcurl
- Prometheus and PromQL

## Sources Consulted

- [Jaeger 2.20 APIs and default ports](https://www.jaegertracing.io/docs/2.20/architecture/apis/)
- [Jaeger 2.20 Service Performance Monitoring architecture](https://www.jaegertracing.io/docs/2.20/architecture/spm/)
- [Jaeger 2.20 deployment documentation](https://www.jaegertracing.io/docs/2.20/deployment/)
- [OpenTelemetry Protocol specification 1.11.0](https://opentelemetry.io/docs/specs/otlp/)
- [OpenTelemetry OTLP exporter configuration specification](https://opentelemetry.io/docs/specs/otel/protocol/exporter/)
- [OpenTelemetry SDK environment variable specification](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/)
- [OpenTelemetry Collector configuration and pipeline documentation](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry Collector internal telemetry documentation](https://opentelemetry.io/docs/collector/internal-telemetry/)
- [OpenTelemetry Collector 0.158.0 release](https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.158.0)
- [OpenTelemetry Collector 0.158.0 OTLP receiver source](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.158.0/receiver/otlpreceiver/otlp.go)
- [OpenTelemetry Collector v0.144.0 exporter rename changelog](https://github.com/open-telemetry/opentelemetry-collector/blob/main/CHANGELOG.md#v1500v01440)
- [OpenTelemetry Collector 0.158.0 OTLP gRPC exporter](https://github.com/open-telemetry/opentelemetry-collector/tree/v0.158.0/exporter/otlpexporter)
- [gRPC status code documentation](https://grpc.io/docs/guides/status-codes/)
- [grpcurl documentation](https://github.com/fullstorydev/grpcurl)

## Issues Found

- The Collector examples used the deprecated `otlp` gRPC exporter component name. Collector v0.144.0 renamed this component to `otlp_grpc` and retained `otlp` only as a deprecated alias. Updated the exporter IDs, pipeline references, log-field example, prose, and verification step to use `otlp_grpc/jaeger` and `otlp_grpc/metrics_backend`.
- The Collector structured-log example used the older `kind`, `data_type`, and `name` keys. Updated it to the current `otelcol.component.kind`, `otelcol.signal`, and `otelcol.component.id` keys.
- “A separate export service for each signal” was too broad now that OTLP also has a development-status profiles service. Scoped the statement to the three stable signals discussed in the post: traces, metrics, and logs.
- Jaeger ports `4317` and `4318` were presented without noting that they are defaults and can be reconfigured. Clarified that the table contains default endpoints and that `4317` is the default OTLP/gRPC listener.
- `otelcol components` reports trace, metric, and log support/stability, but its output is not a complete inventory of every developing signal. Narrowed the claim to the signal fields the command currently reports.

## Review Notes

- Both complete Collector YAML examples were validated successfully with the official `otelcol-contrib` 0.158.0 binary. The traces-only receiver behavior was also checked against the current OTLP receiver source, which registers each gRPC service only when that signal has a connected pipeline.
- A live Collector 0.158.0 check confirmed the current structured log keys and the default Prometheus name `otelcol_exporter_send_failed_metric_points`. Custom Prometheus reader settings can render counters with a `_total` suffix, so the post's suffix caveat is correct.
- `otelcol components` in Collector 0.158.0 reports trace, metric, and log stability for the compiled components, as described after the correction.
- The `grpcurl -plaintext jaeger:4317 list` syntax and `-plaintext` flag were checked against current grpcurl help and documentation. The post correctly treats missing reflection as inconclusive.
- Jaeger's `latest` documentation resolved to Jaeger 2.20 on the validation date. The verified ports are defaults and remain configurable.
