# Validation Summary: How to Troubleshoot Felix Metrics in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Felix
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Grafana and Alertmanager

## Sources Consulted
- Calico Monitor component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator getting started guide: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The post described missing per-node labels as a FelixConfiguration label issue. FelixConfiguration enables and configures Felix metrics, but target labels for Prometheus scraping are handled by Prometheus Operator ServiceMonitor configuration, so the wording was changed to "missing target labels" and "ServiceMonitor configuration."
- The ServiceMonitor example selected `k8s-app: calico-node` directly and referenced a non-existent `http-metrics` Service port. A ServiceMonitor selects Services/Endpoints, and its `port` field refers to a named Service port. The snippet now includes a headless Service for `calico-node` pods with a named `metrics` port and a ServiceMonitor that selects that Service.
- The introduction said endpoint accessibility could fail because the FelixConfiguration Prometheus port was not set. Calico defaults the Felix Prometheus metrics port to 9091, while metrics are disabled by default, so the wording now points to metrics not being enabled.
- The cardinality wording referred specifically to per-pod metrics. The Felix metrics reference exposes runtime, process, dataplane, WireGuard, and load-balancer metrics rather than a simple per-pod metric model, so the wording now refers to extra runtime or dataplane metrics.

## Review Notes
The `kubectl patch felixconfiguration default --type=merge -p ...` command matches Calico's documented FelixConfiguration fields, but using `kubectl` for Calico API resources requires the Calico API server or native CRDs to be available in the cluster.
