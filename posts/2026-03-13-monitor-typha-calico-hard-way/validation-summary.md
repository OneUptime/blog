# Validation Summary: How to Monitor Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Project Calico)
- Typha (Calico's Felix fan-out proxy)
- Kubernetes
- Prometheus (Operator + raw scrape configs)
- Prometheus alerting rules (PromQL)
- Grafana
- kube-state-metrics (`kube_node_info`)

## Sources Consulted
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico source code (typha/pkg/syncserver/sync_server.go): https://github.com/projectcalico/calico/blob/master/typha/pkg/syncserver/sync_server.go
- Prometheus documentation on Summary vs Histogram metric types
- kube-state-metrics documentation for `kube_node_info`

## Issues Found

1. **Metric `typha_updates_sent` does not exist.** Calico exposes `typha_updates_total` (a counter). Replaced the metric name in both the metrics table and the PromQL query for the update rate panel.

2. **Metric `typha_snapshot_send_latency_seconds` does not exist.** The actual snapshot send-time metric is `typha_client_snapshot_send_secs` (a Summary). Replaced in the metrics table.

3. **`typha_ping_latency` is a Summary, not a Histogram.** The alert query `histogram_quantile(0.99, rate(typha_ping_latency_seconds_bucket[5m]))` is invalid because (a) Summaries don't expose `_bucket` series and (b) the metric name has no `_seconds` suffix. Rewrote the alert expression as `typha_ping_latency{quantile="0.99"} > 5`, which reads the p99 quantile directly from the Summary.

4. **`kube_node_info` cannot be multiplied as a scalar.** It is a per-node gauge with labels (one series per node, value 1). Comparing `typha_connections_active < (kube_node_info * 0.9)` would produce a many-to-many vector match failure. Changed to `sum(typha_connections_active) < (count(kube_node_info) * 0.9)` so that both sides are scalars representing total active connections vs. node count.

5. **Prometheus relabel source label `__meta_kubernetes_pod_label_app` is wrong.** Calico Typha pods are labeled `k8s-app: calico-typha`, not `app: calico-typha`. Changed the relabel rule to use `__meta_kubernetes_pod_label_k8s_app`, matching the ServiceMonitor selector earlier in the post and the actual pod label set by both manifest- and operator-based installs.

## Review Notes
- The `TYPHA_PROMETHEUSMETRICSPORT=9093` value the post uses is a deliberate override; per the Calico Typha configuration reference the default is `9091`. Using 9093 is fine (it is explicitly set in both the env var and the Service patch), but readers porting this to an environment that relies on defaults should be aware of the discrepancy.
- The `kubectl patch service` command uses a strategic merge that replaces the entire `ports` array — acceptable here because both ports are listed, but it would clobber any additional ports a user has already defined.
- The metrics table notes for `typha_ping_latency` and `typha_client_snapshot_send_secs` now flag them as Summaries to discourage future readers from attempting `histogram_quantile()` queries.
- Felix Prometheus metrics (which expose policy-enforcement state) are a useful complement to Typha metrics but are out of scope for this post.
