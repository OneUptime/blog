# Validation Summary: How to Encrypt the EPHEMERAL Partition in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (systemDiskEncryption, VolumeConfig)
- LUKS2 disk encryption
- Kubernetes (EncryptionConfiguration API)
- etcd
- containerd / kubelet
- TPM, KMS, and node-ID-based key providers
- Prometheus / node_exporter metrics
- talosctl CLI

## Sources Consulted
- Talos Linux Disk Encryption guide: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/disk-encryption/
- Talos v1alpha1 Config reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config/
- Talos VolumeConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/block/volumeconfig/
- Talos Disk Management common configuration: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/common
- Talos Resetting a Machine guide: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/lifecycle-management/resetting-a-machine
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli/

## Issues Found
1. **`machine.volumes` is not a valid field** — In the "EPHEMERAL on a Dedicated Disk with Encryption" section, the post nested volume configuration under `machine.volumes` in the main machine config. According to the official Talos schema, volume configuration is provided as a separate `VolumeConfig` document (with `apiVersion: v1alpha1`, `kind: VolumeConfig`) appended to the machine config, not as a nested field. The encryption is also configured directly within the same `VolumeConfig` document via its `encryption` section. Updated the example to use the correct `VolumeConfig` document structure with the encryption section co-located.

## Review Notes
- All `systemDiskEncryption` snippets (basic, recovery key, EPHEMERAL-only, control plane TPM + static, and the key-type variants) match the Talos v1alpha1 schema: `provider: luks2`, `keys[]` entries with `slot` and one of `nodeID`, `static.passphrase`, `tpm`, or `kms.endpoint`.
- The `talosctl reset --nodes <ip> --system-labels-to-wipe EPHEMERAL` command is valid; `--system-labels-to-wipe` accepts `STATE` and `EPHEMERAL` and may be repeated.
- The Kubernetes `EncryptionConfiguration` example (`apiserver.config.k8s.io/v1`, `aescbc` provider, `identity` fallback) matches the upstream Kubernetes API.
- The `talosctl get cpuinfo` and `talosctl get volumestatus EPHEMERAL` invocations correspond to Talos COSI resources (`CPUInfo`, `VolumeStatus`) and are valid.
- The LUKS2 header overhead figure (~16MB) is a reasonable rule-of-thumb; the actual header is typically 16 MiB by default in cryptsetup.
- The Prometheus alert uses standard `node_exporter` metric names (`node_filesystem_avail_bytes`, `node_filesystem_size_bytes`) and reasonable label matchers.
- Performance numbers (AES-NI overhead percentages) are qualitative ballpark figures; actual results depend on hardware and workload, but the general claim that AES-NI makes encryption overhead small is accurate.
