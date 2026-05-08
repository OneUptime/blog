# Validation Summary: Monitoring Installation Validation for Cilium on K3s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium 1.16.5
- Kubernetes and K3s
- Hubble
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Grafana dashboards and PromQL
- Helm and kubectl

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium 1.16.5 metrics documentation source: https://github.com/cilium/cilium/blob/v1.16.5/Documentation/observability/metrics.rst
- Cilium 1.16.5 Helm chart values: https://github.com/cilium/cilium/blob/v1.16.5/install/kubernetes/cilium/values.yaml.tmpl
- Cilium 1.16.5 ServiceMonitor templates: https://github.com/cilium/cilium/tree/v1.16.5/install/kubernetes/cilium/templates
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Prometheus Operator API documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm command enabled Cilium and Hubble metrics but did not enable the Helm-created ServiceMonitor resources. With Cilium 1.16.5, the chart creates the metrics Services and ServiceMonitor resources when the relevant `*.serviceMonitor.enabled` values are set. Updated the command to enable Cilium agent, operator, and Hubble ServiceMonitors with the kube-prometheus-stack release label.
- The post enabled deprecated Hubble `http` metrics. Cilium 1.16 documents `http` as deprecated in favor of `httpV2`, so the Hubble metrics list was updated to use `httpV2` and include `port-distribution`, which the official Hubble dashboard expects.
- The hand-written ServiceMonitor examples only covered the Cilium agent and operator and would miss Hubble metrics. Replaced them with a verification command for the ServiceMonitors created by the Helm values.
- The dashboard and verification examples referenced `cilium_agent_uptime_seconds`, which is not a documented Cilium 1.16 metric. Replaced it with documented cluster health metrics: `cilium_unreachable_nodes` and `cilium_unreachable_health_endpoints`.
- The dashboard referenced `cilium_policy_import_errors_total`, which is not a documented Cilium 1.16 metric. Replaced it with `cilium_policy_change_total{outcome="failure"}`.
- The Hubble metrics check used `hubble metrics list`, which is not a documented Hubble CLI command. Replaced it with a port-forward to the `hubble-metrics` service and a scrape check for `hubble_flows_processed_total`.

## Review Notes
- Helm was not installed in the local environment, so command validation was performed against official Cilium documentation and the Cilium 1.16.5 chart/source files rather than local `helm show` output.
- The Cilium 1.16.5 source defines the `cilium_endpoint_state` label as `endpoint_state`, matching the post and official dashboard JSON, even though some rendered documentation versions describe the label as `state`.
