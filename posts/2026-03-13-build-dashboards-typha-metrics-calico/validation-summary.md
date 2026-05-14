# Validation Summary: How to Build Dashboards for Calico Typha Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Typha
- Kubernetes
- Prometheus metrics
- Prometheus Operator ServiceMonitor
- PrometheusRule alerting
- Grafana
- Alertmanager

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Typha with Prometheus - https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Prometheus Operator API reference: ServiceMonitor, Endpoint, and ServiceMonitorSpec - https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator getting started guide: ServiceMonitor usage - https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The introduction stated that Typha exposes metrics on port 9093 without qualification. Calico documents Typha metrics as disabled by default for operator installations and documents 9093 as an operator-configured metrics port. Updated the wording to say Typha can expose metrics and that operator-managed installations should enable metrics on port 9093 before scraping.
- The metrics test command read from port 9093 but did not include the operator configuration needed to enable that port. Added the `kubectl patch installation default --type=merge -p '{"spec": {"typhaMetricsPort": 9093}}'` command from Calico's monitoring documentation.
- The ServiceMonitor selected `k8s-app: calico-typha` and referenced `port: metrics`, but the post did not define the Kubernetes Service that ServiceMonitor needs to discover targets. Added a headless `typha-metrics-svc` Service with a named `metrics` port on 9093.
- The alert used `up{job="calico-typha-metrics"} == 0`, which does not match the default Prometheus Operator ServiceMonitor job label behavior. The Prometheus Operator defaults the `job` label to the associated Service name when `jobLabel` is not set, so the alert was changed to `up{job="typha-metrics-svc"} == 0`.

## Review Notes
The examples assume a Calico operator installation in the `calico-system` namespace and a Prometheus Operator setup that selects ServiceMonitor and PrometheusRule resources from that namespace. Clusters using manifest-based Calico installs, different namespaces, or custom Prometheus selectors may need matching label and namespace adjustments.
