# Validation Summary: How to Understand Talos Linux Disk Partition Layout

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Talos disk management
- Talos boot loaders (`systemd-boot` and GRUB)
- GPT partitioning
- UEFI EFI System Partition
- `talosctl`
- Talos `VolumeConfig`, `UserVolumeConfig`, `VolumeStatus`, and `DiscoveredVolume` resources

## Sources Consulted
- Talos Linux Disk Layout documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos Linux System Volumes documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/system
- Talos Linux User Volumes documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/user
- Talos Linux Disk Encryption documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Talos Linux Boot Loader documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/bare-metal-platforms/bootloader
- Talos Linux `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- UEFI Specification 2.10 GPT Disk Layout: https://uefi.org/specs/UEFI/2.10/05_GUID_Partition_Table_Format.html

## Issues Found
- The post described a six-partition layout as the typical current UEFI layout. Current Talos UEFI installations use `systemd-boot` by default and the documented base layout is `EFI`, `META`, `STATE`, and `EPHEMERAL`; `BIOS` and `BOOT` are GRUB-related or older upgraded layout details. Updated the layout and wording accordingly.
- The EFI partition size was listed as approximately 100 MB. Current Talos documentation shows it as approximately 1 GB. Updated the size and purpose.
- The BIOS partition section said Talos creates it on all systems. Updated it to explain that it applies to GRUB and legacy BIOS-oriented layouts, while current UEFI installs do not rely on it.
- The BOOT partition section treated BOOT as the normal UEFI boot partition and said it uses VFAT. Updated it to explain BOOT is for GRUB-based layouts and uses XFS, while current UEFI boot assets live in EFI as UKIs.
- Several commands used non-current or incorrect resources, including `talosctl get volumes`, `talosctl disks`, and `talosctl get blockdevices`. Replaced them with documented `talosctl get volumestatus`, `talosctl get disks`, and `talosctl get discoveredvolumes` examples.
- The additional disk example used the older `machine.disks` style. Replaced it with a current `UserVolumeConfig` example and adjusted the explanation to match Talos user volume behavior.
- The upgrade section said the new system image is written to BOOT. Updated it to describe boot asset updates in EFI for current UEFI/systemd-boot installs and BOOT for GRUB-based installs.
- The summary stated that all Talos system disks use six partitions. Updated it to distinguish the current core system partitions from GRUB-based BIOS/BOOT layouts.

## Review Notes
The post is now accurate for current Talos v1.12 documentation. Some details, especially bootloader behavior and configuration document types, are version-sensitive and should be rechecked when Talos changes its default boot loader or disk management APIs.
