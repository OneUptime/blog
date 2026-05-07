# Validation Summary: How to Back Up Rancher Using the Backup Operator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Rancher Backup Operator
- Amazon S3-compatible object storage

## Sources Consulted
- Rancher documentation: Backup, Restore, and Disaster Recovery https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery
- Rancher documentation: Backing up Rancher https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher
- Rancher documentation: Backup Configuration https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher documentation: Backup and Restore Examples https://documentation.suse.com/cloudnative/rancher-manager/latest/en/rancher-admin/back-up-restore-and-disaster-recovery/configuration/examples.html
- Rancher documentation: Backup Storage Location Configuration https://ranchermanager.docs.rancher.com/v2.10/reference-guides/backup-restore-configuration/storage-configuration
- Rancher backup-restore-operator repository README https://github.com/rancher/backup-restore-operator
- Rancher backup-restore-operator chart values https://raw.githubusercontent.com/rancher/backup-restore-operator/main/charts/rancher-backup/values.yaml
- Rancher backup-restore-operator Backup CRD schema https://raw.githubusercontent.com/rancher/backup-restore-operator/main/charts/rancher-backup-crd/templates/backup.yaml
- Rancher backup-restore-operator API types https://raw.githubusercontent.com/rancher/backup-restore-operator/main/pkg/apis/resources.cattle.io/v1/types.go
- Rancher backup-restore-operator examples https://raw.githubusercontent.com/rancher/backup-restore-operator/main/examples/create-deflocation-backup.yaml

## Issues Found
- The original Helm install example did not configure any default backup storage, but the chart does not create one by default. I updated the install command to enable persistence and specify a StorageClass so the backup example works as described.
- The original UI install steps omitted configuring a default storage location. I updated the UI flow to include selecting the local cluster and configuring StorageClass or PersistentVolume-backed storage.
- The post used `resourceSetName: rancher-resource-set`, which is deprecated in Rancher documentation and replaced by `rancher-resource-set-basic` and `rancher-resource-set-full`. I updated the examples to use `rancher-resource-set-basic`.
- The sample backup status used `backupType: one-time`, but the CRD and operator use `One-time`. I corrected the example output and aligned `storageLocation` with actual operator values.
- The sample backup filename omitted the cluster-specific `kube-system` namespace UID segment used by the operator. I corrected the example filename format.
- The post said backups are stored as encrypted tarballs by default. That is incorrect; encryption is optional and only applied when `encryptionConfigSecretName` is configured. I corrected the explanation.
- The post said backups are stored in the default PersistentVolume of the operator pod. That is inaccurate; with local storage enabled they are written to the PersistentVolumeClaim mounted at `/var/lib/backups`. I corrected that wording.
- The S3 example used the deprecated ResourceSet name and a generic endpoint. I updated it to use `rancher-resource-set-basic` and a region-specific S3 endpoint example.
- The “What Gets Backed Up” section was broader than the official ResourceSet model. I rewrote it to reflect the current built-in ResourceSets and the difference between the `basic` and `full` variants.

## Review Notes
- Rancher documentation still states the backup operator supports Rancher v2.5.0 and later, but v2.5 is archived. In practice, users should match the backup operator/chart version to their Rancher version and follow the supported version guidance in the operator repository.
- The tutorial now assumes PVC-backed local storage for the first backup path. If readers prefer S3-only storage, they can skip PVC configuration and set `storageLocation` on each Backup resource instead.
