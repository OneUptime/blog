# Validation Summary: How to Understand the EFI Partition in Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- UEFI and EFI System Partition
- Talos disk layout and system volumes
- Talos bootloaders (`systemd-boot` and GRUB)
- Unified Kernel Images (UKIs)
- Secure Boot
- `talosctl`

## Sources Consulted
- Talos Disk Layout documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos Boot Loader documentation: https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/bare-metal-platforms/bootloader
- Talos SecureBoot documentation: https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/bare-metal-platforms/secureboot
- Talos Upgrading documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos GitHub releases: https://github.com/siderolabs/talos/releases
- UEFI Specification 2.10, Media Access protocols: https://uefi.org/specs/UEFI/2.10/13_Protocols_Media_Access.html

## Issues Found
- The post described current UEFI Talos installs as loading the kernel and initramfs from a BOOT partition. Updated this to reflect current `systemd-boot` and UKI behavior, while preserving a note for older GRUB-based or upgraded installs.
- The disk layout listed a separate BOOT partition and a roughly 100 MB ESP. Updated the default current layout to EFI, META, STATE, and EPHEMERAL, with the EFI partition around 1 GB.
- The post stated that the EFI partition must always be first because UEFI requires it. Corrected this to say Talos places it at the start of its default layout, but UEFI does not require that placement.
- The inspection commands used `talosctl get blockdevices` and described `talosctl get disks` as listing partitions. Replaced the block device command with `talosctl get discoveredvolumes`, adjusted the mount command to `talosctl mounts`, and corrected the command comments.
- The Secure Boot section implied generic official images work out of the box. Updated it to reference SecureBoot boot assets and signed Image Factory images, including the need for proper signing and key enrollment for custom images.
- The upgrade section claimed both EFI and BOOT partitions are updated on upgrade and that the ESP bootloader maintains two boot slots. Updated this to Talos' documented A/B image scheme and current UKI-on-ESP behavior.
- The example upgrade image used the outdated `v1.7.0` tag. Updated it to the current stable `ghcr.io/siderolabs/installer:v1.13.2` release available on May 16, 2026.
- The UEFI fallback boot path wording was too absolute. Updated it to describe `EFI/BOOT/BOOTX64.EFI` as a common x86_64 fallback path rather than guaranteed behavior for every firmware.

## Review Notes
Local `talosctl` was not installed in the workspace, so CLI validation was performed against the official Talos CLI documentation rather than local `--help` output.
