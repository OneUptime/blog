# Validation Summary: How to Monitor Pod Resource Usage on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux
- Kubernetes (pods, requests/limits, OOM, CFS throttling)
- Metrics Server
- Helm
- Prometheus / kube-prometheus-stack (ServiceMonitor, PrometheusRule)
- kube-state-metrics (kube_pod_container_resource_requests/limits, kube_pod_container_status_last_terminated_reason)
- cAdvisor / kubelet metrics (container_cpu_usage_seconds_total, container_memory_working_set_bytes, container_cpu_cfs_throttled_periods_total)
- Grafana (dashboard sidecar ConfigMap)
- PromQL
- Vertical Pod Autoscaler (VPA)
- talosctl CLI

## Sources Consulted
- Metrics Server Helm chart: https://github.com/kubernetes-sigs/metrics-server/tree/master/charts/metrics-server
- Talos Linux docs (kubelet TLS / `--kubelet-insecure-tls`): https://www.talos.dev/
- kube-prometheus-stack ServiceMonitor conventions: https://github.com/prometheus-operator/kube-prometheus
- Prometheus Operator CRDs (ServiceMonitor, PrometheusRule): https://prometheus-operator.dev/docs/operator/api/
- kube-state-metrics metrics reference: https://github.com/kubernetes/kube-state-metrics/tree/main/docs
- cAdvisor metrics list: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- VPA installation guide: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler (confirmed `vpa-up.sh` is the documented install method)
- VPA releases page (confirmed no `vertical-pod-autoscaler.yaml` asset exists in releases): https://github.com/kubernetes/autoscaler/releases
- talosctl CLI reference (confirmed `talosctl stats` exists with `--nodes` and `--kubernetes` flags): https://github.com/siderolabs/talos/blob/main/website/content/v1.14/reference/cli.md
- Grafana dashboard sidecar `grafana_dashboard: "1"` label convention: https://github.com/grafana/helm-charts/tree/main/charts/grafana

## Issues Found
1. **Incorrect VPA install URL.** The post used `kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vertical-pod-autoscaler.yaml`, but the kubernetes/autoscaler releases do not publish a combined `vertical-pod-autoscaler.yaml` asset (only source tarballs are attached, verified via `gh api`). Replaced with the official install method: `git clone` the repo and run `./hack/vpa-up.sh`, as documented in `vertical-pod-autoscaler/README.md`.
2. **Imprecise talosctl example.** The post described `talosctl stats --nodes 10.0.0.10` as a "node-level resource view", but `talosctl stats` actually shows container stats. Updated the comment to reflect what it does and added `--kubernetes` so it targets the k8s.io containerd namespace (i.e., pod containers) rather than only Talos system containers.

## Review Notes
- The `--set args[0]="--kubelet-insecure-tls"` Helm syntax is correct for the metrics-server chart and is the right workaround for Talos's self-signed kubelet certs.
- The kubelet ServiceMonitor example uses `insecureSkipVerify: true`, which is appropriate for Talos but worth noting as a security tradeoff; the kube-prometheus-stack already ships an equivalent kubelet ServiceMonitor by default, so users on that stack may not need to apply this manually.
- The PrometheusRule alerts reference `kube_pod_container_status_last_terminated_reason`, which requires kube-state-metrics. The post assumes this is installed (reasonable, as it ships with kube-prometheus-stack).
- The over-provisioning PromQL uses a `[24h]` rate window, which requires at least 24h of data to produce meaningful values; readers should be aware results will be empty/unreliable on fresh installs.
- The VPA `updateMode: "Off"` recommendation-only setup is correct for the documented use case.
