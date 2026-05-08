# Validation Summary: How to Use the Calico Flow Logs API

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
- Calico documentation, Flow logs API: https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico documentation, View flow logs: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico documentation, Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation, FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation, Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Prometheus Operator API reference, ServiceMonitor: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post title, description, and introduction claimed to cover the Calico Flow Logs API, but the commands and architecture covered Felix Prometheus metrics instead. Updated the title, description, and introduction to accurately describe Felix metrics monitoring.
- The ServiceMonitor example selected `k8s-app: calico-node` but did not define a Kubernetes Service for Prometheus Operator to select. Added a headless `felix-metrics-svc` Service matching the official Calico component metrics pattern.
- The ServiceMonitor referenced a port named `http-metrics`, but the example did not create that named Service port. Changed the Service and ServiceMonitor to use a consistent named port, `metrics`.
- Cleaned up extra spacing in the shell commands without changing their behavior.

## Review Notes
The reviewed post now validates as a Felix metrics guide, not as a Flow Logs API guide. The repository path still contains `use-calico-flow-logs-api`, but the post content is technically aligned with Calico Felix Prometheus metrics. Calico's current Flow Logs API is documented as a tech preview gRPC API, so a future post about that API should explicitly cover Goldmane and its proto-defined API surface.
