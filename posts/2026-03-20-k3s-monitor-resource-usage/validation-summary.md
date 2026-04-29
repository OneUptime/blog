# Validation Summary: How to Monitor K3s Resource Usage

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- kubectl
- Metrics Server
- Prometheus
- Grafana
- kube-state-metrics
- Helm

## Sources Consulted
- K3s packaged components documentation: https://docs.k3s.io/installation/packaged-components
- K3s server CLI documentation: https://docs.k3s.io/cli/server
- K3s requirements documentation: https://docs.k3s.io/installation/requirements
- K3s FAQ: https://docs.k3s.io/faq
- K3s resource profiling reference: https://docs.k3s.io/reference/resource-profiling
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes `kubectl top node` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Metrics Server official repository and installation docs: https://github.com/kubernetes-sigs/metrics-server
- kube-state-metrics official repository: https://github.com/kubernetes/kube-state-metrics
- kube-state-metrics node metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-prometheus-stack chart README: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/README.md
- kube-prometheus-stack chart values/template sources: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Grafana dashboard 315: https://grafana.com/grafana/dashboards/315-kubernetes-cluster-monitoring-via-prometheus/
- Grafana dashboard 7249: https://grafana.com/grafana/dashboards/7249-kubernetes-cluster/
- Grafana dashboard 1860: https://grafana.com/grafana/dashboards/1860-node-exporter-full/

## Issues Found
- The post said readers should install Metrics Server manually, but current K3s ships `metrics-server` as a packaged component by default unless it was disabled. I changed Method 2 to verify the packaged deployment instead of installing a second Metrics Server, and noted the `--disable=metrics-server` caveat.
- The `kubectl describe node` explanation described "Allocated resources" as requests only. I corrected it to say that section reflects requests and limits scheduled on the node.
- The Grafana dashboard list had inaccurate or outdated dashboard labels and IDs. I corrected them to the currently matching dashboard pages for IDs `315`, `7249`, and `1860`.
- The kube-state-metrics section described it as a lightweight way to monitor resource usage. I corrected that wording to reflect what kube-state-metrics actually provides: Kubernetes object-state metrics such as capacity, requests, and limits, not live CPU or memory usage like `kubectl top`.
- The node-level monitoring section treated `containerd` as a separate K3s systemd service and used a non-K3s containerd data path. I updated it to use `k3s`/`k3s-agent`, the documented K3s containerd log path, and K3s-specific storage paths.
- The sample `PrometheusRule` could be ignored by a default `kube-prometheus-stack` install because it lacked the chart's `release` label. I added that label and annotated that it must match the actual Helm release name.
- The sample CPU alert used `avg by(node)` and referenced `$labels.node`, which does not match the standard raw `node_cpu_seconds_total` label set from node-exporter. I changed the alert to group by `instance` and updated the annotations accordingly.
- The memory alert example lacked a description annotation. I added one for completeness and consistency with the CPU alert.

## Review Notes
- The post is now technically correct for current K3s and Kubernetes documentation as of April 29, 2026.
- `kubectl top` values come from Metrics Server and are optimized for autoscaling signals, so they may not exactly match OS-level tools such as `top` or `htop`.
- The repo-based Helm install commands used in the post are still valid, although the upstream chart documentation now also documents OCI installs.
- The Grafana dashboards listed are community dashboards rather than versioned K3s-specific assets, so their contents can evolve over time even when the IDs remain valid.
