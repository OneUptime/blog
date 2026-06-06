# Validation Summary: How to Build a Chargeback Model for Observability Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry resource attributes
- OpenTelemetry count connector
- Prometheus exporter and PromQL
- Python requests
- Grafana with ClickHouse SQL
- FinOps chargeback modeling

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector count connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus PromQL querying basics and functions documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/ and https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The count connector example used `traces` as a custom count section. The official count connector configuration uses `spans` for span counts, so this was changed to `spans`.
- The count connector example used `metrics` for counting metric data points. The official count connector has a separate `datapoints` custom count section for data point counts, so this was changed to `datapoints`.
- The span count condition checked `attributes["team.name"]`, which refers to span attributes in the count connector condition context and would not reliably match a resource attribute. It now checks `resource.attributes["team.name"] != nil`, matching the resource attribute used for attribution.
- The gateway metrics pipeline received from both `otlp` and `count` but did not export incoming metrics to the count connector, so metric data points would not be counted. The configuration now exports the source metrics pipeline to `count` and receives generated count metrics in a separate `metrics/counts` pipeline.

## Review Notes
- The count connector is documented as alpha, so production usage should pin and validate the Collector distribution/version being deployed.
- The Prometheus exporter normalizes OpenTelemetry metric and label names by default, which is why the post's PromQL examples use names such as `spans_per_team_total` and `team_name`.
- The cost constants and average telemetry sizes are illustrative and correctly described as values to adjust based on actual costs.
