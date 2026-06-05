# Validation Summary: How to Configure the Google Cloud Operations Exporter

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Google Cloud Operations exporter (`googlecloud`)
- Google Cloud Monitoring
- Cloud Trace
- Cloud Logging
- Google Cloud IAM and Application Default Credentials
- OpenTelemetry Collector processors and connectors
- `gcloud` CLI

## Sources Consulted
- OpenTelemetry Collector Contrib `googlecloudexporter` documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/googlecloudexporter
- Google Cloud guide for deploying the OpenTelemetry Collector: https://docs.cloud.google.com/stackdriver/docs/instrumentation/opentelemetry-collector-cos
- OpenTelemetry Collector exporter list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector `span_metrics` connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/spanmetricsconnector
- OpenTelemetry Collector routing connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Collector metrics transform processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql

## Issues Found
- The exporter examples used `credentials_file`, which is not a `googlecloud` exporter configuration field. Updated the examples to use Application Default Credentials and `GOOGLE_APPLICATION_CREDENTIALS`.
- Several trace exporter settings were invalid or misplaced. Removed unsupported per-trace `compression`, per-trace `timeout`, and `queue_size`; moved timeout to the exporter level.
- The examples used `retry_on_failure`, which is not part of the current `googlecloud` exporter config. Removed it.
- Some `default_log_name` examples used full Cloud Logging resource paths. Replaced them with log IDs, matching the exporter documentation.
- The metrics transform example used `aggregation_type` directly with `action: update`. Updated it to use an `aggregate_labels` operation.
- The multi-project routing example used the deprecated routing processor. Replaced it with the current routing connector pattern.
- The span metrics examples used the deprecated spanmetrics processor form. Replaced them with the `span_metrics` connector.
- The alert policy commands used non-current flags such as `--condition-threshold-value`, `--condition-threshold-duration`, and `--condition-expression`. Updated them to `--condition-filter`, `--if`, and `--duration`.
- The Metrics Explorer section presented MQL without a caveat. Added the current deprecation caveat that MQL is no longer recommended for new dashboards and alerts, while still executable.
- The production example used `service.telemetry.metrics.address`, which is ignored in current Collector versions. Replaced it with `service.telemetry.metrics.level`.

## Review Notes
YAML snippets were parsed successfully after edits. Full Collector startup validation was not run because no `otelcol` or `otelcol-contrib` binary is installed in the workspace.
