# Validation Summary: How to Build Dashboards for Calico Kube-Controllers Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico kube-controllers
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Prometheus Operator PrometheusRule
- Grafana
- Alertmanager
- Mermaid

## Sources Consulted
- Calico documentation: Monitoring kube-controllers with Prometheus, https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Kubernetes controllers configuration, https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Prometheus Operator API reference, https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl exec reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Tigera Operator source for kube-controllers metrics service port name, https://github.com/tigera/operator

## Issues Found
- The post described kube-controllers metrics as visibility into the policy distribution layer. Calico documents kube-controllers as controllers for control-plane functions such as resource cleanup, synchronization, and IPAM metrics, not as the policy distribution layer. Updated the description, introduction, and conclusion to refer to kube-controllers control-plane health and IPAM/runtime visibility.
- The ServiceMonitor used `port: metrics`. Prometheus Operator defines this field as the Service port name, and Tigera Operator renders the Calico kube-controllers metrics Service port as `metrics-port`. Updated the ServiceMonitor endpoint to `port: metrics-port`.

## Review Notes
The alert expression depends on the `job` label assigned by the Prometheus Operator setup. It is plausible when scraping the operator-created `calico-kube-controllers-metrics` service, but deployments with custom `jobLabel` settings or a differently named metrics service may need to adjust the selector.
