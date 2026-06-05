# Validation Summary: How to Set Up Telemetry Budget Dashboards That Track Spend per Service and Team

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector count connector
- OpenTelemetry Collector groupbyattrs processor
- OpenTelemetry Collector Prometheus exporter
- Prometheus recording rules and alerting rules
- PromQL
- Grafana dashboard JSON
- Alertmanager

## Sources Consulted
- OpenTelemetry Collector configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector connectors README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/connector/README.md
- OpenTelemetry Collector count connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- OpenTelemetry Collector groupbyattrs processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbyattrsprocessor/README.md
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus PromQL querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The post described the budget metrics as OpenTelemetry Collector internal metrics. Collector internal metrics describe Collector health and pipeline operations, while the example used the count connector to create telemetry volume metrics. Updated the description, diagram, and Step 1 wording to refer to count metrics.
- The Collector telemetry example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Replaced it with the current `readers` / `pull` / `prometheus` configuration.
- The count connector example placed `telemetry.budget.datapoints` under `metrics`, which counts metric instruments rather than data points. Moved it under `datapoints` so it counts metric data points as described.
- The recording rules omitted metric data point cost even though the post described spans, logs, and metric data points. Added a metric data point cost rule and included it in total cost calculations.
- The total-cost PromQL used direct vector addition, which can drop teams or services that only emit one signal type because PromQL binary arithmetic only keeps matching series. Reworked the total rules to combine signal-specific vectors with a `signal_type` label and aggregate with `sum`.
- The alert section called the examples "Alertmanager rules." Alert rules are evaluated by Prometheus and then sent to Alertmanager. Updated the wording to say "Prometheus alerting rules."

## Review Notes
- The count connector is currently alpha for traces-to-metrics, metrics-to-metrics, and logs-to-metrics pipelines, so production users should pin and test their Collector distribution carefully.
- The Grafana JSON is a panel model excerpt rather than a complete importable dashboard model. That is acceptable because the text introduces it as a single panel example.
