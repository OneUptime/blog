# Validation Summary: Why a PVC Restored from a VolumeSnapshot Appears Empty

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Kubernetes
- Container Storage Interface (CSI)
- `VolumeSnapshot` and `VolumeSnapshotContent`
- `PersistentVolumeClaim` and `PersistentVolume`
- StorageClass and CSI dynamic provisioning
- Kubernetes Pods, volume mounts, and `subPath`
- `kubectl`
- BusyBox
- CSI volume group snapshots

## Sources Consulted

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI Developer Documentation: VolumeSnapshot API](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes: PersistentVolumeClaim API](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/)
- [Kubernetes: Volume Populators and Data Sources](https://kubernetes.io/docs/concepts/storage/volume-populators-and-data-sources/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: Volumes and `subPath`](https://kubernetes.io/docs/concepts/storage/volumes/#using-subpath)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes: `snapshot.storage.kubernetes.io/allow-volume-mode-change`](https://kubernetes.io/docs/reference/labels-annotations-taints/#snapshot-storage-kubernetes-io-allow-volume-mode-change)
- [Kubernetes v1.36: Moving Volume Group Snapshots to GA](https://kubernetes.io/blog/2026/05/08/kubernetes-v1-36-volume-group-snapshot-ga/)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: `kubectl exec`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes CSI external-provisioner source](https://github.com/kubernetes-csi/external-provisioner)
- [BusyBox command reference](https://busybox.net/downloads/BusyBox.html)
- Local `kubectl` v1.34.1 command help and the published `busybox:1.36` image's applet help

## Issues Found

- The restore check treated an absent `spec.dataSource` as proof that an empty volume was requested. Kubernetes can also express the source through `spec.dataSourceRef`, especially for feature-gated cross-namespace data sources. The post now tells readers to check both relevant fields before drawing that conclusion and clarifies that the shown `dataSource` form is same-namespace.
- The PVC event guidance claimed that a successful event should state that provisioning used the snapshot. CSI provisioning success events can be generic. The post now uses events for provisioner identification and errors, and relies on the stored source reference and snapshot object chain as proof.
- The readiness explanation overgeneralized `readyToUse: true` as a direct driver assertion. For a pre-provisioned snapshot, controllers can set it to `true` when the driver does not implement `ListSnapshots`. The post now describes readiness as controller-visible restore readiness without treating it as evidence of the captured files or application consistency.
- The inspection command used `find -ls`, which is not supported by the `find` applet in the published `busybox:1.36` image. It now uses the supported `-print` action.
- The `subPath` explanation reversed the mount view. A `subPath` selects a directory inside the volume and mounts that directory at `mountPath`; it does not append the subpath to the container mount path. The explanation was corrected.
- The source-PVC tracing instruction assumed every snapshot was dynamically created. The post now limits `persistentVolumeClaimName` and source `volumeHandle` tracing to dynamic snapshots and directs pre-provisioned snapshot users to verify the imported provider handle.
- The consistency wording was aligned with the Kubernetes VolumeGroupSnapshot guarantee: a group snapshot provides a crash-consistent point in time across its volumes, subject to CSI driver support.
- A readiness probe was incorrectly described as deciding to initialize an empty database. Readiness probes only control readiness and Service endpoint participation. The warning now correctly targets startup automation.
- The recommendation to restore into an isolated namespace conflicted with the same-namespace behavior of the shown `dataSource` reference. It now recommends an isolated workload, which works without requiring the alpha cross-namespace data-source feature and a `ReferenceGrant`.
- The documentation link labeled as covering PVC data sources led to the CSI volume-cloning page. It was replaced with the current Kubernetes Volume Populators and Data Sources page.

## Review Notes

- The stable `snapshot.storage.k8s.io/v1` API, PVC and Pod manifests, JSONPath/custom-column expressions, snapshot binding fields, restore-size rule, CSI driver matching, volume-mode annotation, read-only mount caveat, and `ReadWriteOnce` discussion are technically correct.
- Cross-namespace snapshot sources remain an alpha, feature-gated capability in Kubernetes v1.36 and require `dataSourceRef`, CSI provisioner support, Gateway API `ReferenceGrant`, and the relevant feature gates. The post's standard `dataSource` example correctly remains same-namespace.
- The workload inspection commands assume the selected application container includes `mount` and `df`. For multi-container or distroless Pods, readers may need `kubectl exec -c` or a separate debugging container.
