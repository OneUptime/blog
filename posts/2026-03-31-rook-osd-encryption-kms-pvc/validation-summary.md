# Validation Summary: How to Set Up OSD Encryption with KMS on PVC Clusters in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook-Ceph (OSD encryption)
- Kubernetes
- LUKS / dm-crypt (block-level encryption)
- HashiCorp Vault (KMS)
- Ceph OSD storageClassDeviceSets (PVC-based storage)

## Sources Consulted
- Rook KMS documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/
- Rook CephCluster CRD reference: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook example cluster-on-pvc-encrypted.yaml: https://github.com/rook/rook/blob/master/deploy/examples/cluster-on-pvc-encrypted.yaml

## Issues Found

1. **Architecture incorrectly attributed OSD encryption to CSI**: The post stated "Rook CSI retrieves the key from KMS" in the architecture section. OSD encryption is managed by the Rook operator, not the CSI driver. CSI handles per-volume encryption, which is a separate feature. Fixed "Rook CSI" to "the Rook operator".

2. **Incorrect `rook-ceph-csi-kms-config` ConfigMap section**: The post included an entire section instructing readers to create the `rook-ceph-csi-kms-config` ConfigMap with CSI-specific Vault fields (`vaultPassphraseRoot`, `vaultPassphrasePath`, `vaultAddress`, `vaultRole`, `vaultAuthPath`). This ConfigMap is for CSI per-volume encryption, not OSD encryption. For OSD encryption, the KMS configuration goes exclusively in the CephCluster CR's `security.kms` section. Removed the misleading ConfigMap section and added a clarifying note.

3. **Conflicting Vault auth methods**: The CephCluster CR mixed `VAULT_AUTH_METHOD: kubernetes` and `VAULT_AUTH_KUBERNETES_ROLE` with `tokenSecretName`. These are mutually exclusive authentication approaches — Kubernetes auth uses a service account JWT (no token secret needed), while token auth requires a Vault token stored in a Kubernetes Secret. Since the post includes a "Create the Vault Token Secret" step, fixed the configuration to use token auth by removing the Kubernetes auth fields.

4. **Missing `VAULT_SECRET_ENGINE` field**: The `connectionDetails` was missing the `VAULT_SECRET_ENGINE: kv` field, which is documented as required for Vault KMS integration. Added it.

5. **Invalid verification command**: The post suggested `ceph osd dump | grep -i encrypt` to verify OSD encryption status. The `ceph osd dump` command does not include encryption-related fields — encryption is handled at the LUKS/dm-crypt layer, not tracked in the Ceph OSD map. Replaced with `lsblk | grep crypt` executed inside an OSD pod, which correctly shows dm-crypt (LUKS) devices.

## Review Notes
- The post uses `storageClassName: local-storage` in the volumeClaimTemplate example. In cloud environments (which the post mentions as the common use case for PVC-based OSDs), users would typically use a cloud-provisioned StorageClass (e.g., `gp3`, `pd-ssd`). This is not incorrect but could be clarified in a future update.
- The Vault token auth method shown is simpler but less secure than Kubernetes auth for production use. A future update could mention both approaches.
