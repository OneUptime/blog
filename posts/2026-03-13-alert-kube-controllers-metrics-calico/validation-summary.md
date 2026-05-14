# Validation Summary: How to Alert on Calico Kube-Controllers Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico kube-controllers
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Prometheus Operator PrometheusRule
- Grafana
- Alertmanager

## Sources Consulted
- Calico documentation: Monitoring kube-controllers with Prometheus: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: KubeControllersConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico documentation: Secure Calico Prometheus endpoints: https://docs.tigera.io/calico/latest/network-policy/comms/secure-metrics
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator getting started guide: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator troubleshooting guide: https://prometheus-operator.dev/docs/platform/troubleshooting/
- Tigera Operator source for kube-controllers metrics Service and ServiceMonitor rendering: https://github.com/tigera/operator/blob/master/pkg/render/kubecontrollers/kube-controllers.go and https://github.com/tigera/operator/blob/master/pkg/render/monitor/monitor.go

## Issues Found
- The ServiceMonitor endpoint used `port: metrics`, but Calico's operator-rendered kube-controllers metrics Service names the port `metrics-port`. Prometheus Operator ServiceMonitors match the Service port name, so the original snippet would not scrape the endpoint. Changed the endpoint port to `metrics-port`.
- The post described kube-controllers metrics as visibility into the "policy distribution layer" and "distribution failures." Calico documentation describes kube-controllers as controllers for control plane functions such as resource garbage collection and Kubernetes API synchronization, and the kube-controllers metrics reference currently focuses on IPAM and default Go/process metrics. Updated the wording to controller health, IPAM state, and Kubernetes API synchronization.

## Review Notes
- The ServiceMonitor assumes an operator-managed Calico installation where the `calico-kube-controllers-metrics` Service exists in `calico-system` with label `k8s-app: calico-kube-controllers`. Manifest-based installs may require creating the metrics Service first.
- Prometheus installations such as kube-prometheus-stack often select ServiceMonitors by labels and namespaces. Users may need to add their Prometheus release label or place the ServiceMonitor in the namespace selected by their Prometheus instance.
