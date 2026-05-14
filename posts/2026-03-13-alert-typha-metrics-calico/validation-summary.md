# Validation Summary: How to Alert on Calico Typha Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Typha
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Prometheus Operator PrometheusRule
- Grafana
- Alertmanager

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus documentation: Alerting rules - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The post stated that Typha exposes metrics on port 9091, but Calico operator installations have Typha metrics disabled by default and the documented operator configuration enables them with `typhaMetricsPort: 9093`. Updated the introduction to avoid implying metrics are always exposed, added the operator patch command, and changed the example endpoint and architecture diagram to port 9093.
- The ServiceMonitor referenced a named `metrics` Service port, but the post did not define the Kubernetes Service that Prometheus Operator needs to discover the Typha endpoints. Added a headless `typha-metrics-svc` Service with label `k8s-app: calico-typha` and named port `metrics`.
- The alert used `up{job="calico-typha-metrics"}`, but Prometheus Operator defaults the `job` label to the selected Kubernetes Service name when no `jobLabel` is configured. Updated the alert expression to `up{job="typha-metrics-svc"} == 0`.

## Review Notes
The ServiceMonitor and PrometheusRule resources are syntactically valid for the Prometheus Operator CRDs. Whether Prometheus discovers them still depends on the cluster's Prometheus `serviceMonitorSelector`, `serviceMonitorNamespaceSelector`, `ruleSelector`, and `ruleNamespaceSelector` configuration.
