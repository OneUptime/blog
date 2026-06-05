# Validation Summary: How to Fix Collector Exporter Timeout Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP gRPC exporter
- Collector internal telemetry
- Collector batch processor
- Collector debug exporter
- Collector health check extension
- Kubernetes DNS configuration
- Prometheus and Grafana
- TLS and gRPC keepalive

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector gRPC configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry Collector TLS configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector health check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The diagnostic exporter example used the deprecated `logging` exporter and `loglevel`. Replaced it with the current `debug` exporter and `verbosity` setting, and removed the duplicate top-level `service` key in that snippet.
- The internal metrics example used `service.telemetry.metrics.address`, which is ignored by Collector v0.123.0 and newer. Replaced it with the current `readers` Prometheus pull exporter configuration.
- Several PromQL examples referenced nonexistent or outdated metrics such as `otelcol_exporter_send_duration_bucket`, `otelcol_exporter_timeout_seconds`, and `otelcol_processor_batch_batch_size_trigger_send_bucket`. Updated the examples to use current Collector internal telemetry metrics, including `rpc.client.call.duration`, `otelcol_exporter_send_failed_spans`, `otelcol_exporter_in_flight_requests`, and `otelcol_processor_batch_batch_send_size`.
- The DNS cache section showed a local sidecar and an environment variable that would not configure pod DNS resolution. Replaced it with a NodeLocal DNSCache-oriented pod DNS configuration and clarified that the cluster must already be configured for it.
- The TLS example attempted to configure TLS 1.3 cipher suites through `cipher_suites`. Go does not allow configuring TLS 1.3 cipher suites that way, so the example now leaves cipher suites unset unless a legacy TLS policy is required.
- The OTLP exporter examples included HTTP client connection pool fields and `max_msg_size_mib`, which are not supported OTLP gRPC exporter settings. Removed those fields and clarified that gRPC reuses HTTP/2 connections.
- The retry example included `randomization_factor`, which is not documented as a current Collector exporter helper setting. Removed it and kept the supported retry settings.
- The health check example used `check_collector_pipeline` to detect backend issues. The current health check extension documentation warns that this feature is not working as expected, so the example now uses the extension only for Collector liveness.
- Dashboard and alert examples claimed timeout-specific metrics and labels that Collector internal metrics do not expose. Updated them to alert on send failures and high gRPC export duration, with logs used to confirm whether failures are timeouts.

## Review Notes
The post is now technically valid for current OpenTelemetry Collector behavior, but several examples are intentionally partial snippets rather than complete runnable Collector configurations. Future revisions could add version notes for Collector v0.120+ Prometheus metric naming and for environments that still expose older underscore-form RPC metric names.
