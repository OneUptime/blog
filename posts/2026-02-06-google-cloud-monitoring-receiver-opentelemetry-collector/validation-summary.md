# Validation Summary: How to Configure the Google Cloud Monitoring Receiver

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Google Cloud Monitoring Receiver
- Google Cloud Monitoring API
- Google Cloud IAM and Application Default Credentials
- GKE Workload Identity Federation
- OpenTelemetry Collector processors and exporters
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib Google Cloud Monitoring Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/googlecloudmonitoringreceiver
- OpenTelemetry Collector Contrib Google Cloud Monitoring Receiver config schema/source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/googlecloudmonitoringreceiver/config.go
- OpenTelemetry Collector Contrib Google Cloud exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlecloudexporter
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector metrics transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/metricstransformprocessor
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector health check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/healthcheckextension
- Google Cloud Application Default Credentials documentation: https://cloud.google.com/docs/authentication/application-default-credentials
- Google Cloud Monitoring IAM roles and access control documentation: https://cloud.google.com/monitoring/access-control
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity

## Issues Found
- The receiver examples used unsupported fields: `project`, `metric_types`, `credentials_file`, `resource_filters`, and `query`. Updated receiver snippets to use the documented `project_id` and `metrics_list` fields with `metric_name` or `metric_descriptor_filter`.
- The post claimed receiver-side resource filtering, alignment, aggregation, and built-in rate limiting. Replaced those claims with supported behavior: metric selection, descriptor filtering, collection interval, timeout/startup delay, and post-collection filtering with processors.
- The production Google Cloud exporter example used `metric_prefix`; updated it to the documented `metric.prefix` setting.
- The filter processor example used legacy/unsupported nested `metrics.exclude` syntax for current filter processor docs. Replaced it with OTTL `metric_conditions`.
- The metric transform regexp replacement used `$$1`; changed it to the documented `$${1}` capture-group syntax and escaped regexp end anchors as `$$`.
- The collector self-telemetry examples used the older `service.telemetry.metrics.address` form and undocumented `googlecloudmonitoring_*` metrics. Updated the telemetry config to the current `readers` form and listed documented `otelcol_*` receiver/scraper metrics.
- The health check example enabled `check_collector_pipeline`, which upstream docs warn is not working as expected. Removed that option from the snippet.
- Troubleshooting and cost examples still used `metric_types` and `resource_filters`; updated them to valid `metrics_list` examples and processor-based filtering.
- The `gcloud monitoring metric-descriptors list` example filtered on `metric.type`, which is a Monitoring API filter object rather than the displayed gcloud descriptor field. Updated it to filter on `type`.

## Review Notes
The corrected snippets were parsed as YAML locally. A local `otelcol-contrib` binary was not installed in the workspace, so full collector startup validation was not run.
