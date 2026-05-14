# Validation Summary: How to Alert on the Calico Flow Logs API

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Felix
- Kubernetes
- kubectl
- Prometheus
- Prometheus Operator ServiceMonitor
- Grafana
- Alertmanager

## Sources Consulted
- Calico documentation, Flow logs API: https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico documentation, Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation, Felix configuration: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation, Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes documentation, kubectl patch: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes documentation, kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus Operator documentation, Getting Started with ServiceMonitor: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator documentation, Troubleshooting ServiceMonitors: https://prometheus-operator.dev/docs/platform/troubleshooting/

## Issues Found
- The post title, description, and introduction claimed the post was about the Calico Flow Logs API, but the implementation used Felix Prometheus metrics. Calico documents the Flow Logs API as a tech-preview gRPC API, while the examples in the post enable and scrape Felix metrics. I updated the title, description, and introduction to accurately describe Felix metrics and clarified that flow-log analysis is the place for per-flow source/destination context.
- The ServiceMonitor example selected `k8s-app: calico-node` directly but did not create a Service for Prometheus Operator to select. Prometheus Operator documents that ServiceMonitors reference Services by labels and Service port names. I added a headless `felix-metrics-svc` Service with a named `http-metrics` port and kept the ServiceMonitor pointed at that named port.
- The architecture diagram skipped the Service discovery layer. I added `felix-metrics-svc` between Felix and Prometheus so the diagram matches the corrected Kubernetes configuration.

## Review Notes
The FelixConfiguration fields `prometheusMetricsEnabled` and `prometheusMetricsPort`, the default Felix metrics port `9091`, and the Felix metrics `felix_int_dataplane_failures` and `felix_calc_graph_update_time_seconds` are documented by Calico. The local environment did not have `kubectl` installed, so kubectl syntax was checked against the official Kubernetes command reference instead of local `--help` output.
