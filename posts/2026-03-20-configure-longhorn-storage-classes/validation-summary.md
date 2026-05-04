# Validation Summary: How to Configure Longhorn Storage Classes

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Kubernetes StorageClass (storage.k8s.io/v1)
- Kubernetes PersistentVolumeClaim
- kubectl (CLI: apply, get, describe, patch)
- Filesystems: ext4, xfs
- YAML manifests

## Sources Consulted
- Longhorn Storage Class Parameters reference: https://longhorn.io/docs/1.11.0/references/storage-class-parameters/
- Longhorn shipped StorageClass template: https://github.com/longhorn/longhorn/blob/master/chart/templates/storageclass.yaml
- Longhorn StorageClass example: https://github.com/longhorn/longhorn/blob/master/examples/storageclass.yaml
- longhorn-manager source for the `backingImage` parameter constant: https://github.com/longhorn/longhorn-manager/blob/master/k8s/pkg/apis/longhorn/v1beta2/backingimage.go
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes default StorageClass guidance: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/

## Issues Found
No technical issues found.

Verification details:
- Parameter defaults table matches the Longhorn 1.11 reference (numberOfReplicas=3, staleReplicaTimeout=30 minutes, fromBackup="", fsType=ext4, dataLocality=disabled, diskSelector="", nodeSelector="", recurringJobSelector="", backingImage="").
- `dataLocality` enumeration (`disabled`, `best-effort`, `strict-local`) is complete for current Longhorn releases.
- The default StorageClass YAML (`provisioner: driver.longhorn.io`, `reclaimPolicy: Delete`, `volumeBindingMode: Immediate`, `allowVolumeExpansion: true`, default-class annotation) matches the Longhorn-shipped manifest.
- `backingImage` is the correct parameter key — verified directly against the longhorn-manager `BackingImageParameterName` constant. (The Longhorn docs reference page sometimes shows this as `backingImageName`, which is a doc bug; the CSI provisioner only honors `backingImage`. The post has it right.)
- `kubectl patch storageclass ... is-default-class` commands are syntactically valid and follow the standard Kubernetes pattern documented for switching default StorageClasses.
- Comma-separated tag list semantics for `diskSelector` / `nodeSelector` are correct (these are Longhorn tags, not Kubernetes label selectors).
- PVC example is valid: `accessModes: ReadWriteOnce` is the standard Longhorn block-mode access mode, and `storageClassName: longhorn-ha` correctly references a custom class.

## Review Notes
- The Longhorn-shipped default StorageClass also includes a few additional parameters not shown in the post (e.g., `unmapMarkSnapChainRemoved`, `disableRevisionCounter`, `dataEngine`, `backupTargetName` in recent releases). The post's abbreviated example is fine for teaching purposes — the omitted fields fall back to documented defaults — but a future update could mention them for completeness.
- The "Tag a node with the 'storage' label via the Longhorn API" comment in the disk/node selector section is slightly misleading because the steps that follow describe the Longhorn UI, not the API. Functionally harmless; consider rewording in a future revision.
- `recurringJobSelector` is included in the parameter table but not demonstrated. A small example referencing a recurring job group would round out the post.
- Version-specific caveat: the post does not call out a Longhorn version. The content aligns with Longhorn 1.5–1.11. If used against a much older release (<1.4), some parameters (e.g., `recurringJobSelector`) may not be available.
