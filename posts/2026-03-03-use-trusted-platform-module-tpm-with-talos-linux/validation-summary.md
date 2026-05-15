# Validation Summary: How to Use Trusted Platform Module (TPM) with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- TPM 2.0
- UEFI Secure Boot
- LUKS2 disk encryption
- Talos Image Factory
- AWS NitroTPM

## Sources Consulted
- Talos Linux Disk Encryption documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Talos Linux SecureBoot documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/bare-metal-platforms/secureboot
- Talos Linux v1.7 Disk Encryption documentation: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Talos Linux Disk Management resources documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/storage-and-disk-management/disk-management/resources
- Linux kernel TPM sysfs ABI documentation: https://www.kernel.org/doc/html/latest/admin-guide/abi-stable.html
- UAPI Linux TPM PCR Registry: https://uapi-group.org/specifications/specs/linux_tpm_pcr_registry/
- AWS EC2 NitroTPM documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enable-nitrotpm-support-on-ami.html

## Issues Found
- The post said measured boot verifies each boot stage. Measured boot records measurements; Secure Boot and TPM policies use those measurements for trust decisions. Updated the language to distinguish measurement from verification.
- The post implied Talos generally supports remote attestation and generic secure key storage. Reworded this to focus on Talos-supported signed PCR policies and TPM-sealed disk encryption keys.
- The generated Talos configuration example did not specify an installer image or install disk. Added `--install-image` and `--install-disk` placeholders so the generated config installs the intended Talos image to the intended disk.
- The initial `apply-config` command omitted `--insecure`, which is required when applying configuration to a node in maintenance mode before cluster PKI is available. Added it to the install flow.
- The Image Factory bare-metal installer path used a generic installer URL. Updated it to the documented `metal-installer` path.
- The Secure Boot examples hardcoded older Talos versions. Replaced those with `<talos-version>` placeholders to avoid publishing stale commands.
- The Image Factory comment said the schematic includes Secure Boot. Secure Boot is selected through the secureboot asset path, not the schematic itself. Corrected the comment.
- The upgrade section said TPM keys are automatically re-sealed. Talos Secure Boot TPM unlocking depends on a new UKI with a PCR policy signed by the same PCR signing key and matching configured PCR states. Updated the wording and upgrade image example.
- The recovery key example added a static key to STATE without warning that Talos stores STATE encryption configuration in META. Restricted the backup-key example to EPHEMERAL and added the Talos warning.
- The verification command used `systemdiskencryptionstatus`, which is not a documented Talos resource. Replaced it with `volumeconfigs` and `volumestatus` checks documented by Talos.

## Review Notes
The older `machine.systemDiskEncryption` configuration style is still documented for Talos v1.7 and compatible with the version style used in parts of the post. Current Talos documentation also documents `VolumeConfig` for system volume encryption, so a future refresh could update the examples to the newer multi-document configuration style.
