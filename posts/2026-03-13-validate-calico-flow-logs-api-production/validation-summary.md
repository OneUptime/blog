# Validation Summary: How to Validate the Calico Flow Logs API in Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Felix
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Grafana and Alertmanager

## Sources Consulted
- Calico documentation, Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation, FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation, Flow logs API: https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico Enterprise documentation, Recommended Prometheus metrics: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics
- Prometheus Operator documentation, Getting Started with ServiceMonitor: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes documentation, kubectl patch: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post title, description, and introduction described validating the Calico Flow Logs API, but the commands and architecture validated Felix Prometheus metrics. The Calico Flow Logs API is Goldmane, a gRPC API for aggregated flow logs, not the Felix metrics endpoint. Updated the post scope to Felix metrics while preserving the existing structure.
- The ServiceMonitor example selected `k8s-app: calico-node` directly without defining a matching Service. Prometheus Operator ServiceMonitors select Services, and endpoint `port` refers to a named Service port. Added a headless Service with a named `http-metrics` port and kept the ServiceMonitor selector aligned with that Service.
- The metric grep included `felix_int_dataplane_failures`, which is not a recommended/current Felix metric name in the consulted documentation. Replaced it with documented Felix error and latency metrics: `felix_iptables_restore_errors`, `felix_ipset_errors`, `felix_int_dataplane_apply_time_seconds`, and `felix_calc_graph_update_time_seconds`.
- The conclusion said the ServiceMonitor scrapes calico-node pods directly. Updated it to describe exposing calico-node metrics through a Service and scraping that Service.

## Review Notes
- Calico Open Source Flow Logs API is documented as tech preview in current Calico 3.32 documentation. That is now out of scope because the corrected post covers Felix Prometheus metrics instead of Goldmane.
- The examples assume an operator-style Calico installation using the `calico-system` namespace and `k8s-app=calico-node` labels. Manifest-based installations may use `kube-system`.
