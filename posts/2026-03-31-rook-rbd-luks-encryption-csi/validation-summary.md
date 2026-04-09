# Validation Summary: How to Configure RBD LUKS Encryption with Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph RBD (RADOS Block Device)
- ceph-csi (CSI driver for Ceph)
- LUKS (Linux Unified Key Setup) encryption
- Kubernetes StorageClass and PVC
- HashiCorp Vault (as external KMS)
- cryptsetup

## Sources Consulted
- Rook official StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml — confirmed provisioner name is `rook-ceph.rbd.csi.ceph.com` and verified `encrypted`/`encryptionKMSID` parameters
- ceph-csi KMS config example: https://github.com/ceph/ceph-csi/blob/devel/examples/kms/vault/kms-config.yaml — confirmed correct field names (`encryptionKMSType`, `vaultAddress`, `vaultBackendPath`, `vaultRole`, `vaultAuthPath`) and ConfigMap format (`ceph-csi-encryption-kms-config` with `config.json` key)
- ceph-csi RBD deploy docs: https://github.com/ceph/ceph-csi/blob/devel/docs/rbd/deploy.md — confirmed encryption is enabled via `encrypted: "true"` and uses LUKS via cryptsetup
- Rook Key Management System documentation: https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/ — confirmed supported KMS providers
- Rook source code (`pkg/operator/ceph/csi/operator_config.go`) — confirmed KMS ConfigMap reference pattern

## Issues Found

1. **Wrong provisioner name**: The StorageClass used `provisioner: rbd.csi.ceph.com` which is the upstream ceph-csi provisioner name. When using Rook, the provisioner is prefixed with the operator namespace: `rook-ceph.rbd.csi.ceph.com`. Fixed to use the correct Rook provisioner name.

2. **Wrong KMS ConfigMap name and structure**: The post instructed readers to edit the `rook-ceph-operator-config` ConfigMap with a `CSI_ENCRYPTION_KMS_CONFIG` key. The correct approach is to create a dedicated `ceph-csi-encryption-kms-config` ConfigMap with a `config.json` key containing the KMS configuration JSON. Fixed the ConfigMap name, key, and section heading/description.

3. **Wrong secrets-metadata provider configuration**: The post used `"KMS_PROVIDER": "secrets-metadata"` with invented field names `SECRETS_METADATA_KMS_SECRET_NAME` and `SECRETS_METADATA_KMS_SECRET_NAMESPACE`. The correct ceph-csi field is `"encryptionKMSType": "metadata"` with no additional required fields for the basic case. Fixed to use the correct field names and minimal config.

4. **Wrong Vault KMS provider field names**: The post used uppercase environment-variable-style names (`KMS_PROVIDER`, `VAULT_ADDR`, `VAULT_BACKEND_PATH`, `VAULT_ROLE`, `VAULT_AUTH_METHOD`) which is the format used for Rook OSD-level encryption in the CephCluster CRD, not for ceph-csi per-PVC encryption. The correct ceph-csi format uses camelCase fields: `encryptionKMSType`, `vaultAddress`, `vaultBackendPath`, `vaultRole`, `vaultAuthPath`. Fixed all field names to match the ceph-csi KMS config format.

## Review Notes
- The post does not specify a Rook or ceph-csi version. The corrections are based on the current upstream ceph-csi KMS configuration format, which has been stable across recent versions.
- The `cryptsetup luksDump /dev/rbd0` verification command is correct in concept but the actual device path will vary depending on the node and how many RBD devices are mapped. A note about this could be helpful but is not technically incorrect.
- The StorageClass is missing some optional secret references (`controller-expand-secret-name`, `controller-expand-secret-namespace`) that are included in the official Rook example. These are needed for volume expansion to work, which the post enables via `allowVolumeExpansion: true`. This is not strictly an error since expansion will still work, but it would be best practice to include them.
- The post correctly distinguishes between per-PVC encryption keys and the overall encryption mechanism.
