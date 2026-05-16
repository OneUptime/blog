# Validation Summary: How to Monitor Kubernetes Cluster Metrics on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Prometheus (kube-prometheus-stack Helm chart)
- Grafana
- node_exporter
- kube-state-metrics
- talosctl CLI
- Helm
- PromQL

## Sources Consulted
- Talos CLI reference (v1.14): https://raw.githubusercontent.com/siderolabs/talos/main/website/content/v1.14/reference/cli.md
- Talos documentation: https://www.talos.dev/ and https://docs.siderolabs.com/talos/v1.12/reference/cli
- kube-prometheus-stack Helm chart: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- node_exporter flags reference (filesystem collector flags)
- Prometheus configuration reference (static_configs, tls_config, bearer_token_file)
- Kubernetes service account token mount path

## Issues Found

1. **`talosctl stats` description was misleading.** The post commented `# Check node resource usage` next to `talosctl stats`. Per the official Talos CLI reference, `talosctl stats` is described as "Get container stats" — it returns CPU/memory statistics for containers running on a node (via the CRI), not aggregate node resource usage. Updated the comment to "Check container resource usage (CPU/memory per container)" to accurately reflect what the command outputs. For aggregate node memory, `talosctl memory` would be the appropriate command, but the post does not need to add it — the change preserves the author's intent.

## Review Notes

- `talosctl processes` ("List running processes") and `talosctl usage` ("Retrieve a disk usage") both exist in the current Talos CLI and the post's usage of them is accurate.
- The kube-prometheus-stack values used (`serviceMonitorSelectorNilUsesHelmValues`, `podMonitorSelectorNilUsesHelmValues`, `nodeExporter.hostRootFsMount`, etc.) are valid chart configuration keys.
- Service name patterns (`prometheus-stack-grafana`, `prometheus-stack-kube-state-metrics`, `prometheus-stack-kube-prometheus-prometheus`) follow the standard kube-prometheus-stack naming convention when installed with release name `prometheus-stack`.
- The node_exporter flags `--collector.filesystem.mount-points-exclude` and `--collector.filesystem.fs-types-exclude` are current (replaced the older `--collector.filesystem.ignored-*` flags in node_exporter 1.3+).
- PromQL queries in "Key Metrics to Watch" (using `node_cpu_seconds_total`, `node_memory_MemAvailable_bytes`, `node_filesystem_avail_bytes`, `kube_node_status_condition`, `kube_pod_container_status_restarts_total`) are syntactically correct and use standard metric names exposed by node_exporter and kube-state-metrics.
- The kubelet metrics port (10250) and the service account token mount path (`/var/run/secrets/kubernetes.io/serviceaccount/token`) are accurate.
- Minor caveat (not corrected): the post says "Talos also provides its own metrics endpoint" without naming a port; Talos exposes runtime metrics via its API and components like etcd on standard ports (e.g., 2381 for etcd). The scrape example in the post targets kubelet's 10250, not a Talos-specific endpoint — readers wanting Talos COSI metrics would need to consult the Talos monitoring docs separately. This is a vague but not incorrect statement, so it was left as-is.
