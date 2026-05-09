# Validation Summary: How to Troubleshoot Calico Component Metrics Monitoring

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- Kubernetes NetworkPolicy
- Prometheus
- Prometheus Operator ServiceMonitor
- kubectl
- calicoctl
- jq

## Sources Consulted
- Calico documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Prometheus Operator documentation: Design and ServiceMonitor discovery, https://prometheus-operator.dev/docs/getting-started/design/
- Prometheus Operator documentation: API reference, https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus documentation: HTTP API targets endpoint, https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The command that inspected `serviceMonitorSelector` used `kubectl -o jsonpath` and piped the result to `jq`. For a map value, kubectl jsonpath output is not JSON, so the `jq` step would fail. Changed it to `kubectl -o json | jq '.items[0].spec.serviceMonitorSelector'`.
- The Felix label expectations implied that `node` is always present. Prometheus Operator target labels depend on ServiceMonitor relabeling, pod target labels, and attachMetadata settings, so `node` is not guaranteed. Changed the text to list common labels and note that `node` requires ServiceMonitor relabeling or attachMetadata configuration.
- The kube-controllers verification command used the incorrect resource name `kubeconfigurationcontrollers`. Changed it to the documented Calico resource `kubecontrollersconfiguration`.

## Review Notes
The NetworkPolicy example is syntactically valid and uses the standard namespace label `kubernetes.io/metadata.name`. In real clusters, ServiceMonitor names, Service names, labels, namespaces, and Prometheus selectors vary by installation method or Helm chart, so the examples remain diagnostic patterns rather than universally copy-pasteable commands.
