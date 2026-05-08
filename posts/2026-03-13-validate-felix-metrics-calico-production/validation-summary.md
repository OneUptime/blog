# Validation Summary: How to Validate Felix Metrics in Calico in Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Felix
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Grafana
- Alertmanager

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Prometheus Operator documentation: Getting Started with ServiceMonitors and PodMonitors - https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The ServiceMonitor example was incomplete. Prometheus Operator `ServiceMonitor` resources select Kubernetes `Service` objects, and `endpoints[].port` must refer to a named Service port. The original snippet selected `k8s-app: calico-node` but did not define a matching Service or the `http-metrics` Service port. I added a headless `Service` in `calico-system` that selects `calico-node` pods and exposes Felix metrics on named port `http-metrics`.

## Review Notes
- The Felix metrics enablement command uses valid FelixConfiguration fields. Calico documents Felix Prometheus metrics as disabled by default, with default metrics port 9091.
- The metric names used in the grep command are documented Felix metrics or documented metric prefixes.
- In non-operator Calico installations, `calico-node` may run in `kube-system` instead of `calico-system`; the post consistently targets operator-style `calico-system`.
