# Validation Summary: How to Monitor Multi-Cluster Health from Rancher Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (multi-cluster management)
- Rancher Fleet (GitOps)
- Kubernetes
- Prometheus / kube-state-metrics / cAdvisor metrics
- PromQL
- Grafana (dashboards, templating, HTTP API)
- Prometheus Operator (`PrometheusRule` CRD)
- kubectl (jsonpath)

## Sources Consulted
- Fleet documentation — Namespaces and Cluster Registration: https://fleet.rancher.io/reference/ref-registration and https://fleet.rancher.io/0.11/explanations/namespaces
- Grafana CLI documentation: https://grafana.com/docs/grafana/latest/cli/
- Grafana HTTP API — Dashboards: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- Grafana Import Dashboards docs: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/import-dashboards/
- kube-state-metrics metrics reference: https://github.com/kubernetes/kube-state-metrics/tree/main/docs
- Prometheus Operator `PrometheusRule` CRD: https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.PrometheusRule
- Rancher Monitoring (rancher-monitoring chart): https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting
- Fleet GitRepo CRD reference: https://fleet.rancher.io/ref-gitrepo

## Issues Found

1. **Incorrect `grafana-cli` command for dashboard import.** The post used `grafana-cli dashboards import 15757`. There is no `dashboards` subcommand in `grafana-cli` — that tool is limited to plugin and admin operations. Dashboard import is performed via the Grafana UI, the HTTP API (`POST /api/dashboards/db`), the provisioning system, or the newer `gcx` CLI. Replaced the snippet with a working `curl`-based HTTP API example that downloads the dashboard JSON from grafana.com and POSTs it to the target Grafana instance.

2. **Wrong namespace for `kubectl get bundledeployment`.** The post listed unhealthy deployments with `-n fleet-default`, but Fleet stores `BundleDeployment` resources in per-cluster registration namespaces of the form `cluster-${namespace}-${cluster}-${random}`, not in `fleet-default` (which holds `GitRepo` and `Bundle` resources). Switched the command to `-A` (all namespaces) and added `{.metadata.namespace}/` to the jsonpath output so the result is unambiguous. Added a short explanatory comment about the namespace layout.

## Review Notes

- The PromQL queries are valid and use real kube-state-metrics / cAdvisor series (`kube_node_status_condition`, `kube_node_info`, `container_cpu_usage_seconds_total`, `kube_node_status_capacity{resource="cpu"}`, `kube_pod_container_status_restarts_total`). The CPU utilization expression assumes Prometheus federation (Thanos / multi-cluster Prometheus) where a `cluster` label is consistently present — this is implied later in the post by the Thanos datasource for the Grafana template variable, so it is internally consistent.
- The `PrometheusRule` manifest uses the correct `monitoring.coreos.com/v1` API and the `rancher-monitoring` default namespace `cattle-monitoring-system`.
- The `GitRepo` manifest uses `fleet.cattle.io/v1alpha1`, which is still the current served version of the Fleet GitRepo CRD; correct.
- The home-dashboard status colors (Active/Updating/Error → green/blue/red) are an approximation of what the Rancher UI shows; "Updating" can also surface as yellow/orange depending on substate, but the description is reasonable for a high-level overview.
- Grafana dashboard ID 15757 is referenced as an example only; readers should pick whichever multi-cluster overview suits their environment and version.
