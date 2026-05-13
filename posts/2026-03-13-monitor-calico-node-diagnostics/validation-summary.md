# Validation Summary: How to Monitor Calico Node Health for Diagnostics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico / Felix
- Kubernetes
- Prometheus Operator ServiceMonitor and PrometheusRule
- kube-state-metrics
- Prometheus / PromQL
- Grafana dashboards

## Sources Consulted
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Felix Prometheus metric reference: https://docs.tigera.io/calico-enterprise/latest/reference/component-resources/node/felix/prometheus
- Calico TigeraStatus / installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Prometheus Operator API reference for ServiceMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics DaemonSet metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/daemonset-metrics.md
- Prometheus PromQL querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Grafana visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The ServiceMonitor example selected `k8s-app: calico-node` and referenced port `http-metrics`, but a ServiceMonitor selects Kubernetes Services and its `port` field references a named Service port. Added a headless `felix-metrics-svc` Service with a matching label and a named `felix-metrics` port on 9091, then updated the ServiceMonitor to use that port.
- Felix Prometheus metrics are disabled by default. Added a `FelixConfiguration` example setting `prometheusMetricsEnabled: true`.
- The post described `felix_int_dataplane_failures` as policy drops. Official Felix metrics document it as failed dataplane updates that will be retried. Renamed the alert, dashboard title, and architecture label to refer to dataplane failures instead of policy drops.
- The second dataplane alert used `felix_int_dataplane_failures_total`, but the documented metric is `felix_int_dataplane_failures`. Updated the PromQL expression to use the documented metric.
- The introduction said the post detected BGP peer failures, but the examples only monitor Felix dataplane failures and DaemonSet readiness. Updated the wording to dataplane programming failures.
- The Grafana dashboard example used the older `graph` panel type. Updated it to the current `timeseries` visualization.
- The conclusion stated that a missing calico-node pod means the node has no network policy enforcement. This is too absolute because previously programmed dataplane state may remain but will not receive current policy or dataplane updates. Updated the wording accordingly.

## Review Notes
- The examples assume an Operator-style Calico installation in the `calico-system` namespace. Manifest-based installs may use `kube-system`, so operators may need to adjust namespaces for their deployment.
- The examples also assume Prometheus Operator CRDs are installed and that the Prometheus instance selects ServiceMonitor and PrometheusRule objects from `calico-system`.
