# Validation Summary: How to Encrypt Rancher Backups

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher Backup Operator
- Kubernetes
- kubectl
- OpenSSL
- Amazon S3-compatible object storage
- Kubernetes RBAC

## Sources Consulted
- Rancher Backup Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Restore Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/restore-configuration
- Rancher Backup and Restore Examples: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/backup-restore-configuration/examples
- Kubernetes `EncryptionConfiguration` API reference: https://kubernetes.io/docs/reference/config-api/apiserver-config.v1
- Kubernetes encrypting data at rest guide: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- kubectl `create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Rancher backup-restore-operator backup controller: https://github.com/rancher/backup-restore-operator/blob/main/pkg/controllers/backup/controller.go
- Rancher backup-restore-operator resource encryption path: https://github.com/rancher/backup-restore-operator/blob/main/pkg/resourcesets/collector.go
- Rancher backup-restore-operator restore decryption path: https://github.com/rancher/backup-restore-operator/blob/main/pkg/controllers/restore/download.go
- Rancher backup chart default ClusterRoleBinding: https://github.com/rancher/backup-restore-operator/blob/main/charts/rancher-backup/templates/clusterrolebinding.yaml

## Issues Found
- The post used `rancher-resource-set`, which is deprecated in current Rancher documentation. I updated the examples to `rancher-resource-set-full`, which is the current Rancher-maintained ResourceSet for backups that include secrets.
- The verification section incorrectly stated that an encrypted Rancher backup would not be readable as a tar archive. The operator still writes a gzip-compressed tar archive and encrypts matching resource payloads inside it. I corrected the verification steps to use the exact generated backup filename and inspect encrypted Secret entries inside the archive.
- The S3 download and restore examples used an inaccurate backup filename pattern and omitted the `.enc` suffix that Rancher uses for encrypted backups. I updated the commands and restore manifest to use the exact filename from backup status, including `.enc`.
- The RBAC section implied that the sample `Role` and `RoleBinding` would restrict the default backup operator. The default Rancher backup chart binds the operator service account to `cluster-admin`, so I qualified the example as applicable to custom least-privilege deployments instead.
- The prerequisite version wording was made version-agnostic so the post no longer mixes current ResourceSet guidance with older Rancher version assumptions.

## Review Notes
- The `kubectl create secret generic ... --from-file=encryption-provider-config.yaml=encryption-config.yaml` form is valid because `kubectl` supports setting a custom secret data key with `--from-file=[key=]source`.
- Rancher requires the encryption config secret to contain the key `encryption-provider-config.yaml` in the `cattle-resources-system` namespace.
- Encrypted backups can only be restored when the `Restore` resource uses the same encryption configuration secret contents that were used for the original backup.
