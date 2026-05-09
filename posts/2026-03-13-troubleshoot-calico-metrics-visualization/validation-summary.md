# Validation Summary: How to Troubleshoot Calico Metrics Visualization

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Calico Felix metrics
- Kubernetes
- kubectl
- Prometheus
- PromQL
- Grafana dashboards
- Grafana Kubernetes dashboard sidecar patterns

## Sources Consulted
- Calico Felix Prometheus metric reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Grafana visualization guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-visual
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus PromQL basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Grafana standard panel options documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-standard-options/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The Grafana unit explanation said that setting a panel unit to milliseconds would multiply the value by 1000. Grafana documents standard options as display settings that do not change the underlying data, so the post now says to use seconds for a seconds-valued query, or multiply the query by 1000 when displaying milliseconds.
- The per-node PromQL example grouped by `node`, but Calico's documented examples commonly expose labels such as `instance` and `pod`; a `node` label is not guaranteed unless the scrape configuration relabels it. The query and legend were changed to use `instance`, with a note to use a relabeled Kubernetes node label when available.

## Review Notes
The kubectl command syntax matches the Kubernetes references, and the Prometheus instant-query endpoint is correct. `kubectl` is not installed in this local environment, so CLI behavior was verified against official Kubernetes documentation rather than local `--help` output.
