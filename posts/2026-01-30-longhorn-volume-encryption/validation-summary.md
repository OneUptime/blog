# Validation Summary: How to Build Longhorn Volume Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Kubernetes Secrets
- Kubernetes StorageClasses and PersistentVolumeClaims
- CSI secret parameters
- dm-crypt / cryptsetup / LUKS
- Longhorn Backup custom resources
- External Secrets Operator
- Kubernetes RBAC and audit policy

## Sources Consulted
- Longhorn Volume Encryption documentation: https://longhorn.io/docs/1.12.0/advanced-resources/security/volume-encryption/
- Longhorn Create a Backup documentation: https://longhorn.io/docs/1.12.0/snapshots-and-backups/backup-and-restore/create-a-backup/
- Longhorn Restore from a Backup documentation: https://longhorn.io/docs/1.12.0/snapshots-and-backups/backup-and-restore/restore-from-a-backup/
- Longhorn kubectl install deployed resources / service account documentation: https://longhorn.io/docs/latest/deploy/install/install-with-kubectl/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes CSI StorageClass Secrets documentation: https://kubernetes-csi.github.io/docs/secrets-and-credentials-storage-class.html
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- Longhorn maintainer discussion on encrypted volume passphrase rotation: https://github.com/longhorn/longhorn/discussions/9342

## Issues Found
- The post said Secret values must be base64-encoded when using `stringData`. Kubernetes `stringData` accepts plain text, while `data` requires base64-encoded values. Updated the comment accordingly.
- The post stated Longhorn uses `LUKS2` and that each encrypted volume gets its own key. Longhorn documents LUKS via `dm_crypt` and `cryptsetup`, and the shown StorageClass uses a shared global Secret. Updated the wording to distinguish shared and per-volume Secrets.
- The encrypted StorageClass omitted `csi.storage.k8s.io/provisioner-secret-*` parameters required for provisioning and `node-expand-secret-*` parameters needed for online expansion of encrypted volumes. Added both sets of parameters.
- The post described backup-and-restore as a key rotation mechanism and included an invalid Longhorn `Volume` manifest using `spec.dataSource`. Longhorn restore via CR uses `spec.fromBackup`, and in-place passphrase rotation is not currently supported. Reworked the section to recommend creating a new encrypted PVC with a new Secret and migrating data, using backup only as a safety net.
- The key rotation script attempted to run an unsupported `longhorn-manager snapshot backup create` command from the `longhorn-driver-deployer` deployment and printed the new secret value to the console. Removed the unsupported backup command and changed the output to migration steps without echoing the key.
- The summary still implied backup-restore could rotate keys. Updated it to reflect migration to a newly encrypted volume.

## Review Notes
Longhorn's encryption docs also require `dm_crypt` to be loaded and `cryptsetup` to be installed on worker nodes. The article mentions `dmsetup` and AES-NI checks later, but a future improvement could add an explicit prerequisite step for those host requirements.
