# Validation Summary: How to Use Node-Specific Storage Limits with CSI Node Allocatable Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Container Storage Interface (CSI)
- CSIStorageCapacity
- CSIDriver and CSINode APIs
- StorageClass and PVC scheduling
- kubelet eviction thresholds
- kubectl and jq
- Prometheus / kube-state-metrics
- Go admission webhook example

## Sources Consulted
- Kubernetes Storage Capacity documentation: https://kubernetes.io/docs/concepts/storage/storage-capacity/
- Kubernetes CSIStorageCapacity API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-storage-capacity-v1/
- Kubernetes CSIDriver API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/csi-driver-v1/
- Kubernetes CSINode API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-node-v1/
- Kubernetes Node-specific Volume Limits documentation: https://kubernetes.io/docs/concepts/storage/storage-limits/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes CSI external-provisioner documentation: https://kubernetes-csi.github.io/docs/external-provisioner.html
- Kubernetes CSI storage capacity tracking documentation: https://kubernetes-csi.github.io/docs/storage-capacity-tracking.html
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kube-state-metrics Pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics VolumeAttachment metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/volumeattachment-metrics.md

## Issues Found
- The post described CSI node allocatable storage as if it were a kubelet allocatable storage resource. Updated the explanation to distinguish kubelet ephemeral-storage allocatable, CSIStorageCapacity objects for provisionable persistent storage, and CSINode allocatable volume counts for attach limits.
- The post said the CSI node plugin periodically updates storage capacity. Updated this to describe the CSI external-provisioner polling GetCapacity and publishing CSIStorageCapacity objects.
- The post instructed readers to enable the CSIStorageCapacity feature gate. Updated this because CSIStorageCapacity is stable in current Kubernetes releases.
- The CSIStorageCapacity label selector used `storage.kubernetes.io/csidriver`, which is not the label used by the external-provisioner. Replaced it with `csi.storage.k8s.io/drivername`.
- The maximum volumes section implied that a max-volume value can be configured directly in CSIDriver and that an unspecified value defaults to `0`. Updated it to explain that CSI drivers report the limit through NodeGetInfo, Kubernetes stores it in CSINode `allocatable.count`, and an unspecified count is treated as unbounded. Added the current `nodeAllocatableUpdatePeriodSeconds` field for refresh behavior.
- The jq command for grouping VolumeAttachment objects did not sort before `group_by`, which can produce incorrect grouping. Added `sort_by(.spec.nodeName)`.
- The Go admission webhook example had an unused `net/http` import, used an undefined `maxCapacity` helper, and could panic when `nodeTopology` was nil. Removed the unused import and added nil checks plus helper functions. The helper now prefers `maximumVolumeSize` when present, matching current scheduler behavior.
- The kubelet eviction explanation said thresholds prevent pods from consuming storage beyond the limits. Updated it to state that kubelet evicts pods when thresholds are crossed.
- The node monitoring command labeled DiskPressure status as `USED`. Renamed the output column to `DISK_PRESSURE`.
- The Prometheus CSIStorageCapacity metric was presented as if it were a standard Kubernetes/kube-state-metrics metric. Added a note that this requires CSIStorageCapacity to be exported through kube-state-metrics custom resources or another exporter.
- The dynamic allocation example implied Kubernetes automatically labels nodes with storage capacity. Updated the comment to clarify that the affinity targets nodes labeled with that capacity.
- The max-volume alert used `kube_pod_spec_volumes_persistentvolumeclaims_info` grouped by `node`, but that kube-state-metrics metric does not include a node label. Changed the alert to use `kube_volumeattachment_info`, which includes `node`.

## Review Notes
The post is technically relevant and contains implementation guidance. Some examples remain intentionally illustrative: CSI capacity and node affinity behavior depend on the CSI driver, topology labels, and monitoring stack configuration. `kubectl` was not installed in the local environment, so command validation was performed against official Kubernetes documentation and API references rather than local CLI help.
