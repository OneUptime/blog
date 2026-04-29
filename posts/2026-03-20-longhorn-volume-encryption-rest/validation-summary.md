# Validation Summary: How to Enable Longhorn Volume Encryption at Rest - Volume

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Kubernetes CSI
- LUKS / `dm-crypt` / `cryptsetup`
- Kubernetes Secrets
- Kubernetes `StorageClass`
- Kubernetes `PersistentVolumeClaim`

## Sources Consulted
- Longhorn Volume Encryption: https://longhorn.io/docs/1.11.1/advanced-resources/security/volume-encryption/
- Longhorn Quick Installation requirements (`cryptsetup`, `dm_crypt`, device-mapper): https://longhorn.io/docs/1.11.1/deploy/install/
- Longhorn Volume Expansion for encrypted volumes: https://longhorn.io/docs/1.11.1/nodes-and-volumes/volumes/expansion/
- Kubernetes CSI StorageClass Secrets: https://kubernetes-csi.github.io/docs/secrets-and-credentials-storage-class.html
- Longhorn CRD source for `volumes.longhorn.io` resource names and `spec.encrypted`: https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/chart/templates/crds.yaml

## Issues Found
- The post omitted Longhorn's documented prerequisites for encrypted volumes. I added the requirement that worker nodes must have the `dm_crypt` kernel module loaded and `cryptsetup` installed.
- The explanation said each encrypted volume gets a unique key in a Secret. I corrected this because Longhorn documents both shared secrets and per-volume secrets via StorageClass template parameters.
- The Secret example was missing documented fields `CRYPTO_KEY_PROVIDER` and `CRYPTO_KEY_HASH`. I added both and fixed the surrounding comments.
- The Secret comments were technically incorrect: `stringData` does not require Base64 encoding, and `CRYPTO_PBKDF` is a PBKDF algorithm selection, not a PBKDF2 hash function. I corrected those comments.
- The StorageClass example omitted `csi.storage.k8s.io/node-expand-secret-name` and `csi.storage.k8s.io/node-expand-secret-namespace`, which Longhorn documents for encrypted volume expansion. I added them.
- The verification commands were inaccurate. `kubectl get volume ... | grep encrypted` would not surface encryption state from the default columns, `lhvolume` is not the correct documented resource name, and `lsblk | grep dm-crypt` is unreliable. I replaced these with `volumes.longhorn.io` and a direct JSONPath check of `spec.encrypted`, plus a more appropriate `lsblk` check.
- The key-rotation section described patching the Secret in place as though it rotated an existing volume's encryption key. Longhorn's volume-encryption docs do not document in-place key rotation for existing volumes, so I replaced that section with safer documented guidance for new volumes and data migration.
- The post claimed a typical `5-10%` performance overhead without an official Longhorn source. I removed the unsupported number and kept the general recommendation to benchmark.

## Review Notes
Validated against Longhorn 1.11.1 documentation and current Kubernetes CSI secret-handling documentation as of 2026-04-29. The post does not pin a Longhorn version, so future doc changes may require a re-review.
