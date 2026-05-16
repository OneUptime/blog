# Validation Summary: How to Use LUKS2 Encryption on Talos Linux Partitions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- LUKS2 disk encryption
- cryptsetup
- Talos machine configuration
- Talos VolumeConfig
- talosctl
- Secure Boot and TPM-backed encryption

## Sources Consulted
- Talos Linux v1.13 Disk Encryption documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Talos Linux v1.13 Disk Management resources documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Talos Linux v1.13 System Volumes documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/system
- Talos Linux v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux v1.11 SecureBoot documentation: https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/bare-metal-platforms/secureboot
- Talos Linux v1.11 release notes for VolumeConfig migration: https://docs.siderolabs.com/talos/v1.11/getting-started/what%27s-new-in-talos
- Talos Linux v1.10 MachineConfig reference for legacy `machine.systemDiskEncryption`: https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config

## Issues Found
- The post used the legacy `machine.systemDiskEncryption` configuration shape throughout. Updated the examples to the current `VolumeConfig` machine configuration document used for system volume encryption in current Talos releases.
- The boot-flow description implied Talos always creates and encrypts a partition. Updated it to reflect the documented behavior: Talos locates/provisions volumes and encrypts/formats them only when empty and without a filesystem.
- The `nodeID` explanation overstated the security boundary by saying the disk can only be decrypted on the same node. Updated it to match Talos documentation: it is derived from the node UUID and partition label and is not intended to protect against full physical-machine access.
- The post recommended a static passphrase for the STATE partition as tighter secret control. Updated the example to use TPM-backed STATE encryption and added the documented warning that STATE encryption configuration is stored in cleartext in META, making static STATE keys inappropriate.
- The cipher list included unsupported Talos LUKS2 values such as `aes-cbc-essiv:sha256`, `serpent-xts-plain64`, and `twofish-xts-plain64`. Replaced them with the Talos-documented cipher values.
- The key rotation section did not mention the need to keep an unchanged working key and apply changes with a reboot. Updated the text to reflect Talos key rotation guidance.
- The status-checking section claimed `volumestatus` would include LUKS2 header details. Updated it to describe the documented volume phase and status fields.
- The AES-NI check used `talosctl get cpuinfo`, which is not a current documented resource command. Changed it to `talosctl read /proc/cpuinfo --nodes ... | grep -m1 flags`.
- The migration section described a generic reset/reprovision flow. Updated it to the documented staged apply plus partition wipe flow for EPHEMERAL and noted the separate STATE maintenance-mode flow.

## Review Notes
The post remains a technically relevant guide. Legacy `machine.systemDiskEncryption` is still supported in Talos, but the examples were updated to the current `VolumeConfig` format to avoid teaching newly deprecated configuration patterns.
