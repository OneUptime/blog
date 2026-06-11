# Validation Summary: How to Create OpenTelemetry Datadog Exporter

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector Datadog Exporter
- Datadog APM, metrics, and logs ingestion
- OpenTelemetry Collector Helm chart
- OpenTelemetry JavaScript SDK for Node.js
- OTLP gRPC and HTTP

## Sources Consulted
- OpenTelemetry Collector Contrib Datadog Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/datadogexporter/README.md
- OpenTelemetry Collector Contrib Datadog Exporter example configuration: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/datadogexporter/examples/collector.yaml
- Datadog OpenTelemetry Collector Exporter documentation: https://docs.datadoghq.com/opentelemetry/setup/collector_exporter/
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector installation documentation: https://opentelemetry.io/docs/collector/install/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry JavaScript Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry Collector Contrib v0.154.0 binary validation with `otelcol-contrib validate`
- Current npm packages: `@opentelemetry/sdk-node@0.218.0`, `@opentelemetry/exporter-trace-otlp-grpc@0.218.0`, `@opentelemetry/api@1.9.1`

## Issues Found
- The install command used the outdated `otelcol-contrib` v0.96.0 release while describing the latest release. Updated the Linux amd64 example to v0.154.0, the current release found during review.
- The Helm install command omitted the required `mode` value for the OpenTelemetry Collector chart. Added `--set mode=deployment` so the command is valid for the current chart.
- Collector YAML examples used `${VAR}` environment variable syntax. Updated Collector configuration snippets to the documented `${env:VAR}` syntax used by current OpenTelemetry Collector examples.
- The complete configuration used deprecated/removed `service.telemetry.metrics.address`. Replaced it with the current `service.telemetry.metrics.readers` Prometheus pull exporter configuration. The corrected complete YAML validates with `otelcol-contrib` v0.154.0.
- The `trace_buffer` comment described trace aggregation. Updated it to describe the actual behavior: buffering outgoing trace payloads.
- The logs section stated trace correlation would happen automatically. Tightened the wording to say OTLP logs can be correlated when trace context is present.

## Review Notes
- The Datadog exporter configuration fields used in the post, including `span_name_as_resource_name`, histogram `mode: distributions`, `send_aggregation_metrics`, `cumulative_monotonic_mode: to_delta`, summary `mode: gauges`, and `host_metadata` settings, are present in the current official Datadog exporter example.
- The TypeScript sample type-checks with the current OpenTelemetry JavaScript packages listed above.
- Current Datadog exporter documentation notes that APM stats computation should use the Datadog Connector. The post focuses on exporting telemetry directly to Datadog; a future revision could add the connector when covering trace metrics and full APM stats behavior.
