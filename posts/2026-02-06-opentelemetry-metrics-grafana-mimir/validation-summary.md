# Validation Summary: How to Send OpenTelemetry Metrics to Grafana Mimir

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- Prometheus remote write
- Grafana Mimir
- Grafana data source provisioning
- PromQL
- Docker Compose
- Kubernetes service discovery

## Sources Consulted
- OpenTelemetry Collector Prometheus Remote Write Exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Metrics Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Attributes Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry metric naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir deployment modes: https://grafana.com/docs/mimir/latest/references/architecture/deployment-modes/
- Grafana Mimir authentication and authorization: https://grafana.com/docs/mimir/latest/manage/secure/authentication-and-authorization/
- Grafana data source provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- The Collector config used the deprecated `prometheusremotewrite` exporter component ID. Changed it to the current `prometheus_remote_write` component ID in the text, exporter config, and pipeline exporter list.
- The resource attribute explanation said filtering by service name would not be possible without `resource_to_telemetry_conversion`. Updated this to reflect the current exporter behavior: resource attributes are exposed through `target_info` by default, and most resource-attribute filtering or grouping requires a PromQL join unless attributes are copied to metric labels.
- The Python counter was named `orders.processed.total`, which mixes Prometheus suffix conventions into an OpenTelemetry metric name. Changed it to `orders.processed`, which translates to `orders_processed_total` under the default Prometheus translation strategy.
- The histogram recorded milliseconds with unit `ms`, but the default Prometheus translation strategy appends unit suffixes. Changed the example to record seconds with unit `s` and updated the PromQL query to use `orders_processing_duration_seconds_bucket`.
- The high-cardinality example used `metricstransform` with `delete_label_value` as if it deleted a label key. That operation deletes data points matching a label value and also requires `label_value`. Replaced the snippet with a `transform` processor example that uses `aggregate_on_attributes` to aggregate away the high-cardinality `url.full` attribute.
- The Grafana data source snippet described `timeInterval` as a timeout. Updated the comment to correctly describe it as the minimum query interval/step.

## Review Notes
The local Mimir example disables multitenancy while the Collector example includes an `X-Scope-OrgID` header for multi-tenant deployments. This is acceptable for explaining both local and multi-tenant setups, but a future revision could make the local-vs-production distinction more explicit.
