# Validation Summary: How to Choose and Configure Storage During Ubuntu Server Installation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ubuntu Server installer (Subiquity)
- Curtin storage and swap configuration
- LVM
- LUKS encryption
- ext4
- XFS
- Btrfs
- Linux swap and sysctl
- Docker storage layout

## Sources Consulted
- Ubuntu installer documentation: Configuring storage: https://canonical-subiquity.readthedocs-hosted.com/en/latest/howto/configure-storage.html
- Ubuntu installer documentation: Autoinstall storage reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html
- Ubuntu Server documentation: Manage logical volumes: https://ubuntu.com/server/docs/how-to/storage/manage-logical-volumes/
- Curtin documentation: swap configuration: https://curtin.readthedocs.io/en/latest/topics/config.html#swap
- Linux man-pages: lvextend(8): https://www.man7.org/linux/man-pages/man8/lvextend.8.html
- Linux man-pages: xfs_growfs(8): https://man7.org/linux/man-pages/man8/xfs_growfs.8.html
- Linux kernel documentation: Btrfs: https://www.kernel.org/doc/html/v6.15/filesystems/btrfs.html
- Linux kernel documentation: /proc/sys/vm swappiness: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/vm.html
- Docker documentation: OverlayFS storage driver: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Local command help/man pages for `resize2fs`, `swapon`, `mkswap`, `sysctl`, and `tune2fs`.

## Issues Found
- The post said guided LVM uses 100% of the VG by default. Current Subiquity documentation says the `lvm` layout defaults to `sizing-policy: scaled`, which leaves room for snapshots and expansion on many disk sizes. Updated the text to describe the current default and the `all` policy/manual allocation case.
- The default guided partition layout described a 1 MB EFI partition. Current Subiquity documentation says UEFI installs use an EFI System Partition with a minimum size of 538 MiB; 1 MB applies to the legacy BIOS boot partition. Updated the layout description.
- The post implied BIOS systems should use MBR/MS-DOS partition tables. Current Subiquity defaults to GPT except on s390x, with MBR available only when explicitly requested. Updated the partition table guidance.
- The LVM benefits list implied generic thin provisioning. Updated it to clarify that thin provisioning requires LVM thin pools.
- The snapshot backup wording implied fully consistent backups. Updated it to "crash-consistent" because application-consistent database backups require additional quiescing or database backup tooling.
- The swap-file wording was too specific to Ubuntu 24.04 LVM installs. Updated it to align with curtin's documented swap file support and note that users can create a dedicated swap partition or LV.
- The second-disk LVM example mounted `/data` without creating the mount point first. Added `sudo mkdir -p /data`.
- The encryption verification example used `/dev/mapper/dm-0`, which is not a reliable cryptsetup mapping name. Replaced it with `lsblk` followed by `cryptsetup status <crypt-name>`.
- The no-swap warning said the system would kill processes "randomly". Updated it to refer to the Linux OOM killer terminating processes.

## Review Notes
The remaining sizing and filesystem recommendations are workload-dependent guidance rather than strict rules. XFS, Btrfs, swap sizing, and database layout advice are technically reasonable, but production systems should still validate filesystem and swap choices against application vendor recommendations and operational requirements.
