# Validation Summary: How to Set Up CSI KMS Config (rook-ceph-csi-kms-config) in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CSI (Container Storage Interface driver)
- Kubernetes ConfigMaps and StorageClasses
- HashiCorp Vault (KMS backend)
- LUKS / fscrypt encryption for RBD and CephFS volumes

## Sources Consulted
- Rook Key Management System documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/key-management-system/
- Rook Ceph CSI Drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Ceph CSI KMS examples (Vault): https://github.com/ceph/ceph-csi/blob/devel/examples/kms/vault/kms-config.yaml
- Rook CSI RBD plugin templates: https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/template/rbd/csi-rbdplugin.yaml
- Rook CSI RBD provisioner deployment template: https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/template/rbd/csi-rbdplugin-provisioner-dep.yaml

## Issues Found
1. **Incorrect `encryptionKMSType` for Kubernetes Secrets backend**: The post used `"secrets-metadata"` as the value for `encryptionKMSType` in the Secrets Metadata KMS section. The correct value recognized by ceph-csi is `"metadata"`. Changed `"secrets-metadata"` to `"metadata"` in the JSON example.

## Review Notes
- The post does not mention that `CSI_ENABLE_ENCRYPTION: "true"` must be set in the `rook-ceph-operator-config` ConfigMap for CSI encryption to work. While this is outside the scope of the KMS ConfigMap topic, users following this guide alone may miss that prerequisite.
- CephFS fscrypt encryption support requires Linux kernel 6.6+. The post mentions CephFS encryption support but does not note this kernel requirement. This is a minor omission given the post's focus on KMS configuration.
- The Vault KMS example is functional but minimal. Additional fields like `vaultBackend`, `vaultBackendPath`, and `vaultCAVerify` may be needed depending on the Vault setup. The post correctly presents the core fields.
- All kubectl commands, resource names (ConfigMap, StorageClass), field names, CSI provisioner deployment name (`csi-rbdplugin-provisioner`), and daemonset name (`csi-rbdplugin`) are verified as correct.
