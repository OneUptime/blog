# Validation Summary: How to Send Dapr Metrics to Elastic Observability

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (sidecar metrics, Configuration CRD, Kubernetes annotations)
- Elastic Observability (Elastic Agent, Metricbeat, Kibana)
- Elasticsearch
- Prometheus metrics format
- Kubernetes (ConfigMaps, annotations, deployments)
- Kibana (KQL, Lens, TSVB, alerting API)

## Sources Consulted
- Dapr Configuration Schema reference — https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Metrics Overview — https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Annotations Reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Metrics List (GitHub) — https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Elastic Agent standalone input configuration (Prometheus integration)
- Metricbeat Prometheus module reference — https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-module-prometheus.html
- Metricbeat reference YAML — https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-reference-yml.html
- Kibana Alerting API — https://www.elastic.co/guide/en/kibana/current/create-rule-api.html

## Issues Found

1. **`spec.metric` should be `spec.metrics` (plural)**: The Dapr Configuration CRD uses `spec.metrics` (plural), not `spec.metric`. All official Dapr documentation consistently uses the plural form. Fixed by changing `metric` to `metrics`.

2. **`port: 9090` is not a valid field in the Dapr Configuration CRD**: The `spec.metrics` section of the Configuration resource does not support a `port` field. Valid fields are `enabled`, `rules`, `recordErrorCodes`, `latencyDistributionBuckets`, and `http`. The metrics port is configured via the `dapr.io/metrics-port` Kubernetes annotation (which was already correctly shown in the post) or the `--metrics-port` CLI flag. Fixed by removing the `port` field from the Configuration resource.

3. **`namespace: dapr` is not a valid Metricbeat Prometheus module option**: The Metricbeat Prometheus module does not support a `namespace` field. Valid module-level options are `module`, `metricsets`, `enabled`, `period`, `hosts`, `fields`, `tags`, `processors`, `index`, `keep_null`, and `service.name`. Fixed by removing the invalid `namespace` field.

4. **Elastic Agent stream missing `data_stream` block**: The Elastic Agent standalone config should specify `namespace` inside a `data_stream` block within the stream, along with `dataset` and `type` fields. Fixed by restructuring the stream to include a proper `data_stream` block with `dataset: prometheus.collector`, `namespace: dapr`, and `type: metrics`.

## Review Notes
- The custom Metricbeat index `dapr-metrics-%{+yyyy.MM.dd}` is valid syntax but in practice requires companion settings (`setup.template.name`, `setup.template.pattern`) and ILM configuration to work correctly. This is omitted from the post for brevity, which is acceptable for a getting-started guide but could cause issues in production.
- The metric name `dapr_http_server_latency_sum` used in the KQL query is technically a Prometheus-derived name (the `_sum` suffix is auto-generated for histogram metrics). The base Dapr metric is `dapr_http_server_latency`. This is correct usage in the context of querying Prometheus-scraped data in Elasticsearch.
- The TSVB dashboard JSON is a simplified representation and may need adjustment depending on the Kibana version being used.
- The Kibana alerting API curl example uses `http://` rather than `https://`, which would not work in production Kibana deployments with TLS enabled.
