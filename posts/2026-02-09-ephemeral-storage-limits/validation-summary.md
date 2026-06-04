# Validation Summary: How to Configure Ephemeral Storage Limits for Preventing Disk Pressure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes local ephemeral storage
- Kubernetes kubelet eviction thresholds
- emptyDir volumes
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- crictl and kubectl commands

## Sources Consulted
- Kubernetes documentation: Local ephemeral storage, https://kubernetes.io/docs/concepts/storage/ephemeral-storage/
- Kubernetes documentation: Resource management for Pods and containers, https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Node-pressure eviction, https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes documentation: Volumes / emptyDir, https://kubernetes.io/docs/concepts/storage/volumes/#emptydir
- Kubernetes documentation: Kubernetes metrics reference, https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes documentation: Resource usage monitoring, https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/
- Kubernetes documentation: Metrics for Kubernetes object states, https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference, https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Operator API reference, https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes documentation: Debugging Kubernetes nodes with crictl, https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- cri-tools crictl documentation, https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md

## Issues Found
- The post described an ephemeral-storage limit as directly preventing a pod from using more than the limit. Kubernetes marks the pod for eviction when measured usage exceeds the limit, so the wording was corrected.
- The post said emptyDir volumes count against ephemeral storage without the memory-backed exception. Added the `tmpfs` / memory-backed emptyDir caveat.
- The kubelet configuration section referred to YAML configuration fields as flags. Updated the wording to "fields."
- The `imagefs` explanation did not account for the current `containerfs` distinction. Updated the text to match Kubernetes filesystem signal terminology.
- The ServiceMonitor example used deprecated `bearerTokenFile`. Replaced it with `authorization.credentials` and noted that the referenced Secret must exist.
- The Prometheus alert used `kubelet_volume_stats_*`, which is for volume stats and does not provide a pod ephemeral-storage-limit signal as written. Replaced it with a log-filesystem usage alert using `kubelet_container_log_filesystem_used_bytes` and kube-state-metrics container ephemeral-storage limits.

## Review Notes
The revised alert covers container log usage against configured ephemeral-storage limits, not total pod ephemeral storage. A complete production alert for all ephemeral-storage contributors may need additional runtime or cAdvisor metrics depending on the cluster's scrape configuration.
