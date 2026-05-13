# Validation Summary: How to Monitor Typha High Availability in a Calico Hard Way Installation

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Calico (Project Calico)
- Typha (Calico's fan-out daemon for Felix-to-datastore connections)
- Kubernetes
- Prometheus
- prometheus-operator (PodMonitor CRD)
- Grafana
- Bash / kubectl

## Sources Consulted
- Tigera/Calico docs: Monitor Calico component metrics — https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Tigera/Calico docs: Recommended Prometheus metrics — https://docs.tigera.io/calico-cloud/operations/monitor/metrics/recommended-metrics
- tigera/operator source (`pkg/render/typha.go`) — port name constant `TyphaMetricsName = "calico-typha-metrics"`
- projectcalico/calico `manifests/calico-typha.yaml`
- prometheus-operator API reference (PodMonitor `monitoring.coreos.com/v1`) — https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus exposition format docs — https://prometheus.io/docs/instrumenting/exposition_formats/

## Issues Found

1. **Incorrect PodMonitor port name (Step 2).** The PodMonitor referenced `port: metrics`, but the metrics container port on the operator-deployed Typha pod is named `calico-typha-metrics` (defined in tigera/operator as `TyphaMetricsName`). With the original value, the PodMonitor would not match any endpoint and no scraping would occur. Changed `port: metrics` to `port: calico-typha-metrics` to align with the `calico-system` namespace already used throughout the post.

2. **Broken metric parsing in health-check script (Step 6).** The script used `grep typha_connections_active | awk '{print $2}'`. In the Prometheus exposition format, each metric is preceded by `# HELP <name> ...` and `# TYPE <name> <type>` lines that also contain the metric name, so the unanchored grep matched three lines. The subsequent `awk '{print $2}'` would emit non-numeric tokens, then the `$((TOTAL_CONNECTIONS + COUNT))` arithmetic would fail (and `$COUNT` itself would be a multi-line string). Tightened to `grep '^typha_connections_active '` so only the sample line is captured.

## Review Notes
- The post uses Prometheus metrics port `9093` and the `calico-system` namespace, which matches Tigera Operator examples (the operator example explicitly sets `typhaMetricsPort: 9093`). Note that the upstream Typha default for `TYPHA_PROMETHEUSMETRICSPORT` is actually `9091` and metrics are disabled by default — a true "hard way" manual install would need both `TYPHA_PROMETHEUSMETRICSENABLED=true` and the port explicitly configured. The post is internally consistent for the common operator-with-metrics-enabled deployment but the "Hard Way" framing in the title is slightly at odds with the operator-style namespace; this is editorial rather than a technical error so it was not changed.
- The `max() / min()` imbalance expression can yield `+Inf` when `min == 0`, which still triggers the `> 2` comparison — that is the desired behavior here (a zero-connection replica is itself flagged by `TyphaReplicaZeroConnections`). When *all* replicas have zero, the expression evaluates to `NaN` and neither alert fires on the imbalance rule; the `TyphaHATotalConnectionsLow` alert covers that scenario.
- The metric `typha_connections_active` is correct and is the gauge Tigera recommends for this kind of HA monitoring.
- `count(up{job="calico-typha"} == 1) < count(up{job="calico-typha"})` is a valid Prometheus pattern provided the `calico-typha` job label exists (it will when PodMonitor's job naming matches; users may need to adjust the job label to whatever prometheus-operator generates, typically `<namespace>/<podmonitor-name>` or similar).
