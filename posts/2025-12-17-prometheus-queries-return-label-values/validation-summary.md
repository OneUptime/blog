# Validation Summary: How to Write Prometheus Queries That Return Label Values

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus HTTP API
- Grafana Prometheus template variables
- Bash and curl
- Python requests

## Sources Consulted
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus PromQL query basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/

## Issues Found
- The architecture diagram referred to HTTP API methods as `label_values` and `labels`. Prometheus exposes `/api/v1/labels` and `/api/v1/label/<label_name>/values`, so the diagram was corrected to use the actual endpoint names.
- The Grafana section described `label_values()` as essential for dashboard variables without noting that current Grafana documentation marks it as legacy classic query syntax. The text was updated to recommend the current "Label values" query type for new variables and reserve `label_values()` for classic queries.
- The curl example for filtering label values used an unencoded `match[]` query parameter directly in the URL. This can fail with curl URL globbing and is less reliable than the documented form. It was changed to use `curl -G` with `--data-urlencode`.
- The PromQL comment for `version=""` said it finds labels that exist but are empty. PromQL matchers that match the empty string also match series where the label is not set, so the comment was corrected.
- The cross-metric join example joined `kube_pod_info` to itself to transfer the `node` label. It was changed to join running pod phase series with `kube_pod_info`, which better matches the stated purpose of transferring labels between metrics.
- The Grafana namespace variable example used `label_values(namespace)` without a metric. It was changed to `label_values(kube_pod_info, namespace)` to align with the article's examples and Grafana's documented classic syntax examples.
- The custom label values example filtered `kube_pod_info` by `phase="Running"`, but pod phase is not exposed by `kube_pod_info`, and `label_values()` filters label sets rather than current sample values. The example was changed to return environment values from `kube_pod_labels`.

## Review Notes
The remaining examples are syntactically consistent with Prometheus and Grafana documentation, assuming the referenced Kubernetes and application metrics exist in the reader's Prometheus environment. `promtool` was not available locally, so validation was performed against official documentation rather than by parsing sample expressions with local tooling.
