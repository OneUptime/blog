# Validation Summary: How to Build Dashboards for Felix Metrics in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Felix
- Kubernetes
- Prometheus metrics
- Prometheus Operator ServiceMonitor
- Grafana dashboards

## Sources Consulted
- Calico documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: FelixConfiguration resource reference, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitoring Felix with Prometheus, https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Prometheus Operator documentation: Getting Started, ServiceMonitor and PodMonitor examples, https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference: ServiceMonitor endpoint `port` field, https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The ServiceMonitor example selected `k8s-app: calico-node` directly, but Prometheus Operator ServiceMonitors select Kubernetes Service objects, and the `endpoints[].port` value refers to a named Service port. I added a headless Service for the Felix metrics endpoint with selector `k8s-app: calico-node`, named its port `http-metrics`, and updated the ServiceMonitor selector to match the Service label.

## Review Notes
- The FelixConfiguration fields `prometheusMetricsEnabled` and `prometheusMetricsPort` are current, and Calico documents Felix metrics as disabled by default with port 9091 as the default metrics port.
- The referenced Felix metric names, including `felix_int_dataplane_failures`, `felix_calc_graph_update_time_seconds`, and `felix_iptables_rules`, are present in the official Calico Felix metrics reference.
- Prometheus Operator installations often require ServiceMonitor labels or namespace selectors to match the Prometheus resource configuration. The example is technically valid, but users may need to add deployment-specific labels depending on their Prometheus setup.
