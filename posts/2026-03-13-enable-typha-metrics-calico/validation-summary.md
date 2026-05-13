# Validation Summary: How to Enable Calico Typha Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Typha
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Prometheus Operator PrometheusRule

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Typha with Prometheus - https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes documentation: Service - https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post stated that Typha exposes metrics on port 9093 without noting that operator installs have Typha metrics disabled by default and must be configured. Added the official `kubectl patch installation default --type=merge -p '{"spec":{"typhaMetricsPort":9093}}'` command.
- The ServiceMonitor selected `k8s-app: calico-typha` and referenced `port: metrics`, but the post did not create a Service with that label and named port. Added a headless Service named `typha-metrics-svc` with a `metrics` port targeting 9093.
- The alert rule used `job="calico-typha-metrics"`, but Prometheus Operator defaults the `job` label to the associated Service name when `jobLabel` is not set. Changed the alert expression to `up{job="typha-metrics-svc"} == 0`.

## Review Notes
- Calico documentation notes that Typha uses port 9091 by default, while the operator configuration shown in this post enables port 9093.
- Prometheus installations may require labels on the ServiceMonitor so it matches the Prometheus resource's `serviceMonitorSelector`.
