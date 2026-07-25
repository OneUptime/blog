# Validation Summary: Filesystem vs Block DataVolumes: Which `volumeMode` Works Best for KubeVirt?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes PersistentVolumes and PersistentVolumeClaims
- KubeVirt virtual machine storage and live migration
- Containerized Data Importer (CDI)
- CDI DataVolumes and StorageProfiles
- Container Storage Interface (CSI) drivers
- CSI volume cloning and snapshots
- Container runtimes (CRI-O and containerd)

## Sources Consulted

- [CDI DataVolumes documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI StorageProfile documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/storageprofile.md)
- [CDI efficient cloning documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/efficient-cloning.md)
- [CDI scratch-space documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/scratch-space.md)
- [CDI configuration documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/cdi-config.md)
- [CDI block-device ownership configuration](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/block_cri_ownership_config.md)
- [CDI registry import documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/image-from-registry.md)
- [KubeVirt filesystems, disks, and volumes documentation](https://kubevirt.io/user-guide/storage/disks_and_volumes/)
- [KubeVirt live migration documentation](https://kubevirt.io/user-guide/compute/live_migration/)
- [Kubernetes PersistentVolumes documentation](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes volume snapshots documentation](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Current CDI `v1beta1` API types](https://github.com/kubevirt/containerized-data-importer-api/blob/main/pkg/apis/core/v1beta1/types.go)
- [Current CDI controller implementation](https://github.com/kubevirt/containerized-data-importer/tree/main/pkg/controller)

## Issues Found

No technical issues found.

## Review Notes

- The `https://images.example.com/server.qcow2` URL is clearly an illustrative placeholder and must be replaced with an accessible image URL before applying the example.
- The example namespace and StorageClasses must already exist, and the StorageProfiles must advertise the requested access-mode and volume-mode combinations.
- Performance, snapshot, clone, expansion, and migration behavior remains CSI-driver and storage-backend specific, as the post correctly emphasizes.
- The older DataVolume `spec.pvc` form remains supported; `spec.storage` is the recommended convenience API and provides filesystem-overhead-aware sizing.
