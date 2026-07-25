# Validation Summary: Why Did CDI Fall Back from CSI or Snapshot Cloning to Host-Assisted Copy?

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes
- KubeVirt Containerized Data Importer (CDI)
- DataVolumes and PersistentVolumeClaims
- Container Storage Interface (CSI) volume cloning
- CSI VolumeSnapshots and VolumeSnapshotClasses
- CDI StorageProfiles
- Kubernetes RBAC and `kubectl`

## Sources Consulted

- [CDI efficient cloning](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/efficient-cloning.md)
- [CDI CSI volume cloning](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/csi-cloning.md)
- [CDI snapshot smart cloning](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/smart-clone.md)
- [CDI host-assisted DataVolume cloning](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/clone-datavolume.md)
- [CDI StorageProfiles](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [CDI RBAC guidance](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/RBAC.md)
- [CDI clone strategy planner](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/controller/clone/planner.go)
- [CDI clone readiness and CSI-driver compatibility logic](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/controller/clone/common.go)
- [CDI cross-namespace clone authorization logic](https://github.com/kubevirt/containerized-data-importer/blob/main/staging/src/kubevirt.io/containerized-data-importer-api/pkg/apis/core/v1beta1/authorize_utils.go)
- [Kubernetes CSI volume cloning](https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/)
- [Kubernetes VolumeSnapshotClasses](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes `kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)

## Issues Found

- The post stated that source and target PVCs must use the same StorageClass for efficient cloning. Current Kubernetes supports CSI cloning across different StorageClasses, and current CDI checks for a common CSI driver. The prerequisites and fallback guidance now distinguish different StorageClass names from incompatible CSI drivers or backends.
- The post treated an in-use source PVC as a fallback condition. Current CDI waits until the source is unused and emits a `CloneSourceInUse` event; it does not select host-assisted copy solely because the source is busy. The explanation was corrected.
- The cross-namespace permission text presented `create` on `datavolumes/source` as the only authorization path. It is the dedicated permission, but CDI also accepts broader source-namespace permissions for some source types, including permission to create Pods for PVC sources. The text now reflects that distinction.
- The `kubectl auth can-i` example used the unsupported `--api-group` flag and expressed the subresource as `datavolumes/source`. It now uses the group-qualified resource `datavolumes.cdi.kubevirt.io` with `--subresource=source`, matching current `kubectl` syntax.

## Review Notes

The post does not pin CDI, Kubernetes, or CSI-driver versions. It was reviewed against the current CDI `main` branch and current Kubernetes documentation on 2026-07-25. Efficient-clone capabilities and cross-StorageClass support remain CSI-driver-specific and should also be checked in the storage vendor's documentation.
