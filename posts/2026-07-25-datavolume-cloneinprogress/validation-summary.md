# Validation Summary: How to Troubleshoot a DataVolume Clone Stuck in `CloneInProgress`

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- DataVolume and PersistentVolumeClaim resources
- CDI volume populators and clone strategies
- Container Storage Interface (CSI) volume cloning
- CSI VolumeSnapshot resources
- Kubernetes RBAC and `kubectl`

## Sources Consulted
- [CDI DataVolumes documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI efficient cloning documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/efficient-cloning.md)
- [CDI host-assisted DataVolume cloning documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/clone-datavolume.md)
- [CDI volume populators documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/cdi-populators.md)
- [CDI CSI cloning documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/csi-cloning.md)
- [CDI StorageProfile documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [CDI DataVolume phase and clone-strategy API definitions](https://github.com/kubevirt/containerized-data-importer/blob/315c3a0a9d4bd8cde2a45ae0e027cfb26dce9831/staging/src/kubevirt.io/containerized-data-importer-api/pkg/apis/core/v1beta1/types.go)
- [CDI clone planner and compatibility logic](https://github.com/kubevirt/containerized-data-importer/blob/315c3a0a9d4bd8cde2a45ae0e027cfb26dce9831/pkg/controller/clone/planner.go)
- [CDI common CSI-driver matching logic](https://github.com/kubevirt/containerized-data-importer/blob/315c3a0a9d4bd8cde2a45ae0e027cfb26dce9831/pkg/controller/clone/common.go)
- [Kubernetes CSI volume cloning documentation](https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/)
- [Kubernetes VolumeSnapshot documentation](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes `kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [KubeVirt VirtualMachineInstance documentation](https://kubevirt.io/user-guide/user_workloads/virtual_machine_instances/)

## Issues Found
- The host-assisted worker commands assumed that the source worker is always in the source namespace and the target worker is always in the DataVolume namespace. CDI's current CSI-backed volume-populator flow can create a temporary target PVC and both workers in the source namespace. The text now notes this behavior, and the `describe` and `logs` examples use the namespaces reported by the Pod listings.
- The CSI checklist required identical source and target StorageClass names. Kubernetes supports cloning across different StorageClasses, and current CDI checks that the claims resolve to a common CSI driver. The checklist now requires a common driver and notes that class names may differ when the driver supports cross-class cloning. It also identifies `status.cloneStrategy` on the target StorageProfile as the effective field to inspect.
- The authorization command used an unsupported `--api-group` flag and expressed `datavolumes/source` ambiguously as the positional resource argument. It was changed to the fully qualified `datavolumes.cdi.kubevirt.io` resource with `--subresource=source`, which is the current `kubectl auth can-i` syntax for checking permission on the CDI subresource.

## Review Notes
- The review was checked against CDI main commit `315c3a0a9d4bd8cde2a45ae0e027cfb26dce9831` from 2026-07-24. The phase names and clone annotation values in the post match the current CDI API: `CloneInProgress`, `CSICloneInProgress`, `SnapshotForSmartCloneInProgress`, `SmartClonePVCInProgress`, `copy`, `snapshot`, and `csi-clone`.
- `SmartClonePVCInProgress` remains a defined DataVolume phase, while current populator-based snapshot flows can also expose `CloneFromSnapshotSourceInProgress`. The post appropriately directs readers to inspect the exact phase and complete resource YAML because observable intermediate phases vary by CDI path and version.
- CDI's efficient-cloning prose still describes matching StorageClasses as a prerequisite, but current Kubernetes cloning documentation permits different StorageClasses and current CDI planner code checks for a common CSI driver. The corrected post follows the current implementation.
