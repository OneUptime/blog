# Validation Summary: How to Check Whether Your Kubernetes CSI Driver Supports Volume Snapshots

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes
- Container Storage Interface (CSI)
- Kubernetes VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass APIs
- CSI external-snapshotter, snapshot-controller, and external-provisioner
- PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- kubectl, JSONPath, custom-column output, shell commands, and YAML manifests

## Sources Consulted
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes: Persistent Volumes, including restore from a snapshot](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#create-a-persistentvolumeclaim-from-a-volume-snapshot)
- [Kubernetes: StorageClass volume binding modes](https://kubernetes.io/docs/concepts/storage/storage-classes/#volume-binding-mode)
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes CSI: Volume Snapshot and Restore](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI: external-snapshotter](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [Kubernetes CSI: snapshot-controller](https://kubernetes-csi.github.io/docs/snapshot-controller.html)
- [Kubernetes CSI: external-provisioner data sources](https://kubernetes-csi.github.io/docs/external-provisioner.html#datasources)
- [Kubernetes CSI: CSIDriver object](https://kubernetes-csi.github.io/docs/csi-driver-object.html)
- [Kubernetes CSI driver directory and disclaimer](https://kubernetes-csi.github.io/docs/drivers.html)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)
- [external-snapshotter v1 CRD schemas](https://github.com/kubernetes-csi/external-snapshotter/tree/master/client/config/crd)

## Issues Found
- The controller-container inspection command always queried a Deployment even though CSI controller workloads can also be StatefulSets and the preceding discovery command listed both kinds. Changed the command to use a `WORKLOAD_KIND` placeholder and added a concise instruction to replace it with `deployment` or `statefulset`.
- The restore section stated unconditionally that the new PVC's requested size must be at least `restoreSize`. The CSI specification permits a snapshot size of zero/unspecified, and the Kubernetes CRD describes `restoreSize` as optional. Changed the requirement to apply when `restoreSize` is reported.

## Review Notes
The remaining commands and manifests are syntactically valid and use the GA `snapshot.storage.k8s.io/v1` API. The post correctly distinguishes the distribution-managed snapshot controller and CRDs from the driver-side external-snapshotter, correctly states that `CSIDriver` does not expose snapshot RPC capabilities, correctly identifies `CREATE_DELETE_SNAPSHOT` as required and `LIST_SNAPSHOTS` as optional, and correctly treats snapshot creation and restored-volume data verification as separate end-to-end checks. All external links in the post resolved successfully during validation. Runtime behavior remains driver-, backend-, and cluster-version-specific, as the post notes.
