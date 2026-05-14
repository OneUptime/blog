# Validation Summary: Metrics in Cilium: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus and Prometheus Operator ServiceMonitor
- Hubble
- Grafana
- eBPF metrics

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Helm chart templates for v1.19.3: https://helm.cilium.io/cilium-1.19.3.tgz
- Cilium v1.19.3 source for metric definitions: https://github.com/cilium/cilium/tree/v1.19.3
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction said Hubble metrics on port 9965 are exposed through Hubble Relay. Cilium documentation states Hubble metrics are served by the Hubble instance running inside `cilium-agent`, so this was corrected.
- The Helm example enabled Hubble metrics without enabling Hubble itself. Added `hubble.enabled=true`, which is required for Hubble metrics.
- The Hubble metric list used `http`; current Cilium examples use `httpV2` for HTTP metrics. Updated the Helm value to `httpV2`.
- The ServiceMonitor examples used the wrong Cilium agent and operator service port name, `prometheus`. The Cilium Helm chart uses `metrics` for `cilium-agent` and `cilium-operator`, and `hubble-metrics` for Hubble. Updated the ServiceMonitor snippets and selectors to match the chart-created services.
- The troubleshooting command checked `svc/cilium`, but the chart creates the metrics services as `cilium-agent`, `cilium-operator`, and `hubble-metrics`. Updated the command.
- Several metric names were outdated or incorrect: `cilium_endpoint_count`, `cilium_policy_count`, and `cilium_identity_count` were changed to `cilium_endpoint`, `cilium_policy`, and `cilium_identity`.
- The validation example compared one agent's endpoint metric to all Kubernetes pods, which is not a valid comparison in multi-node clusters and does not account for unmanaged pods. Updated it to compare Prometheus' cluster-wide `sum(cilium_endpoint)` with CiliumEndpoint objects.
- The PromQL query `cilium_policy_verdict_total` does not exist in the current Cilium metrics reference. Replaced it with `cilium_policy_endpoint_enforcement_status`.
- The endpoint state query grouped by `state`, but the Cilium metric label is `endpoint_state` in the v1.19.3 source. Updated the grouping label.
- The BPF map pressure query divided capacity by map operations, which is not a pressure metric. Replaced it with `cilium_bpf_map_pressure`.
- The endpoint regeneration histogram query omitted aggregation by `le`, which makes `histogram_quantile` incorrect. Updated the query and alert expression.

## Review Notes
The post is now technically valid against current Cilium stable documentation and the Cilium v1.19.3 Helm chart. Some examples still assume conventional namespaces such as `kube-system` and `monitoring`; users may need to adjust those for their own installations.
