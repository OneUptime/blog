# Validation Summary: How to Set Up Controllers in Cilium Observability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator
- Grafana
- Python

## Sources Consulted
- Cilium command reference for `cilium-dbg status`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium command cheatsheet for detailed controller status: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium API reference for controller status JSON fields: https://docs.cilium.io/en/stable/api/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm reference for `prometheus.enabled` and `prometheus.controllerGroupMetrics`: https://docs.cilium.io/en/stable/helm-reference/
- Cilium v1.19.3 source for controller metric label values (`success` and `failure`): https://github.com/cilium/cilium/blob/v1.19.3/pkg/controller/controller.go
- Cilium v1.19.3 source for controller metric definitions: https://github.com/cilium/cilium/blob/v1.19.3/pkg/metrics/metrics.go
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/reference/dashboard/

## Issues Found
- The post used `cilium status controllers`, which is not a valid current in-agent command. Changed the examples to use `cilium-dbg status --all-controllers`, matching the Cilium command reference and cheatsheet.
- The JSON parsing examples treated `cilium-dbg status -o json` output as a top-level list. Changed them to read the `controllers` array from the returned status object, matching Cilium's API schema.
- The prerequisites required the standalone `cilium` CLI, but the tutorial uses in-pod `cilium-dbg` commands through `kubectl exec`. Removed that prerequisite.
- The prerequisite version listed Cilium 1.14 or later, but the post now uses `prometheus.controllerGroupMetrics`, which is not present in the Cilium 1.14 Helm values. Updated the prerequisite to Cilium 1.15 or later.
- The metric examples used an `outcome` label and `error` value for controller runs. Cilium documents the label as `status`, and the v1.19.3 source records `success` and `failure`. Updated PromQL examples and dashboard queries accordingly.
- The dashboard attempted to rank individual controllers with a non-existent `controller` label on `cilium_controllers_runs_total`. Changed the breakdown to use `cilium_controllers_group_runs_total` grouped by `group_name`, and added `prometheus.controllerGroupMetrics` configuration.
- The dashboard ConfigMap embedded a Grafana API-style `dashboard` wrapper. Grafana's dashboard JSON model is the dashboard object itself, so the snippet now uses top-level `title` and `panels`.
- The verification section said it would intentionally trigger a controller failure but only performed a read-only query. Reworded it as a read-only check.
- Troubleshooting commands referenced `cilium` inside the pod. Updated them to `cilium-dbg`.

## Review Notes
- The PrometheusRule example assumes the user's Prometheus Operator selects rules with `release: prometheus`; the troubleshooting section already tells readers to verify their `ruleSelector`.
- Setting `prometheus.controllerGroupMetrics` to `all` is useful for a tutorial dashboard but may be too broad for high-scale production clusters. The post now notes that a smaller allow-list can be used.
