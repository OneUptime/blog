# Validation Summary: How to Configure the Google Managed Prometheus Exporter

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Collector Contrib
- Google Managed Service for Prometheus
- Google Cloud Monitoring API
- Google Cloud CLI and IAM
- GKE Workload Identity Federation
- Prometheus receiver, PromQL, recording rules, and alerting rules
- Grafana Prometheus datasource

## Sources Consulted
- Google Cloud Managed Service for Prometheus overview: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus
- Google Cloud OpenTelemetry Collector setup for Managed Service for Prometheus: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/setup-otel
- Google Cloud managed rule evaluation and alerting: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/rules-managed
- Google Cloud query using Grafana: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/query
- OpenTelemetry Collector Contrib googlemanagedprometheusexporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlemanagedprometheusexporter
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector cumulativetodelta processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/cumulativetodeltaprocessor/README.md
- OpenTelemetry Collector metricstransform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The architecture and exporter examples incorrectly described the GMP exporter as using Prometheus Remote Write and a `remote_write` configuration block. Updated the post to describe Cloud Monitoring API export and replaced unsupported `remote_write` settings with supported `metric` and `sending_queue` settings.
- The exporter examples used unsupported `credentials_file` and `extra_metrics_labels` fields. Updated the text to use Application Default Credentials and `GOOGLE_APPLICATION_CREDENTIALS` for key files, and used `metric.resource_filters` for adding selected resource attributes as labels.
- The advanced exporter examples used `snappy` compression. Updated them to `gzip`, which is the supported compression value for the GMP exporter's metrics gRPC requests.
- The resource-label example claimed a resource processor could transform resource attributes into metric labels. Updated the example to use `metric.resource_filters`, which is the supported exporter mechanism.
- Filter processor examples used older `metrics.metric` / `metrics.datapoint` style and unqualified `name` expressions. Updated them to current `metric_conditions` OTTL syntax with `metric.name` and `datapoint.attributes`.
- The cumulative-to-delta example had the wrong description and an invalid processor config shape. Updated it to the documented `include.metrics` form.
- The recording-rule command incorrectly used `gcloud alpha monitoring policies create` for Prometheus recording rules. Updated the example to a GMP `Rules` custom resource applied with `kubectl`.
- Alerting rules were shown as raw Prometheus rule groups without the GMP Kubernetes custom resource wrapper. Updated the example to a `monitoring.googleapis.com/v1` `Rules` resource.
- Grafana datasource examples implied static datasource provisioning with Google authentication fields was sufficient. Updated them to provision a placeholder Prometheus datasource and note that the GMP datasource syncer must configure OAuth2 credentials and the Cloud Monitoring Prometheus API URL.
- Collector internal telemetry examples used deprecated `service.telemetry.metrics.address`. Updated them to the current `readers.pull.exporter.prometheus` form.
- Metric transformation examples used incorrect aggregation fields. Updated them to use `aggregate_labels` operations and added `match_type: regexp` where regex matching was intended.

## Review Notes
The post is technically relevant and salvageable. The corrected examples target current Collector behavior and official GMP guidance as of 2026-06-05. The snippets were also checked for YAML syntax after editing, but they were not executed against a live GKE or Google Cloud project.
