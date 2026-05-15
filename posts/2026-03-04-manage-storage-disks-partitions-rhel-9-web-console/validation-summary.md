# Validation Summary: How to Manage Storage Disks and Partitions Using the RHEL Web Console

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL web console / Cockpit
- cockpit-storaged / storaged
- Linux block devices and partitions
- XFS and ext4 filesystems
- `/etc/fstab` mount configuration
- LVM logical volumes
- LUKS encryption
- SMART disk health checks
- GNU parted, lsblk, fdisk, mount, mkfs, resize2fs, xfs_growfs, cryptsetup, smartctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing partitions using the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/managing-partitions-using-the-web-console_managing-file-systems
- Red Hat Enterprise Linux 9 documentation: Encrypting block devices using LUKS: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/encrypting-block-devices-using-luks_security-hardening
- Red Hat Enterprise Linux 9 documentation: Increasing the size of an XFS file system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/increasing-the-size-of-an-xfs-file-system_managing-file-systems
- Red Hat Enterprise Linux 9 documentation: Managing file systems / resizing ext4: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes / resizing logical volumes in the web console: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL / LVM-VDO web console operations: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel
- Cockpit Project documentation: storaged: https://cockpit-project.org/guide/latest/feature-storaged.html
- Local command help output for `parted --help` and `resize2fs`

## Issues Found
- The partition creation UI fields were described as having both a partition type and a filesystem field. RHEL 9 documentation describes the relevant creation choice as the filesystem type. Updated the bullet list accordingly.
- The post said clicking "Create partition" always handles partitioning, formatting, and mounting in one step. RHEL 9 documentation distinguishes "Create and mount" from "Create only." Updated the wording to reflect both choices.
- The formatting section said "Supported filesystems in Cockpit" before listing a short set of examples. Changed this to "Common filesystem choices in Cockpit" to avoid presenting the list as exhaustive.
- The resizing section claimed Cockpit supports resizing partitions and their filesystems through a "Resize" option. RHEL 9 documentation specifically documents "Grow" and "Shrink" for logical volumes containing resizable filesystems. Updated the section title and wording.
- The LUKS section said Cockpit prompts for the passphrase on boot. Cockpit configures encryption through the UI, but boot-time unlocking is handled by the system's LUKS configuration. Updated the wording to avoid implying Cockpit itself performs the boot prompt.

## Review Notes
The command examples are broadly correct as illustrative CLI equivalents. The `/etc/fstab` example uses a device path, which works but is less robust than using a UUID on systems where device names can change.
