# Validation Summary: How to Enable Calico Kube-Controllers Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico kube-controllers
- Kubernetes
- Prometheus metrics
- Prometheus Operator ServiceMonitor
- PrometheusRule alerting
- Grafana and Alertmanager

## Sources Consulted
- Calico documentation, "Monitor Calico component metrics": https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation, "Monitoring kube-controllers with Prometheus": https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico documentation, "Kubernetes controllers configuration": https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Tigera Operator source for rendered kube-controllers metrics Service: https://github.com/tigera/operator

## Issues Found
- The ServiceMonitor endpoint used `port: metrics`, but the Tigera operator renders the Calico kube-controllers metrics Service port with the name `metrics-port`. Updated the ServiceMonitor to use `port: metrics-port` so Prometheus Operator can match the Service port correctly.
- The post described the metrics as monitoring the "policy distribution layer" and "distribution performance." Calico's kube-controllers metric reference documents controller/IPAM metrics and default Prometheus runtime metrics. Updated that wording to "controller health and IPAM state/metrics."
- The post wording implied ServiceMonitor enables the metrics endpoint. Calico documents kube-controllers metrics as enabled by default on port 9094; ServiceMonitor configures Prometheus collection. Updated the wording to say "collect" where appropriate.

## Review Notes
The post assumes a Calico operator installation using the `calico-system` namespace and the operator-created `calico-kube-controllers-metrics` Service. Manifest-based installations may use `kube-system` and may need an explicitly created Service with a named metrics port before this ServiceMonitor can scrape it.
