# Validation Summary: How to Set Up Rook-Ceph Encryption at Rest

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- dm-crypt/LUKS (Linux disk encryption)
- Ceph CSI driver (RBD provisioner)
- HashiCorp Vault (KMS integration)
- Ceph Messenger v2 protocol (wire encryption)

## Sources Consulted
- Rook CephCluster CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Block Storage (RBD) documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook KMS configuration documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/ceph-block-pool-crd/
- Ceph CSI RBD encryption documentation — https://github.com/ceph/ceph-csi/blob/devel/docs/deploy-rbd.md
- Rook network/encryption CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#network-configuration

## Issues Found

1. **`encryptedDevice` field location and type (OSD-level encryption YAML)**: The field was placed directly under `spec.storage.encryptedDevice` as a boolean `true`. The correct location is `spec.storage.config.encryptedDevice` as a string `"true"`. The `encryptedDevice` option belongs in the `config` map at the storage, node, or device level. Fixed the YAML and surrounding text references.

2. **Mismatched secret name in StorageClass (Kubernetes Secrets section)**: The post created a secret named `rook-csi-rbd-encrypted-provisioner` but the StorageClass referenced `rook-csi-rbd-provisioner` for `provisioner-secret-name` and `controller-expand-secret-name`. Updated the StorageClass to reference the correct secret name `rook-csi-rbd-encrypted-provisioner`.

3. **Vault KMS config copy-paste error**: Both `vaultClientCertFromSecret` and `vaultClientCertKeyFromSecret` pointed to the same secret `vault-client-cert`. These are two different credentials — the client certificate and the client certificate private key — and must reference different secrets. Changed `vaultClientCertKeyFromSecret` to `vault-client-cert-key`.

4. **Incorrect PVC encryption verification claim**: The post claimed that `rbd info` output would include `encryption` in the image features. LUKS encryption is applied by the CSI driver at the node level and is transparent to Ceph — `rbd info` does not show encryption as an RBD feature flag. Updated the verification text to explain this and describe the correct verification approach (checking for `crypto_LUKS` devices on the node via `lsblk --fs`).

## Review Notes
- The messenger v2 encryption section title says "Ceph Manager Messenger Encryption" — this is technically about the Ceph Messenger v2 protocol (msgr2), not specifically the Ceph Manager daemon. The title is slightly misleading but not incorrect enough to warrant a change.
- The `spec.network.connections.encryption.enabled` feature requires kernel 5.11 or newer, which is not mentioned in the post. This could be a useful addition for readers on older kernels.
- The post does not mention that OSD encryption with `encryptedDevice` must be `false` when using partitions in host-based clusters — this is a documented constraint that could trip up readers.
- For PVC-based clusters (using `storageClassDeviceSets`), OSD encryption uses a different field (`encrypted: true` boolean on the device set) rather than the `config.encryptedDevice` string. The post only covers the host-based approach.
