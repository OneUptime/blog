# Validation Summary: Troubleshooting a VolumeSnapshot Stuck at readyToUse: false

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes `snapshot.storage.k8s.io/v1` VolumeSnapshot APIs
- Container Storage Interface (CSI) snapshot RPCs and capabilities
- Kubernetes external-snapshotter, common snapshot controller, and `csi-snapshotter` sidecar
- PersistentVolumeClaims, PersistentVolumes, and VolumeSnapshotClasses
- Kubernetes Secrets, service accounts, RBAC, and finalizers
- `kubectl` inspection, logging, JSONPath, wait, and authorization commands

## Sources Consulted

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes CSI VolumeSnapshot API reference](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes CSI external-snapshotter documentation](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [External Snapshotter repository and current deployment/flag documentation](https://github.com/kubernetes-csi/external-snapshotter)
- [Current VolumeSnapshot v1 CRD schema](https://github.com/kubernetes-csi/external-snapshotter/blob/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml)
- [Current external-snapshotter common-controller source](https://github.com/kubernetes-csi/external-snapshotter/blob/master/pkg/common-controller/snapshot_controller.go)
- [Current external-snapshotter work-queue retry behavior](https://github.com/kubernetes-csi/external-snapshotter/blob/master/pkg/common-controller/snapshot_controller_base.go)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)
- [Kubernetes CSI VolumeSnapshotClass secrets](https://kubernetes-csi.github.io/docs/secrets-and-credentials-volume-snapshot-class.html)
- [Kubernetes CSI Snapshot and Restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [`kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [`kubectl wait` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [`kubectl` JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [`kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)

## Issues Found

- The opening explanation implied that every dynamic `readyToUse: false` value came from the CSI driver. The common controller can also set `VolumeSnapshot.status.readyToUse` to false for controller-side errors. The post now distinguishes those cases and ties driver-reported readiness specifically to the `VolumeSnapshotContent` status propagated from `CreateSnapshot`.
- The handle-present branch did not make clear which readiness field proved the driver was reporting an unusable backend snapshot. It now explicitly checks `VolumeSnapshotContent.status.snapshotHandle` together with that content's `status.readyToUse`, avoiding confusion with a `VolumeSnapshot` status set false by the common controller.
- The post advised recreating a snapshot when its PVC was initially unbound. That describes historical alpha behavior, but the current common snapshot controller requeues failed reconciliation with rate limiting. The post now tells readers to wait for the PVC to become stably `Bound` and recreate only when the immutable source PVC name is wrong.
- The post stated that class selection was immutable. The v1 CRD makes `spec.source` members immutable but does not make `spec.volumeSnapshotClassName` immutable. The post now distinguishes between correcting the class before content exists and the fact that changing the request after content creation does not migrate or recreate that content.
- The class lookup command could be run with an empty class name while default-class selection was still pending. The post now prints and checks the selected class before attempting to retrieve its driver.
- The snapshot-controller log command used `--all-containers` but could still select only one Pod from a replicated Deployment. It now includes `--all-pods=true` so logs from all controller replicas are collected.
- The CRD command only proved that the CRD objects existed; it did not establish that their `Established` condition was true or show whether `v1` was served. The post now uses `kubectl wait` for the condition and JSONPath output for served versions.
- The sidecar section assumed a controller Deployment or StatefulSet. Current external-snapshotter supports distributed snapshotting with a node-local sidecar, so the text now notes that mode and includes DaemonSets in workload discovery.
- The common-controller example described `kube-system` as a kubeadm-style installation even though kubeadm does not install the snapshot controller. It now identifies that example as the upstream snapshot-controller Deployment installed in `kube-system`.

## Review Notes

- The remaining commands and API field names are valid for the current `snapshot.storage.k8s.io/v1` API and current `kubectl` documentation.
- The CSI claims about `CreateSnapshot`, `ready_to_use`, optional `ListSnapshots`, capability discovery, idempotent retries, and asynchronous post-processing agree with the current CSI specification.
- Secret-name/namespace pairing, supported templates, and the different missing-secret behavior for create versus delete agree with the external-snapshotter credential documentation.
- The external links in the post resolve to the intended official Kubernetes or Kubernetes CSI documentation and repository pages.
- Backend support for online snapshots, topology, quiescing, encryption, and timeout requirements remains driver-specific, as the post states.
