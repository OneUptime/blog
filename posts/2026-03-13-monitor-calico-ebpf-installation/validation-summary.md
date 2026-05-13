# Validation Summary: How to Monitor Calico eBPF Installation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Tigera Operator
- eBPF
- Prometheus
- Prometheus Operator
- Grafana
- Bash

## Sources Consulted
- Calico documentation: Install in eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshooting commands - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes documentation: kubectl get reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: kube-state-metrics overview - https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics pod metrics reference - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus documentation: Histograms and summaries - https://prometheus.io/docs/practices/histograms/
- Prometheus documentation: Query functions, histogram_quantile - https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule

## Issues Found
- The recording rules and acceptance metrics used `felix_bpf_enabled` and `felix_bpf_prog_total`, which are not listed in the current Calico Felix Prometheus metric reference. Replaced them with documented BPF dataplane metrics: `felix_bpf_dataplane_endpoints` and `felix_bpf_dirty_dataplane_endpoints`.
- The baseline latency rules used `felix_int_dataplane_apply_time_seconds_bucket` with `histogram_quantile()`. Calico documents `felix_int_dataplane_apply_time_seconds` as a metric with `quantile` labels, so the rules now use the exported `quantile="0.5"` and `quantile="0.99"` series directly.
- The pod error-state query used `kube_pod_container_status_running{namespace="calico-system"} == 1`, which checks running containers rather than error states. Replaced it with a kube-state-metrics waiting-reason query for common error states.

## Review Notes
- The `bpftool prog list | grep -c "calico"` check is a reasonable low-level installation signal when `bpftool` is present in the `calico-node` container, but Calico's official eBPF troubleshooting documentation also recommends the built-in `calico-node -bpf` tool for deeper inspection.
- The Prometheus queries assume Felix metrics and kube-state-metrics are being scraped with labels that match the examples.
