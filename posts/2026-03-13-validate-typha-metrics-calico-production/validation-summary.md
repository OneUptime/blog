# Validation Summary: How to Validate Calico Typha Metrics in Production

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
- Calico documentation: Monitoring Typha with Prometheus, https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Configuring Typha, https://docs.tigera.io/calico/latest/reference/typha/configuration
- Prometheus Operator API reference, https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl port-forward reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes Service documentation, https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The introduction stated that Typha exposes metrics on port 9093 unconditionally. Calico documents Typha metrics as disabled by default for operator installs and 9091 as the default metrics port in Typha configuration, with 9093 used in some install paths or when configured. I changed the wording to say Typha can expose metrics, then configured `typhaMetricsPort: 9093` in the command example.
- The endpoint test used `kubectl exec` with `wget` inside the Typha container. That depends on a tool being present in the container image. I changed the validation command to use `kubectl port-forward` and local `curl`, which matches Kubernetes-supported access patterns.
- The `ServiceMonitor` snippet selected `k8s-app: calico-typha` but did not define a Service with a named `metrics` port. Prometheus Operator `ServiceMonitor` resources select Services, and `endpoints[].port` refers to the Service port name. I added a headless Service named `calico-typha-metrics` with a `metrics` port targeting Typha pods on 9093.
- The alert expression used `job="calico-typha-metrics"`. With the added Service named `calico-typha-metrics`, this now matches the Prometheus Operator default job label behavior when no `jobLabel` is set.

## Review Notes
The examples assume an operator-based Calico installation in the `calico-system` namespace and a Prometheus Operator instance configured to discover `ServiceMonitor` and `PrometheusRule` resources in that namespace.
