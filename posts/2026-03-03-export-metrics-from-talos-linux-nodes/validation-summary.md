# Validation Summary: How to Export Metrics from Talos Linux Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl, machine configuration)
- Prometheus (scrape configuration, ServiceMonitor CRDs)
- Prometheus node_exporter (Helm chart from prometheus-community)
- kubelet metrics endpoints (/metrics, /metrics/cadvisor)
- etcd metrics (listen-metrics-urls on port 2381)
- kube-state-metrics
- Helm
- Kubernetes (DaemonSet, ServiceMonitor, port-forward)
- Python prometheus_client library (custom exporter)

## Sources Consulted
- Talos Linux monitoring documentation: https://www.talos.dev/v1.10/talos-guides/configuration/monitoring/
- Talos Linux talosctl CLI reference (commands: `get`, `stats`, `dashboard`, `health`)
- Talos COSI resource types (cpustats, memorystats) — cross-referenced with existing validated blog posts in this repository (e.g., `2026-03-03-monitor-disk-usage-in-talos-linux`)
- prometheus-community/prometheus-node-exporter Helm chart values reference: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-node-exporter
- prometheus-community/kube-state-metrics Helm chart reference
- etcd metrics documentation: https://etcd.io/docs/v3.5/op-guide/monitoring/ (default `--listen-metrics-urls` port 2381)
- Prometheus Operator ServiceMonitor CRD reference: https://prometheus-operator.dev/docs/operator/api/
- Cross-referenced with the related validated blog post `2026-03-03-monitor-etcd-with-prometheus-on-talos-linux` for the Talos-specific etcd metrics configuration

## Issues Found

1. **"Talos Built-in Metrics" section — incorrect claims about a Prometheus HTTP endpoint.**
   - The post claimed `talosctl -n <ip> get metrics` retrieves raw Prometheus metrics. This is not a valid command — there is no `metrics` COSI resource in Talos.
   - The post claimed Talos exposes a Prometheus-compatible HTTP endpoint on port 9100. This is incorrect — port 9100 is the standard `node_exporter` port (and using it for both would conflict with the node_exporter deployment described in the next section). Talos itself does not expose a Prometheus HTTP scrape endpoint on each node; it exposes machine statistics as COSI resources via the Talos API.
   - **Fix:** Rewrote the section to use the actual Talos-native commands (`talosctl get cpustats`, `talosctl get memorystats`, `talosctl stats`, `talosctl dashboard`) that match the patterns used in other validated posts in this repository. Removed the false port-9100 HTTP scrape claim and clarified that for time-series collection, the exporters in the later sections are required.

2. **"Exporting etcd Metrics" section — missing required machine configuration.**
   - The post claimed that "Talos Linux configures etcd to listen for metrics on port 2381" as if this were the default. In practice, Talos requires you to set `listen-metrics-urls` in the etcd `extraArgs` block of the control plane machine configuration before port 2381 becomes available for scraping (confirmed by the sibling post `2026-03-03-monitor-etcd-with-prometheus-on-talos-linux`).
   - **Fix:** Added the required machine config patch showing `cluster.etcd.extraArgs.listen-metrics-urls: http://0.0.0.0:2381` so readers can actually reach the etcd metrics endpoint before applying the ServiceMonitor.

## Review Notes
- The Python custom exporter example imports `Counter` and `json` but never uses them, and defines `talos_service_status` but never sets it. This is illustrative skeleton code and not technically incorrect, so left as-is.
- `talosctl health --run-timeout 10s` is a valid invocation; `--run-timeout` is a real flag on `talosctl health`.
- The node_exporter Helm chart name (`prometheus-community/prometheus-node-exporter`) and the kube-state-metrics chart name (`prometheus-community/kube-state-metrics`) are both correct and current.
- The kubelet ServiceMonitor uses `insecureSkipVerify: true` with the in-cluster service account token. This is the conventional kube-prometheus-stack pattern and works on Talos out of the box, since the kubelet's `webhook` authentication is enabled by default.
- The ServiceMonitor selector `k8s-app: kubelet` relies on a kubelet Service existing with that label (typically created by kube-prometheus-stack or manually). Readers who do not run kube-prometheus-stack may need to create that Service themselves, but this is standard Prometheus Operator practice and not Talos-specific.
- The etcd ServiceMonitor `selector.matchLabels: component: etcd` likewise assumes a backing Service exists; this is conventional and outside the scope of the post.
