# Validation Summary: How to Configure Partitioning and Disk Layout During RHEL Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 installation
- Anaconda storage configuration
- Kickstart partitioning
- LVM physical volumes, volume groups, and logical volumes
- XFS and ext4 filesystems
- Swap
- GRUB2 boot partition requirements

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Interactively installing RHEL from installation media, including Installation Destination, manual partitioning, LVM, boot loader, and recommended partitioning scheme sections: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/
- Red Hat Enterprise Linux 9 documentation: Automatically installing RHEL, Kickstart commands and options reference for `part`, `volgroup`, and `logvol`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/kickstart-commands-and-options-reference_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Managing storage devices, Getting started with swap: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-swap_managing-storage-devices
- Red Hat Enterprise Linux 9 documentation: Managing file systems, Getting started with XFS: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/getting-started-with-xfs_managing-file-systems
- Local `lsblk(8)` manual page for `lsblk -f` behavior and output columns.

## Issues Found
- The swap sizing table understated Red Hat's RHEL 9 installation guidance for systems with 8 GiB to 64 GiB RAM. I changed that row from "At least 4 GB" to "4 GB to 0.5x RAM" and clarified the 64 GB+ row as workload-dependent with at least 4 GB.
- The automatic partitioning section stated that Anaconda creates `/home` unconditionally. Red Hat documents `/home` creation as dependent on available space, so I changed the wording to say `/home` can be created when enough disk space is available.
- The `/boot` outside LVM explanation implied a generic GRUB limitation. Red Hat's documented requirement is that placing `/boot` on LVM is unsupported in the installer, so I corrected the rationale while keeping the recommendation unchanged.
- The XFS/ext4 best-practices section said ext4 should be chosen for "online shrink capability." Red Hat documents ext4 shrink as requiring an unmounted filesystem, so I removed "online."
- The multiple-disk Kickstart example comment claimed "mirrored /boot," but the snippet places `/boot` and `/boot/efi` only on `sda`. I corrected the comment to match the actual snippet.

## Review Notes
The Kickstart examples use valid RHEL 9 commands and filesystem types. The multi-disk example intentionally demonstrates a single volume group across two disks and correctly warns that redundancy should be provided by hardware RAID or Linux software RAID underneath LVM.
