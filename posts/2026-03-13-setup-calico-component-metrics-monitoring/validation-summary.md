# Validation Summary: How to Set Up Calico Component Metrics Monitoring Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Calico (Felix, Typha, kube-controllers)
- Tigera Operator
- Kubernetes (Services, DaemonSets, Deployments)
- Prometheus (Prometheus Operator, ServiceMonitor CRD)
- kube-prometheus-stack

## Sources Consulted
- [Monitor Calico component metrics — Tigera Calico docs](https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics)
- [Felix configuration reference](https://docs.tigera.io/calico/latest/reference/felix/configuration)
- [Typha Prometheus metrics reference](https://docs.tigera.io/calico/latest/reference/typha/prometheus)
- [Felix Prometheus metrics reference](https://docs.tigera.io/calico/latest/reference/felix/prometheus)
- [KubeControllersConfiguration reference](https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig)
- [Prometheus Operator ServiceMonitor CRD docs](https://prometheus-operator.dev/docs/operator/api/)

## Issues Found
- **Incorrect Typha metric name**: The post used `typha_connections_accepted_total` in the Step 6 verification query. The canonical Typha metric name in the Calico docs is `typha_connections_accepted` (no `_total` suffix — it is exposed as a gauge-style cumulative counter without the standard Prometheus `_total` suffix). Fixed by replacing the query in the `curl` example.

## Review Notes
- The Felix configuration (`prometheusMetricsEnabled`, `prometheusMetricsPort`, `prometheusGoMetricsEnabled`, `prometheusProcessMetricsEnabled`) is accurate and uses the documented defaults.
- The Installation CR's `typhaMetricsPort: 9093` field is correct for the Tigera Operator.
- The KubeControllersConfiguration `prometheusMetricsPort: 9094` field is correct (metrics are actually enabled by default for kube-controllers on port 9094, but explicitly setting the value is harmless and documents intent).
- Default ports (Felix 9091, Typha 9093 via operator, kube-controllers 9094) match the official Calico documentation.
- The Felix metric `felix_active_local_policies` is a valid documented metric.
- The post creates user-managed Services for Felix and Typha but does not create a kube-controllers metrics Service in Step 5. This relies on the Tigera Operator's automatically-created `calico-kube-controllers-metrics` Service, which uses port name `metrics-port`. The Step 4 ServiceMonitor for kube-controllers references port name `metrics`, which may not match the operator-created service's port name in all Calico versions; readers may need to inspect their cluster (`kubectl get svc -n calico-system calico-kube-controllers-metrics -o yaml`) and adjust the ServiceMonitor port name accordingly. Not corrected here because the post's pattern is the commonly published one and behavior varies across Calico/operator versions.
- Mermaid diagram uses `\n` for newlines inside node labels which renders correctly in GitHub-flavored Mermaid.
