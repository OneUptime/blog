# Validation Summary: How to Restore a Kubernetes PVC from a CSI VolumeSnapshot

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes PersistentVolumeClaims and PersistentVolumes
- Kubernetes CSI volume provisioning and snapshot restore
- `snapshot.storage.k8s.io/v1` `VolumeSnapshot` and `VolumeSnapshotContent` resources
- Kubernetes StorageClasses and volume binding modes
- Kubernetes Pods, StatefulSets, access modes, and volume modes
- `kubectl` commands, JSONPath output, and resource waiting
- Cross-namespace volume data sources and Gateway API `ReferenceGrant`

## Sources Consulted
- [Kubernetes Persistent Volumes: snapshot restore, access modes, and reclaiming](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes StorageClasses and volume binding modes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes StatefulSets and stable storage](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes `kubectl wait` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl exec` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes CSI VolumeSnapshot API reference](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes CSI PVC data sources](https://kubernetes-csi.github.io/docs/volume-datasources.html)
- [Kubernetes CSI external-provisioner documentation](https://kubernetes-csi.github.io/docs/external-provisioner.html)
- [Kubernetes CSI external-provisioner source](https://github.com/kubernetes-csi/external-provisioner/blob/master/pkg/controller/controller.go)
- [Kubernetes CSI cross-namespace data sources](https://kubernetes-csi.github.io/docs/cross-namespace-data-sources.html)
- [Kubernetes CSI volume-mode conversion protection](https://kubernetes-csi.github.io/docs/prevent-volume-mode-conversion.html)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)

## Issues Found
- The post said the target StorageClass provisioner “normally” needs to be the same driver as the snapshot content. The CSI external-provisioner explicitly rejects a restore when `VolumeSnapshotContent.spec.driver` does not equal the target `StorageClass.provisioner`. Changed the wording to state that the provisioner must match the snapshot content's driver.

## Review Notes
- The restore PVC and inspection Pod use current Kubernetes APIs and valid field names. The shell commands and flags are supported by the current `kubectl` command reference and were also checked against a local `kubectl` v1.34.1 client.
- Both YAML snippets were parsed successfully. A live restore was not performed because that requires a cluster with the relevant snapshot CRDs and a configured CSI backend.
- Volume-mode conversion protection is GA starting with Kubernetes 1.30 when the required snapshot CRDs and CSI sidecars are present. The post correctly treats conversion as an administrator-authorized exception.
- Cross-namespace volume data sources remain an alpha, opt-in feature in the current CSI documentation. The post correctly keeps that workflow separate from the ordinary same-namespace `dataSource` example.
- Storage backend behavior, supported StorageClass parameter changes, topology, encryption, access modes, and restore expansion remain CSI-driver-specific and must be confirmed in the selected vendor's documentation.
