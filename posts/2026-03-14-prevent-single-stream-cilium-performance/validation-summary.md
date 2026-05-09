# Validation Summary: Preventing Single-Stream Performance Degradation in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes CronJob, Deployment, Service, and DaemonSet resources
- Helm chart configuration
- Prometheus, PrometheusRule, and Pushgateway
- Hubble metrics
- iperf3 benchmarking
- Linux TCP sysctl tuning

## Sources Consulted
- Cilium Helm chart values for v1.14.19: https://raw.githubusercontent.com/cilium/cilium/v1.14.19/install/kubernetes/cilium/values.yaml
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Performance Tuning Guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Routing concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Monitoring & Metrics: https://docs.cilium.io/en/stable/observability/metrics.html
- Cilium Bandwidth Manager: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Pushgateway documentation: https://prometheus.io/docs/instrumenting/pushing/
- iperf3 official documentation: https://software.es.net/iperf/invoking.html

## Issues Found
- The benchmark CronJob used the `networkstatic/iperf3` image while also invoking `curl` and `jq`. Changed the job image to `alpine:3.20` and installed `curl`, `iperf3`, and `jq` in the command so the snippet has the tools it uses.
- The Helm snippet used outdated or incorrect Cilium chart keys: `tunnel=disabled`, `bpf.ctGlobalTCPMax`, and `bpf.ctGlobalAnyMax`. Removed the redundant tunnel setting and changed the map sizing keys to `bpf.ctTcpMax` and `bpf.ctAnyMax`, matching the Cilium Helm chart.
- The Helm section described the configuration as universally "highest-performance" even though Cilium native routing requires the underlying network to route PodCIDRs. Updated the sentence to scope the recommendation to clusters where native routing prerequisites are met.
- The Cilium configuration omitted Cilium's Bandwidth Manager settings while later recommending BBR-related TCP tuning. Added `bandwidthManager.enabled=true` and `bandwidthManager.bbr=true`, which Cilium documents for BBR congestion control for pods.
- The conntrack capacity alert used `cilium_bpf_map_ops_total`, a cumulative operations counter, as if it represented table occupancy. Changed it to alert on `cilium_bpf_map_pressure`, which Cilium documents as the map utilization pressure metric.
- The verification command grepped for `bpf-host-routing`, which is not the Cilium config key exposed for this setting. Updated it to check `routing-mode`, `enable-bpf-masquerade`, `enable-host-legacy-routing`, and `kube-proxy-replacement`.

## Review Notes
Local `helm`, `kubectl`, and `cilium` binaries were not installed in the review environment, so command validation was performed against official documentation and Cilium chart source rather than local `--help` output.
