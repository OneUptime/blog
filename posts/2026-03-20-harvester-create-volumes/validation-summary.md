# Validation Summary: How to Create Volumes in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Longhorn
- Kubernetes PersistentVolumeClaims (PVCs)
- Kubernetes StorageClasses
- `kubectl`

## Sources Consulted
- Harvester Create a Volume: https://docs.harvesterhci.io/v1.7/volume/index/
- Harvester Settings: https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester Configuration: https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Harvester Host Management: https://docs.harvesterhci.io/v1.7/host
- Harvester Witness Node: https://docs.harvesterhci.io/v1.7/advanced/witness
- Harvester StorageClass reference: https://docs.harvesterhci.io/v1.6/advanced/storageclass
- Longhorn StorageClass Parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn RWX Volumes: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/rwx-volumes/
- Longhorn Volume Expansion: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/expansion/

## Issues Found
- The UI example used `longhorn` as the default StorageClass and showed an `Access Mode` field. I corrected this to Harvester's documented default StorageClass `harvester-longhorn`, removed the unsupported UI field, and added the documented `Source` value.
- The empty-volume PVC example used `ReadWriteOnce`, omitted `volumeMode: Block`, and included Harvester-specific labels and annotations that are not part of the documented volume-creation flow. I replaced it with a Harvester-compatible PVC using `harvester-longhorn`, `ReadWriteMany`, and block mode, and I fixed the sample `kubectl get pvc` output to show `Bound`.
- The image-backed volume example used a CDI `DataVolume` pattern and image reference format that do not match Harvester's documented standalone volume creation flow. I replaced it with the documented PVC plus `harvesterhci.io/imageId` approach and the corresponding `longhorn-image-*` StorageClass naming pattern.
- The replica section incorrectly used a Longhorn `Setting` manifest and a PVC annotation (`longhorn.io/replica-count`) to control replicas. For Harvester and Kubernetes-provisioned volumes, replica count is set through StorageClass parameters, so I replaced both examples with StorageClass-based configurations.
- The custom StorageClass example treated `nodeSelector` as a Kubernetes label selector (`ssd=true`) rather than the Longhorn and Harvester storage-tag format. I corrected the selector values, added `migratable: "true"` for VM-oriented volumes, and aligned the example PVC with Harvester's RWX block-volume pattern.
- The monitoring and deletion commands assumed that the Longhorn volume name matched the PVC name. I updated the commands to derive the actual provisioned volume name from `spec.volumeName` before describing or verifying deletion.

## Review Notes
- Harvester's default `harvester-longhorn` StorageClass uses 3 replicas on multi-node clusters. Single-node clusters and witness-limited topologies need a StorageClass with a lower replica count to avoid degraded volumes.
- Harvester v1.7 documents online volume expansion for Longhorn, but behavior depends on the underlying storage provider and data engine. Longhorn V1 supports online expansion, while Longhorn V2 does not.
- `kubectl` was not installed in the review workspace, so command syntax was validated against the official Harvester and Longhorn documentation instead of local `--help` output.
