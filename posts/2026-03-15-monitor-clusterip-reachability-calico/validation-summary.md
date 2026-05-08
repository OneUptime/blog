# Validation Summary: How to Monitor for ClusterIP Reachability Issues with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Calico Felix
- Prometheus
- Prometheus Operator ServiceMonitor, PrometheusRule, and Probe resources
- kube-state-metrics
- kube-proxy metrics
- node_exporter conntrack metrics
- Blackbox Exporter
- Grafana

## Sources Consulted
- Calico documentation, Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation, Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation, Felix configuration: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- kube-state-metrics endpoint metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/endpoint-metrics.md
- Kubernetes metrics reference for kube-proxy metrics: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes kube-proxy command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Prometheus Operator API reference for ServiceMonitor and Probe resources: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Blackbox Exporter guide: https://prometheus.io/docs/guides/multi-target-exporter/
- node_exporter conntrack collector source: https://github.com/prometheus/node_exporter/blob/master/collector/conntrack_linux.go

## Issues Found
- The Calico ServiceMonitor selected `k8s-app: calico-node` but no Kubernetes Service was defined for Prometheus Operator to discover. Added a headless `Service` with a named `metrics` port and kept the ServiceMonitor pointed at that service label.
- The Felix metrics verification command used `kubectl exec -it` in a non-interactive pipeline. Removed `-it` so the command works in scripts and CI shells.
- The endpoint health examples used `kube_endpoint_address_available`, which is not in the current upstream kube-state-metrics endpoint metrics documentation. Replaced it with queries based on `kube_endpoint_info` and `kube_endpoint_address{ready="true"}`.
- The Calico policy-denial section used `calico_denied_packets`, which is a Calico Enterprise policy metric, not a standard open-source Felix metric. Replaced the section with an alert on `felix_int_dataplane_failures`, a documented Felix dataplane metric.
- The Blackbox Exporter Deployment did not define the referenced ConfigMap, expose the exporter with a Service, or configure Prometheus to probe any target. Added a minimal `blackbox.yml`, Service, and Prometheus Operator `Probe` resource.
- Updated the Grafana queries and conclusion to match the corrected metric names and Calico monitoring scope.

## Review Notes
- kube-proxy metrics are documented as alpha in the Kubernetes metrics reference, so dashboards and alerts should be checked when upgrading Kubernetes.
- The synthetic probe target remains a placeholder and must be replaced with a real ClusterIP service URL and health path before applying the manifest.
