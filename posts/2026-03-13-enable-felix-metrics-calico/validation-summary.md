# Validation Summary: How to Enable Felix Metrics in Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Felix
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Grafana and Alertmanager

## Sources Consulted
- Calico Open Source documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Monitoring Felix with Prometheus, https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Prometheus Operator API reference, https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator getting started documentation, https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The introduction claimed Felix metrics include BGP session state. Current Calico Open Source Felix metrics documentation lists Felix, dataplane, iptables, eBPF, WireGuard, and load balancer metrics, but not BGP session state as a Felix metric. I removed the BGP session-state claim.
- The ServiceMonitor example selected `k8s-app: calico-node` and referenced a named port, but it did not define the Kubernetes Service that a ServiceMonitor needs to select. I added a headless `felix-metrics-svc` Service with a named `http-metrics` port so the ServiceMonitor can discover Felix endpoints.

## Review Notes
- The `kubectl patch felixconfiguration default --type=merge -p ...` command matches the documented FelixConfiguration fields, but using `kubectl` for Calico resources requires the Calico API server to be available. Operator-based installs include it by default.
- The examples use the `calico-system` namespace, which matches operator-based Calico installs. Manifest-based installs may use `kube-system` instead.
