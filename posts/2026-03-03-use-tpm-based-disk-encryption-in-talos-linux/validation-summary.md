# Validation Summary: How to Use TPM-Based Disk Encryption in Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- TPM 2.0
- LUKS2 disk encryption
- SecureBoot
- Kubernetes node operations
- `talosctl`

## Sources Consulted
- Talos Linux v1.13 Disk Encryption documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Talos Linux v1.13 `VolumeConfig` reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/block/volumeconfig
- Talos Linux v1.13 SecureBoot documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/bare-metal-platforms/secureboot
- Talos Linux v1.13 `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- SideroLabs Talos releases, v1.13.2 latest stable release as of validation: https://github.com/siderolabs/talos/releases
- Trusted Computing Group TPM 2.0 Library Specification: https://trustedcomputinggroup.org/resource/tpm-library-specification/

## Issues Found
- The post used the older `machine.systemDiskEncryption` examples as the primary configuration. Current Talos documentation configures system volume encryption with `VolumeConfig`, so I updated the TPM and recovery-key examples.
- The post overstated TPM key handling by saying disk encryption keys are generated and stored inside the TPM and never leave it. Talos generates a random disk encryption key and seals it with the TPM, so I corrected the wording.
- The PCR explanation claimed Talos primarily binds to PCR 0, 4, 7, and 11 and that upgrades require re-sealing to exact new PCR values. Current Talos defaults to PCR 7 plus a signed PCR 11 policy, with configurable PCRs, so I corrected the PCR and upgrade sections.
- The recovery-key example used a static passphrase for `STATE`. Talos documents that `STATE` encryption configuration is stored in cleartext in `META`, so static keys for `STATE` weaken protection. I changed the example to a non-`STATE` volume and added the necessary caveat.
- The upgrade example used the old `ghcr.io/siderolabs/installer:v1.8.0` image. I updated it to the current stable `v1.13.2` installer image.

## Review Notes
- `talosctl get hardwareinfo --nodes ... -o yaml`, `talosctl logs machined --nodes ...`, and `talosctl upgrade --nodes ... --image ...` use valid documented command patterns.
- TPM encryption is strongest when paired with SecureBoot. The post now reflects that instead of presenting TPM alone as equivalent in all boot modes.
