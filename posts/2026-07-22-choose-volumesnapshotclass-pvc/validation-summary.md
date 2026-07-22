# Validation Summary: How to Choose the Right VolumeSnapshotClass for a PVC

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Kubernetes
- Container Storage Interface (CSI)
- PersistentVolumes and PersistentVolumeClaims
- VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass APIs
- CSI external-snapshotter
- kubectl JSONPath and custom-column output

## Sources Consulted

- [Kubernetes Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes Persistent Volumes: snapshot and restore support](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#volume-snapshot-and-restore-volume-from-snapshot-support)
- [Kubernetes Volumes: migrating from in-tree plugins to CSI](https://kubernetes.io/docs/concepts/storage/volumes/#migrating-to-csi-drivers-from-in-tree-plugins)
- [Kubernetes kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes kubectl output formats](https://kubernetes.io/docs/reference/kubectl/#formatting-output)
- [Kubernetes CSI VolumeSnapshot API reference](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes CSI VolumeSnapshotClass secrets](https://kubernetes-csi.github.io/docs/secrets-and-credentials-volume-snapshot-class.html)
- [Kubernetes CSI external-snapshotter documentation](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [Upstream VolumeSnapshotClass CRD](https://github.com/kubernetes-csi/external-snapshotter/blob/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml)
- [Upstream snapshot controller implementation](https://github.com/kubernetes-csi/external-snapshotter/blob/master/pkg/common-controller/snapshot_controller.go)

## Issues Found

- The post suggested that an empty PV `.spec.csi.driver` could indicate an incomplete CSI migration. CSI migration leaves legacy PV objects using their in-tree volume source, and the VolumeSnapshot API supports only native CSI PV sources. The guidance now states that a legacy in-tree PV must be migrated or reprovisioned as a native CSI PV before it can use VolumeSnapshot resources.
- The post stated that significant `VolumeSnapshotClass` fields cannot be updated. The current upstream CRD does not enforce immutability for `driver`, `parameters`, or `deletionPolicy`, although in-place changes do not alter existing `VolumeSnapshotContent` objects and are unsafe as policy changes. The text now recommends treating those fields as immutable and creating versioned replacement classes without claiming that the API always rejects updates.
- Default-class selection was described without limiting the statement to dynamically provisioned snapshots sourced from PVCs. The wording now makes that scope explicit; pre-provisioned snapshots bind to an existing `VolumeSnapshotContent` and do not need default-class selection.
- Restore guidance referred to a “compatible” driver. The target StorageClass provisioner must use the same CSI driver as the snapshot content, so the wording now states that exact requirement.
- The StorageClass caveat implied that its provisioner could simply change in place. The wording now identifies the relevant case: the named StorageClass can be deleted and recreated after the PV was provisioned.

## Review Notes

The Bash snippets are syntactically valid, and the `kubectl get`, JSONPath, custom-column, YAML field, default-class, secret-template, deletion-policy, and restore-size guidance matches the cited APIs and controller behavior. Snapshot and restore capabilities and all vendor-specific parameters still need validation against the documentation for the installed CSI driver and a live backend restore test, as the post recommends.
