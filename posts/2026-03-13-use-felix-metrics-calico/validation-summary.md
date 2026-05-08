# Validation Summary: How to Use Felix Metrics in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Felix
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Grafana and Alertmanager

## Sources Consulted
- Calico Open Source documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: Felix configuration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source documentation: Configuring calico/node: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Prometheus Operator documentation: ServiceMonitor design: https://prometheus-operator.dev/docs/getting-started/design/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The description claimed Felix metrics can track BGP peer state changes. In Calico Open Source, the Felix metrics reference does not list BGP peer-state metrics; BGP is handled by BIRD in calico/node. Updated the description to focus on Felix policy calculation, dataplane programming failures, and Calico state.
- The introduction described IPAM metrics as `felix_ipam_*` and BGP metrics as `felix_bpf_*`/`felix_cluster_*`. Official Felix metrics do not use those groupings: `felix_bpf_*` is BPF dataplane state, `felix_cluster_*` is cluster resource state, and Calico IPAM allocation metrics are exposed by kube-controllers as `ipam_allocations_*`, not Felix `felix_ipam_*`. Updated the taxonomy to match the official Felix Prometheus reference.
- The ServiceMonitor selected `k8s-app: calico-node` directly and referenced port `http-metrics`, but ServiceMonitor selects Services, not pods, and the Calico docs require a Service to expose Felix metrics. Added a headless `felix-metrics-svc` Service with a named `http-metrics` port and changed the ServiceMonitor selector to match that Service label.

## Review Notes
- The `kubectl patch felixconfiguration default --type=merge` command and `prometheusMetricsEnabled` / `prometheusMetricsPort` fields match the Calico FelixConfiguration resource. The default Felix metrics port is 9091.
- The post assumes an operator-style Calico install using the `calico-system` namespace. Manifest-based installs may use `kube-system` instead.
