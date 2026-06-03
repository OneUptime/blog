# Validation Summary: How to Right-Size Ephemeral Storage Requests for Container Logs and Temp Files

## Status
validated

## Post Type
Technical guide / Kubernetes operations tutorial

## Technologies Covered
- Kubernetes pods, Deployments, ResourceQuotas, and kubelet configuration
- Local ephemeral storage requests and limits
- emptyDir volumes
- Container logging and kubelet log rotation
- kubelet Summary API and Prometheus metrics
- containerd node storage paths

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Logging Architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes Kubelet Configuration API v1beta1: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Node metrics data / Summary API: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- containerd CRI Plugin Config Guide: https://github.com/containerd/containerd/blob/main/docs/cri/config.md

## Issues Found
- Corrected the list of storage sources. ConfigMap and Secret volumes are not writable container areas, and image layers are node local storage rather than normal writable pod usage; the post now distinguishes pod writable/log/emptyDir usage from image storage contributing to node disk pressure.
- Removed the claim that the kubelet Summary API requires metrics-server. Kubernetes documents this as a kubelet Summary API request proxied through the API server.
- Clarified that `kubectl exec <pod> -- df -h /` shows filesystem capacity visible in the container, not the kubelet's full pod ephemeral storage accounting.
- Replaced an incorrect containerd writable-layer path under the content store with the overlay snapshotter path, while noting that it is runtime and snapshotter dependent.
- Fixed invalid Deployment manifests by adding required `spec.selector` and matching pod template labels.
- Fixed a volume name mismatch in the log-rotation Deployment where the container mounted `logs` but the volume was named `emptyDir`.
- Replaced the containerd log rotation configuration with kubelet `containerLogMaxSize`, `containerLogMaxFiles`, `containerLogMaxWorkers`, and `containerLogMonitorInterval`, which are the Kubernetes-supported CRI log rotation settings.
- Clarified that memory-backed `emptyDir` usage is charged to memory rather than local ephemeral storage.
- Replaced an ineffective initContainer temp cleanup example. An initContainer runs before the main container and would not continuously clean files that accumulate during runtime; the example now uses a continuous sidecar.
- Replaced invalid Prometheus queries using `kubelet_volume_stats_*{volume_type="ephemeral"}`. Kubernetes documents `kubelet_volume_stats_*` with PVC labels, not a `volume_type="ephemeral"` label. The post now uses documented kubelet log usage and eviction metrics.
- Updated the right-sizing measurement command to use the kubelet Summary API rather than `du -sh /` inside the container.

## Review Notes
The post is now technically valid for current Kubernetes behavior. Future improvements could add environment-specific guidance for clusters that scrape cAdvisor/container filesystem metrics, but those metrics vary by setup and were not added as canonical examples.
