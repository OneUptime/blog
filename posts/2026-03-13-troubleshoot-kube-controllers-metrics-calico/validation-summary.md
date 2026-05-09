# Validation Summary: How to Troubleshoot Calico Kube-Controllers Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico kube-controllers
- Kubernetes
- Prometheus metrics
- Prometheus Operator ServiceMonitor
- PrometheusRule alerting rules
- Grafana and Alertmanager

## Sources Consulted
- Calico documentation: Monitoring kube-controllers with Prometheus: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Kubernetes controllers configuration: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Prometheus Operator API reference for ServiceMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl reference for `kubectl get` and `kubectl exec`: https://kubernetes.io/docs/reference/kubectl/
- Tigera operator source for kube-controllers metrics Service and ServiceMonitor port naming: https://github.com/tigera/operator/blob/master/pkg/render/kubecontrollers/kube-controllers.go and https://github.com/tigera/operator/blob/master/pkg/render/monitor/monitor.go

## Issues Found
- The post described kube-controllers metrics as visibility into the "policy distribution layer." Calico's documented kube-controllers-specific metrics are IPAM allocation metrics, alongside default Go and process metrics. I updated the introduction and conclusion to refer to IPAM allocation state and process health.
- The ServiceMonitor used `port: metrics`, but Tigera's operator-rendered `calico-kube-controllers-metrics` Service names the port `metrics-port`, and the operator-rendered ServiceMonitor also uses `metrics-port`. I updated the ServiceMonitor endpoint to `port: metrics-port`.
- The conclusion mentioned alerting on "key performance thresholds," but the post only defines an endpoint availability alert. I narrowed the wording to endpoint availability.

## Review Notes
The command examples are structurally valid Kubernetes commands, but `kubectl` is not installed in this local environment, so I verified their syntax against the official Kubernetes kubectl reference instead of running them. In manifest-based Calico installs, a Service exposing kube-controllers metrics may need to be created separately; operator-based installs create `calico-kube-controllers-metrics` automatically.
