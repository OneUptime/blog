# Validation Summary: How to Set Up Prometheus and Grafana for Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium (CNI for Kubernetes)
- Hubble (Cilium's observability layer)
- Prometheus / Prometheus Operator
- Grafana
- Kubernetes
- Helm

## Sources Consulted
- Cilium official metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm chart values reference (helm chart `cilium/cilium`)
- Grafana.com dashboard pages:
  - https://grafana.com/grafana/dashboards/16611 (Cilium v1.12 Agent Metrics)
  - https://grafana.com/grafana/dashboards/16612 (Cilium v1.12 Operator Metrics)
  - https://grafana.com/grafana/dashboards/16613 (Cilium v1.12 Hubble Metrics)
- Prometheus Operator ServiceMonitor CRD docs (monitoring.coreos.com/v1)

## Issues Found

1. **Incorrect Prometheus label name in PromQL query** — The query used `cilium_bpf_map_ops_total{mapName="cilium_ct4_global"}` with a camelCase label `mapName`. The official Cilium metrics docs document the label as `map_name` (snake_case, matching Prometheus naming conventions used throughout Cilium metrics). Updated the query to use `map_name`.

2. **Grafana dashboard ID labels were incorrect/swapped** — The post listed:
   - 16611 as "Cilium Overview"
   - 16612 as "Hubble L7 HTTP"
   - 16613 as "Cilium Operator"

   Verified against grafana.com, the actual published dashboards are:
   - 16611: Cilium v1.12 Agent Metrics
   - 16612: Cilium v1.12 Operator Metrics
   - 16613: Cilium v1.12 Hubble Metrics

   Dashboard names updated to match the official Grafana.com listings; 16612 and 16613 were effectively swapped in the original post.

## Review Notes

- The default ports (9962 for agent, 9963 for operator, 9965 for Hubble) are correct per Cilium documentation.
- The Helm flags (`prometheus.enabled`, `operator.prometheus.enabled`, `hubble.metrics.enabled`) and the `--set` array syntax for the Hubble metrics list are correct.
- ServiceMonitor selectors (`k8s-app: cilium` for the agent and `io.cilium/app: operator` for the operator) and the port name `prometheus` match Cilium's default Service definitions when Prometheus is enabled.
- The metric names `cilium_drop_count_total`, `cilium_policy_l7_total`, and `hubble_flows_processed_total` are all valid Cilium/Hubble metrics.
- The referenced Grafana dashboards on grafana.com are labelled "v1.12" — they are still maintained and work with newer Cilium releases, but readers running significantly newer Cilium versions may want to import the dashboard JSON directly from the Cilium GitHub repo (`install/kubernetes/cilium/files/`) for the closest match to their version.
- `kubectl port-forward ds/cilium 9962` works because port-forward selects a pod from the DaemonSet; no functional issue.
