# Validation Summary: How to Understand the STATE Partition in Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Talos disk layout and system volumes
- Talos machine configuration
- talosctl CLI
- LUKS2 disk encryption
- Kubernetes and etcd

## Sources Consulted
- Talos v1.13 Disk Layout documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos v1.13 Disk Encryption documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Talos v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Acquiring Machine Configuration documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/acquire
- Talos Editing Machine Configuration documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos insecure flag documentation: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/insecure

## Issues Found
- The post described etcd-related data as being referenced from the STATE partition. Current Talos documentation identifies etcd data for control plane nodes as EPHEMERAL data, so this was corrected to say etcd data lives on EPHEMERAL and STATE contains sensitive node secrets and certificates.
- The disk layout combined EFI and BIOS into one entry and omitted that EPHEMERAL stores etcd data on control plane nodes. The layout was corrected to list EFI, BIOS, BOOT, META, STATE, and EPHEMERAL separately.
- The STATE encryption example used the older `machine.systemDiskEncryption.state` configuration shape. Current Talos documentation configures system volume encryption with a `VolumeConfig` document, so the YAML snippet was updated.
- The encryption explanation implied all STATE encryption uses keys derived from node identity. It now says that depends on the configured key method and adds the official caveat that `nodeID` is not intended to protect against an attacker with physical access to the whole machine.
- The example EFI partition size showed 100 MB. Current Talos disk layout examples show approximately 1 GB for EFI, so the example was updated.
- The STATE filesystem wording suggested ext4 or xfs by version. Current examples show STATE as xfs or as a LUKS-backed volume when encrypted, so the description was narrowed.

## Review Notes
The `talosctl apply-config`, `talosctl patch machineconfig`, `talosctl reset --system-labels-to-wipe`, `talosctl get disks`, `talosctl get machineconfig`, and maintenance-mode `--insecure` usage were checked against official CLI and system configuration documentation and are consistent with documented behavior.
