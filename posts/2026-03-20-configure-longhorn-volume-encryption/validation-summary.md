# Validation Summary: How to Configure Longhorn Volume Encryption

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Longhorn (Kubernetes block storage)
- Kubernetes (Secrets, StorageClass, PVC, Pod)
- LUKS / LUKS2 (Linux Unified Key Setup)
- `cryptsetup` and the `dm_crypt` kernel module
- CSI external-provisioner secret parameters (`csi.storage.k8s.io/*-secret-name|namespace`)

## Sources Consulted
- Longhorn official docs — Volume Encryption: https://longhorn.io/docs/1.6.0/advanced-resources/security/volume-encryption/
- Kubernetes CSI external-provisioner secret reference: https://kubernetes-csi.github.io/docs/secrets-and-credentials-storage-class.html
- `cryptsetup` / LUKS2 reference (kernel.org cryptsetup project)

## Issues Found
1. **Invented Secret fields removed.** The original Secret YAML included `CRYPTO_LUKS_CIPHER`, `CRYPTO_LUKS_KEY_SIZE`, and `CRYPTO_LUKS_HASH`. These keys are not recognized by Longhorn's CSI driver — the official docs only support the `CRYPTO_KEY_*` and `CRYPTO_PBKDF` keys. Removed.
2. **Invalid `CRYPTO_KEY_ITERATIONS` field removed.** Longhorn does not expose a key-iteration count; iterations are controlled implicitly by the chosen PBKDF. Replaced with the actual supported field, `CRYPTO_PBKDF` (default `argon2i`).
3. **Missing `CRYPTO_KEY_SIZE` added.** This is the valid Longhorn parameter for key size in bits (must be a multiple of 8; default `256`). The original post's `CRYPTO_KEY_HASH: "sha256"` was incorrectly commented as "Key size in bits (256 or 512)" — `CRYPTO_KEY_HASH` is the passphrase hash algorithm, not the key size. Comments corrected and the proper `CRYPTO_KEY_SIZE` field added.

## Review Notes
- The post correctly states that Longhorn introduced LUKS volume encryption in v1.2.0. The richer set of cipher/hash/size/PBKDF tunables documented here (`CRYPTO_KEY_CIPHER`, `CRYPTO_KEY_HASH`, `CRYPTO_KEY_SIZE`, `CRYPTO_PBKDF`) became configurable in later releases (around v1.5+); for older v1.2–v1.4 clusters, only `CRYPTO_KEY_VALUE` and `CRYPTO_KEY_PROVIDER` are honored and the rest fall back to defaults.
- The StorageClass examples correctly reference all three CSI secret hooks (`provisioner-secret`, `node-stage-secret`, `node-publish-secret`); per Longhorn's docs, `node-publish-secret` and `node-stage-secret` are the ones strictly required for encryption, but supplying the provisioner secret as well is harmless and matches Longhorn's own examples.
- The per-namespace example correctly uses the CSI templating variable `${pvc.namespace}`, which is supported by the external-provisioner.
- The "Encryption Key Rotation" section is a high-level description rather than a concrete procedure. Longhorn does not provide an automated key-rotation workflow today — true rotation requires `cryptsetup luksAddKey` / `luksRemoveKey` against the underlying device, or migrating data to a new encrypted volume. Patching the Kubernetes Secret alone will not re-key existing LUKS headers; the warning callout is appropriate but readers should treat the snippet as illustrative only.
- The verification section's `lsblk -f | grep crypt` is a useful sanity check; on some distros the type is reported as `crypto_LUKS` on the parent and the mapper device is the unlocked volume — both should appear.
