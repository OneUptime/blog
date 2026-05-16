# Validation Summary: How to Encrypt the STATE Partition in Talos Linux

## Status
validated

## Post Type
Tutorial / Security configuration guide

## Technologies Covered
- Talos Linux (talosctl, machine config, COSI VolumeStatus resource)
- LUKS2 disk encryption (cryptsetup defaults: AES-XTS-plain64)
- TPM-based key sealing
- KMS-based key sealing
- Kubernetes PKI (CA, etcd, API server, service account signing keys)
- Prometheus / node_exporter textfile collector
- GPG (machine config backups)

## Sources Consulted
- Talos v1.10 disk management guide: https://www.talos.dev/v1.10/talos-guides/configuration/disk-management/
- Talos v1.10 config reference (`SystemDiskEncryptionConfig`, `EncryptionKey`): https://www.talos.dev/v1.10/reference/configuration/v1alpha1/config/
- Talos Sidero Labs disk-management storage docs: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Talos source: `pkg/machinery/resources/block/volume_status.go` (VolumeStatusSpec YAML tags)
- cryptsetup LUKS2 default cipher behavior (used when Talos passes through to cryptsetup)
- Prometheus node_exporter textfile collector documentation

## Issues Found
1. **`VolumeStatus` YAML field names were wrong.** The post showed the `talosctl get volumestatus STATE -o yaml` output as a nested `encryption.provider` map plus `mountpoint:` and a capitalised `phase: Ready`. Per `pkg/machinery/resources/block/volume_status.go`, the actual `VolumeStatusSpec` is flat: the field is `encryptionProvider:` (not nested), `mountLocation:` (not `mountpoint`), and `phase` values are lowercase (`ready`). Updated the example to match the real serialisation.

2. **Fabricated Prometheus metric `talos_volume_status`.** Talos does not natively expose a `talos_volume_status` gauge — no such metric is registered anywhere in the Talos codebase, so the alert as originally written would never fire on any value. Rewrote the "Monitoring STATE Health" section to be honest about this: it now shows a small adapter script that runs `talosctl get volumestatus STATE -o json`, derives a 0/1 value, and writes it via the node_exporter textfile collector, then alerts on the synthesized `talos_state_ready` metric.

3. **Overstated "default cipher" claim.** The post claimed "The default cipher (AES-XTS-plain64 with 256-bit key)" as if Talos itself sets a default. Talos delegates to cryptsetup when `cipher`/`keySize` are unspecified, so the defaults that apply are LUKS2/cryptsetup defaults (currently AES-XTS-plain64 with a 512-bit key, i.e. AES-256-XTS). Softened the wording to attribute the default to LUKS2 and clarified the actual key length.

## Review Notes
- The `systemDiskEncryption.state` schema fields (`provider`, `keys[]` with `slot`, `cipher`, `keySize`) are all valid for Talos v1.10.
- All four key types shown (`nodeID: {}`, `tpm: {}`, `static: { passphrase }`, `kms: { endpoint }`) match the `EncryptionKey` schema and use the correct field names.
- `talosctl apply-config --insecure`, `talosctl bootstrap`, `talosctl gen config`, `talosctl get volumestatus`, `talosctl get volumes`, `talosctl get machineconfig`, and `talosctl logs machined` are all valid invocations.
- The STATE partition details (filesystem `xfs`, ~100 MiB size from `minSize`/`maxSize` = 104857600, mount at `/system/state`) match the Talos `VolumeConfig` definitions exactly.
- The `keySize: 512` comment ("256-bit AES with 256-bit tweak") is the correct interpretation of AES-XTS keying.
- The `/dev/sda5` location in the example output is plausible but disk-and-layout-dependent — kept as illustrative.
- The static-passphrase examples (e.g. `"state-recovery-key-2025"`) are placeholders only; the post already warns that passphrases are stored in plaintext in the machine config in the related disk-encryption posts. Could be worth a similar explicit warning here in a future edit, but not a correctness issue.
