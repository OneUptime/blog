# Validation Summary: How to Configure the Alertmanager Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib Alertmanager exporter
- OpenTelemetry Collector filter and transform processors
- Prometheus Alertmanager
- Prometheus alerting rules
- Kubernetes service DNS
- TLS and HTTP authentication headers

## Sources Consulted
- OpenTelemetry Collector contrib Alertmanager exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/alertmanagerexporter/README.md
- OpenTelemetry Collector contrib Alertmanager exporter source and tests: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/alertmanagerexporter
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector routing processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/routingprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Prometheus Alertmanager Alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The post described the exporter as converting only log records, but the upstream exporter supports span events and log records. Updated the description and explanations accordingly.
- The post implied the exporter is available in normal Collector distributions. The upstream metadata and current contrib image do not include it in standard distributions, so a caveat was added that a custom Collector build is required.
- Collector examples used `endpoint: .../api/v2/alerts`, but the exporter appends `/api/<version>/alerts` to the configured base endpoint. Updated Alertmanager exporter endpoints to base URLs such as `http://alertmanager.example.com:9093`.
- Collector examples omitted the required `severity` exporter setting. Added `severity`, `severity_attribute`, and `event_labels` where appropriate.
- The post claimed arbitrary `alertname` attributes become Alertmanager labels. The exporter creates `event_name` and `severity` labels, and only configured `event_labels` are copied into labels; other attributes become annotations. Updated examples and explanations.
- Filter processor examples used deprecated legacy include syntax. Replaced them with current OTTL `log_conditions`.
- The multiple-alert-types example used the deprecated routing processor and did not actually route through the declared service pipelines. Replaced it with filtered pipelines.
- The deduplication section incorrectly used `groupbyattrs` and custom fingerprints. Updated it to explain Alertmanager label-set deduplication and stable `event_labels`.
- The metrics section incorrectly sent metrics through the Alertmanager exporter and claimed `metricstransform` converted metrics to logs. Replaced it with a Prometheus scrape exporter and Prometheus alerting rule example.
- Alertmanager configuration used deprecated `match`, `source_match`, and `target_match` fields and environment-variable placeholders in secret fields. Updated to `matchers`, `source_matchers`, `target_matchers`, and file-based secret fields.
- Monitoring configuration used the deprecated internal telemetry `metrics.address` style and also configured a conflicting Prometheus exporter. Updated it to current `service.telemetry.metrics.readers` syntax.
- Some OTTL statements containing colons needed YAML quoting. Quoted the affected statements and verified all YAML blocks parse.

## Review Notes
The OpenTelemetry Collector contrib Alertmanager exporter is development stability and may change. The edited examples are aligned with the current upstream component behavior, but users should pin and test against the exact custom Collector version they build.
