# Validation Summary: How to Schedule Generic Ephemeral Volumes with WaitForFirstConsumer Topology

## Status

validated

## Post Type

Technical guide / Kubernetes configuration tutorial

## Technologies Covered

- Kubernetes Pods and scheduling
- Generic ephemeral volumes
- PersistentVolumeClaims and PersistentVolumes
- StorageClass and `WaitForFirstConsumer`
- Container Storage Interface (CSI) drivers and topology
- `CSIStorageCapacity` capacity-aware scheduling
- `kubectl`

## Sources Consulted

- [Kubernetes: Ephemeral Volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes: Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: Storage Capacity](https://kubernetes.io/docs/concepts/storage/storage-capacity/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes API: Pod](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes API: PersistentVolume](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/)
- [Kubernetes API: PersistentVolumeClaim](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/)
- [Kubernetes API: StorageClass](https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/)
- [Kubernetes API: CSIDriver](https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/)
- [Kubernetes API: CSIStorageCapacity](https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-storage-capacity-v1/)
- [Kubernetes: Finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes CSI Developer Documentation: CSI Topology](https://kubernetes-csi.github.io/docs/topology.html)
- [Kubernetes CSI Developer Documentation: Developing a CSI Driver](https://kubernetes-csi.github.io/docs/developing.html)
- [Kubernetes CSI external-provisioner](https://github.com/kubernetes-csi/external-provisioner)

## Issues Found

- The post stated that generic ephemeral volumes always depend on a storage provisioner, although their generated PVCs can also bind eligible pre-created PVs. The requirement was narrowed to the dynamically provisioned workflow shown in the post.
- The scheduling sequence stated unconditionally that kubelet stages the volume. CSI staging is an optional driver capability, so the sequence now says that kubelet stages the volume when the driver supports and requires it.
- The two `kubectl --watch` commands were described as watching the resources together, but the first command blocks in a single terminal. The instructions now explicitly say to run them in separate terminals.
- The PV inspection guidance treated node affinity and CSI topology as separate PV fields. CSI accessibility topology is represented by PV node affinity, so the wording now reflects that relationship.
- The mount verification referred to a requested filesystem even though the manifest requests filesystem volume mode but not a specific filesystem type. It now refers to the expected filesystem and usable capacity.
- The cleanup warning conflated force-deleting API objects with deleting finalizers. Finalizers are metadata keys and remain effective during ordinary deletion, so the warning now distinguishes force-deleting Pods from manually removing PVC or PV storage finalizers.

## Review Notes

- The manifests use current stable API versions and valid field names. The provisioner, StorageClass parameter, image, node label, topology key, and topology values are intentionally deployment-specific placeholders.
- The generated PVC name can collide with another deterministic Pod-and-volume name or a manually created PVC. Kubernetes will not adopt an existing same-name claim that is not owned by the Pod; such a collision prevents the Pod from starting.
- `ReadWriteOnce` limits writable attachment to one node, not necessarily one Pod. Use `ReadWriteOncePod` when single-Pod access is required and supported.
- Capacity data can be stale. The scheduler checks `maximumVolumeSize` when present and otherwise falls back to `capacity`; enabling `CSIDriver.spec.storageCapacity` before suitable capacity objects exist can pause late-bound provisioning.
