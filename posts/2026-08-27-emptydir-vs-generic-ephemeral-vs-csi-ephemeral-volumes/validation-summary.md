# Validation Summary: Choose Between emptyDir, Generic Ephemeral, and CSI Ephemeral Volumes

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Kubernetes Pod volumes
- `emptyDir` volumes and local ephemeral storage
- Generic ephemeral volumes and PersistentVolumeClaims
- CSI ephemeral volumes and `CSIDriver`
- Kubernetes scheduling, storage capacity tracking, resource requests, limits, quotas, and reclaim policies

## Sources Consulted
- Kubernetes ephemeral volumes: https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/
- Kubernetes volumes (`emptyDir`): https://kubernetes.io/docs/concepts/storage/volumes/#emptydir
- Kubernetes local ephemeral storage: https://kubernetes.io/docs/concepts/storage/ephemeral-storage/
- Kubernetes resource management for memory-backed `emptyDir`: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#considerations-for-memory-backed-emptydir-volumes
- Kubernetes storage capacity: https://kubernetes.io/docs/concepts/storage/storage-capacity/
- Kubernetes PersistentVolumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes ResourceQuota storage accounting: https://kubernetes.io/docs/concepts/policy/resource-quotas/#quota-for-storage
- Kubernetes Pod API (`EmptyDirVolumeSource`, `EphemeralVolumeSource`, `PersistentVolumeClaimTemplate`, and `CSIVolumeSource`): https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes `CSIDriver` API: https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/
- Kubernetes kubelet configuration source for `emptyDir.sizeLimit` eviction behavior: https://github.com/kubernetes/kubernetes/blob/master/pkg/kubelet/apis/config/types.go

## Issues Found
1. **`emptyDir` scheduling accounting omitted memory-backed volumes**: The comparison table only described disk-backed scheduling through container `ephemeral-storage` requests. Updated it to state that `medium: Memory` usage is accounted as memory and scheduling therefore depends on memory requests; `sizeLimit` itself is not a scheduler reservation. The memory-backed guidance now also recommends realistic memory requests.
2. **`emptyDir.sizeLimit` enforcement treated disk and memory media alike**: The table described all `emptyDir` limits as usage measurement followed by possible Pod eviction. Updated it to distinguish disk-backed volumes, whose measured overage can trigger eviction, from memory-backed volumes, where `sizeLimit` caps the tmpfs capacity subject to applicable memory limits.
3. **PVC quota wording could be read as runtime usage accounting**: Kubernetes storage quotas count PVC objects and requested storage, not live bytes written. Updated the generic ephemeral accounting cell to distinguish driver-backed volume capacity and quota on requested storage from Pod `ephemeral-storage` accounting.
4. **PVC provisioning wording implied that dynamic provisioning always occurs**: Updated the generic ephemeral lifecycle text to clarify that normal PVC binding applies and dynamic provisioning runs when needed.

## Review Notes
- Generic ephemeral volumes are stable from Kubernetes 1.23, and CSI ephemeral volumes are stable from Kubernetes 1.25, as stated.
- All YAML fragments use current `core/v1` Pod volume fields and valid value shapes. They are intentionally partial `spec.volumes` fragments and require a suitable StorageClass or CSI driver in the target cluster.
- CSI storage-capacity tracking for generic ephemeral volumes depends on a CSI-backed StorageClass using `WaitForFirstConsumer`, a `CSIDriver` with storage capacity enabled, and published `CSIStorageCapacity` data. The post's conditional wording is accurate.
- Local ephemeral-storage measurement and limit enforcement require a kubelet-supported node filesystem layout. This is an operational caveat, not an error in the post.
- All links in the post resolve to the intended official Kubernetes documentation. The existing `CSIDriver` API URL redirects to the current canonical path.
