# Validation Summary: How to Monitor Windows Nodes in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring V2
- Kubernetes Windows nodes
- Windows HostProcess containers
- Prometheus Operator
- windows_exporter
- Grafana
- kube-state-metrics
- PromQL

## Sources Consulted
- Kubernetes: Windows scheduling and taints/tolerations: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes: Create a Windows HostProcess Pod: https://kubernetes.io/docs/tasks/configure-pod-container/create-hostprocess-pod/
- Kubernetes: Pod OS field guidance: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes: Configure `runAsUserName` for Windows pods and containers: https://kubernetes.io/docs/tasks/configure-pod-container/configure-runasusername/
- Kubernetes: Taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- SUSE Rancher Manager: Monitoring and Dashboards / Windows cluster support: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.11/en/observability/monitoring-and-dashboards/monitoring-and-dashboards.html
- SUSE Rancher Manager: Windows Cluster Support for Monitoring V2: https://documentation.suse.com/cloudnative/rancher-manager/v2.8/en/observability/monitoring-and-dashboards/windows-support.html
- SUSE Rancher Manager: ServiceMonitor and PodMonitor Configuration: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/observability/monitoring-and-dashboards/configuration/servicemonitors-and-podmonitors.html
- SUSE Rancher Manager: Prometheus Federator selector guidance for `release: "rancher-monitoring"`: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/monitoring-and-dashboards/prometheus-federator/enable-prometheus-federator.html
- windows_exporter README: https://github.com/prometheus-community/windows_exporter
- windows_exporter Kubernetes deployment guide: https://raw.githubusercontent.com/prometheus-community/windows_exporter/master/kubernetes/kubernetes.md
- windows_exporter Kubernetes manifests: https://raw.githubusercontent.com/prometheus-community/windows_exporter/master/kubernetes/windows-exporter-daemonset.yaml
- windows_exporter PodMonitor example: https://raw.githubusercontent.com/prometheus-community/windows_exporter/master/kubernetes/windows-exporter-podmonitor.yaml
- windows_exporter collector docs: https://github.com/prometheus-community/windows_exporter/tree/master/docs
- windows_exporter latest release (`v0.31.6`, published April 1, 2026): https://api.github.com/repos/prometheus-community/windows_exporter/releases/latest
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus configuration reference for Kubernetes pod discovery labels: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana dashboard page for ID 14694: https://grafana.com/grafana/dashboards/14694-windows-exporter-dashboard/
- Grafana Dashboard HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- kube-state-metrics pod metrics reference: https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics node metrics reference: https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The original DaemonSet used a regular Windows container pattern, but the current upstream `windows_exporter` Kubernetes deployment uses a Windows HostProcess pod with pod-level `securityContext.windowsOptions.hostProcess: true`, `hostNetwork: true`, and `runAsUserName`. I updated the manifest to match the supported HostProcess deployment model.
- The post used `:latest` for the exporter image. Upstream explicitly recommends pinning a released version instead of the bleeding-edge `latest` image. I pinned the image to the current released container tag `0.31.6`.
- The original Step 2 created a headless Service "for PodMonitor". A PodMonitor scrapes Pods directly and the upstream `windows_exporter` Kubernetes example instead requires a ConfigMap for exporter configuration. I replaced the Service step with the required ConfigMap.
- The original exporter arguments enabled an old collector set including outdated `cs`-based memory assumptions. I switched the manifest to the upstream config-file approach and enabled `[defaults],container`, while restricting service collection to `containerd|kubelet` as in the upstream example.
- The memory alert and memory query used outdated metric names (`windows_os_physical_memory_free_bytes` and `windows_cs_physical_memory_bytes`). Current `windows_exporter` exposes `windows_memory_physical_free_bytes` and `windows_memory_physical_total_bytes`, so I updated those expressions.
- The Windows service alert would have matched every non-running service, creating noisy and misleading alerts. I scoped it to the Kubernetes-relevant Windows services `containerd` and `kubelet`.
- The network query did not aggregate per node even though the section describes Windows node queries. I changed it to sum per `instance`.
- The container query in Step 7 joined `windows_container_*` metrics with `kube_pod_container_info`, but current `windows_exporter` container metrics already include `namespace`, `pod`, and `container` labels. I removed the unnecessary join and updated the query accordingly.
- The restart query filtered `kube_pod_container_status_restarts_total` on a `node` label that the metric does not expose. I corrected it by joining through `kube_pod_info` and filtering Windows nodes with `kube_node_info`.
- The Grafana dashboard reference named dashboard ID `14694` incorrectly. The current Grafana page identifies it as "Windows Exporter Dashboard", so I corrected the label.
- The Grafana API example used a hard-coded in-cluster URL and an incomplete dashboard payload. I changed it to the official Dashboard HTTP API shape with a generic Grafana URL placeholder.
- The introduction and conclusion implied a purely manual setup path. Rancher Monitoring V2 can automatically deploy `windows-exporter` for RKE1 Windows clusters, so I added that version-specific caveat and clarified that the manifests are the manual/customization path.

## Review Notes
- The manual manifest path now reflects the current upstream `windows_exporter` Kubernetes guidance, but Rancher users on RKE1 Windows clusters should prefer Rancher Monitoring V2's built-in Windows support when it is available.
- The firewall init container follows the upstream `windows_exporter` manifest. Operators may still want to align the base image choice with the Windows versions they standardize on in their environment.
