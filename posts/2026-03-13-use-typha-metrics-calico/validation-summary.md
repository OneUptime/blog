# Validation Summary: How to Use Calico Typha Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Typha
- Kubernetes
- Prometheus metrics
- Prometheus Operator ServiceMonitor
- Prometheus Operator PrometheusRule

## Sources Consulted
- Calico documentation, "Monitor Calico component metrics": https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation, "Recommended Prometheus metrics": https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator design documentation: https://prometheus-operator.dev/docs/getting-started/design/

## Issues Found
- The introduction stated that Typha exposes Prometheus metrics on port 9093 without qualification. Calico documentation says operator installs require enabling `spec.typhaMetricsPort`, and that Typha uses port 9091 by default except for specific manifests such as the Amazon YAML, which set 9093. I changed the wording to say the examples enable metrics on port 9093.
- The ServiceMonitor selected `k8s-app: calico-typha` and used `port: metrics`, but the post did not define a Service with that label and named port. Prometheus Operator ServiceMonitors discover Services and their endpoints, so I added a Kubernetes Service with the matching label, selector, and `metrics` port name.
- The enablement section only tested the endpoint; it did not enable metrics for operator-based Calico installs. I added the documented `kubectl patch installation default --type=merge -p '{"spec": {"typhaMetricsPort":9093}}'` command.
- The alert rule used `up{job="calico-typha-metrics"}`, but the ServiceMonitor does not set `jobLabel`, so the default job label comes from the associated Service name. I changed the expression to `up{job="typha-metrics-svc"} == 0`.
- The conclusion said to enable metrics via ServiceMonitor. A ServiceMonitor configures Prometheus scraping; it does not enable Typha's metrics endpoint. I changed the wording to distinguish enabling metrics in Calico from collecting them with a ServiceMonitor.

## Review Notes
The alert rule syntax is valid for the Service defined in the post. If users customize the Service name or set `spec.jobLabel` on the ServiceMonitor, they should update the alert selector to match the resulting Prometheus `job` label.
