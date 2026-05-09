# Validation Summary: How to Troubleshoot Calico Typha Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Typha
- Kubernetes
- kubectl
- Prometheus
- Prometheus Operator ServiceMonitor
- Prometheus Operator PrometheusRule
- Grafana
- Alertmanager

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Enterprise documentation: Monitoring Typha with Prometheus - https://docs.tigera.io/calico-enterprise/latest/reference/component-resources/typha/prometheus
- Prometheus Operator documentation: Getting Started / Using ServiceMonitors - https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference: ServiceMonitor, Endpoint, PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator troubleshooting: ServiceMonitor behavior and named ports - https://prometheus-operator.dev/docs/platform/troubleshooting/
- Kubernetes kubectl reference: kubectl get and kubectl exec - https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The introduction stated that Typha exposes metrics on port 9093 unconditionally. Calico documents Typha metrics as configurable, with operator installs using `typhaMetricsPort`; the post now says Typha can expose metrics on 9093 when that field is configured.
- The metrics section only tested the endpoint and did not enable metrics. Added the documented `kubectl patch installation default --type=merge -p '{"spec": {"typhaMetricsPort":9093}}'` command before the endpoint test.
- The ServiceMonitor selected `k8s-app: calico-typha` but did not include the Service that a ServiceMonitor needs to discover. Added a headless `typha-metrics-svc` Service with a named `metrics` port pointing at 9093.
- The alert used `job="calico-typha-metrics"`, but Prometheus Operator defaults the `job` label to the associated Service name when `jobLabel` is not set. Updated the alert to use `job="typha-metrics-svc"` and to handle absent targets as well as down targets.

## Review Notes
The ServiceMonitor will still need to match the Prometheus instance's `serviceMonitorSelector` and `serviceMonitorNamespaceSelector` in the target cluster. Some Calico installs use port 9091 for Typha metrics unless configured otherwise.
