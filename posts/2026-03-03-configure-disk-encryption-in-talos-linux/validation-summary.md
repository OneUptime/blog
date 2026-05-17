# Validation Summary: How to Configure Disk Encryption in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`machine.systemDiskEncryption` configuration)
- LUKS2 disk encryption
- `talosctl` CLI (apply-config, get volumeconfigs/volumestatus/processors, reset)
- TPM 2.0
- KMS (Key Management Service) integration
- AES-XTS cipher and AES-NI hardware acceleration
- Kubernetes (general node-level context)

## Sources Consulted
- Talos Disk Encryption guide: https://www.talos.dev/latest/talos-guides/configuration/disk-encryption/ and versioned equivalents at https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Talos v1alpha1 configuration reference (EncryptionConfig / EncryptionKey): https://pkg.go.dev/github.com/siderolabs/talos/pkg/machinery/config/types/block
- Disk Management guide (volume resources): https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Resetting a Machine guide (`--system-labels-to-wipe`): https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/lifecycle-management/resetting-a-machine
- Talos for Linux Admins (hardware resources, processors): https://docs.siderolabs.com/talos/v1.12/learn-more/talos-for-linux-admins
- Siderolabs/talos GitHub issue #9519 (`cpus` resource ambiguity)

## Issues Found

1. **`keySize: 256` was incorrect for `aes-xts-plain64`.** LUKS2's `keySize` is the total XTS key length in bits. For AES-256-XTS the correct value is `512` (256-bit encryption key + 256-bit tweak); `256` would imply AES-128-XTS. Changed the YAML example to `keySize: 512` and updated the surrounding prose to clarify that "AES-XTS-512" maps to AES-256 plus a 256-bit tweak.

2. **`talosctl get volumes` is not a valid resource.** Talos exposes `volumeconfigs`, `volumestatus`, `discoveredvolumes`, and `disks`, but no plain `volumes`. Changed the example to `talosctl get volumeconfigs ... -o yaml` and updated the accompanying comment.

3. **`talosctl get cpuinfo` is not a valid resource.** The CPU/processor information is exposed via the `processors` resource (`cpus` is ambiguous, see siderolabs/talos#9519). Changed the command to `talosctl get processors --nodes ... -o yaml`.

4. **Missing security caveat about `static` keys on the `state` volume.** The official docs explicitly recommend against using `static` keys for `state` because the passphrase is persisted to the META partition. Added a short note recommending `nodeID`/`tpm`/`kms` for `state` and reserving `static` for `ephemeral` if needed.

## Review Notes
- `provider: luks2`, the four key types (`nodeID`, `static`, `tpm`, `kms`), the `slot` field, the `cipher`/`keySize`/`blockSize` field names, and the `static.passphrase` / `kms.endpoint` shapes all check out against the v1alpha1 schema.
- The `--insecure` flag on `talosctl apply-config` is correct for the initial maintenance-mode apply.
- `talosctl reset --system-labels-to-wipe STATE --system-labels-to-wipe EPHEMERAL` is correct; the flag is repeatable.
- Not mentioned in the post but potentially worth adding in the future: the `lockToState: true` flag on `EncryptionKey`, which binds an `ephemeral` key to the `state` volume — a common hardening recommendation.
- The "Encryption and Upgrades" section is conceptually accurate but glosses over UKI / secure boot interactions that some readers may need; out of scope for the changes made here.
