# Validation Summary: How to Avoid Common Mistakes with Calico Metrics Visualization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Felix metrics
- Kubernetes node metrics
- Prometheus and PromQL
- Grafana dashboards and variables

## Sources Consulted
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/prometheus/template-variables/
- Grafana variable syntax documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Grafana standard panel options documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-standard-options/

## Issues Found
- The relative policy density example divided `felix_active_local_policies` by `kube_node_info`. Since `kube_node_info` is an info metric with value `1` per node, this does not produce a meaningful density ratio. Replaced it with a comparison against the cluster average using `scalar(avg(felix_active_local_policies))`.
- The latency average examples used raw cumulative `_sum` and `_count` histogram series. Prometheus counters should be converted with `rate()` before calculating recent averages. Updated the examples to use `rate(..._sum[5m]) / rate(..._count[5m])`.
- The Grafana unit explanation said a raw seconds value shown with a milliseconds unit would be 1000x too high. The example value, `0.05s` displayed as `0.05ms`, is 1000x too low. Corrected the wording.
- The cluster-wide `histogram_quantile()` example did not aggregate classic histogram buckets while preserving the required `le` label. Updated it to `histogram_quantile(0.99, sum by (le) (rate(..._bucket[5m])))`.
- The baseline alert example applied `quantile_over_time()` to a cumulative `_sum` counter, which measures total accumulated seconds rather than latency. Replaced it with `quantile_over_time()` over a subquery of the rate-based average latency.
- The Grafana variable example used the deprecated classic `label_values(kube_node_info, node)` query string. Replaced it with the current Prometheus query variable form: Query type `Label values`, Label `node`, Metric `kube_node_info`. Also changed the selector to `node=~"$node"` so it works with multi-value or Include All variables.
- The alert threshold snippet was marked as `bash` even though it contains PromQL. Changed the code fence language to `promql`.

## Review Notes
The referenced Calico metrics are documented Felix metrics, including `felix_active_local_policies` and `felix_int_dataplane_apply_time_seconds`. `promtool` was not installed locally, so PromQL syntax was reviewed manually against Prometheus documentation.
