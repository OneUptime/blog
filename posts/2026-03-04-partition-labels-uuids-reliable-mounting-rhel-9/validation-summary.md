# Validation Summary: How to Set Up Partition Labels and UUIDs for Reliable Mounting on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux block devices and persistent naming attributes
- `/etc/fstab`
- UUID, LABEL, PARTUUID, and PARTLABEL identifiers
- XFS, ext4, and swap filesystem labeling tools
- `blkid`, `lsblk`, `mount`, `findmnt`, `parted`, `mkfs.xfs`, `xfs_admin`, `mkfs.ext4`, `e2label`, `tune2fs`, and `mkswap`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Persistent naming attributes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/persistent-naming-attributes_managing-storage-devices
- Red Hat Enterprise Linux 9 documentation: Overview of persistent naming attributes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/assembly_overview-of-persistent-naming-attributes_managing-file-systems
- Red Hat Enterprise Linux 9 documentation: Persistently mounting file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/assembly_persistently-mounting-file-systems_managing-file-systems
- GNU Parted User Manual: https://www.gnu.org/software/parted/manual/parted.html
- Linux man-pages: `xfs_admin(8)`: https://man7.org/linux/man-pages/man8/xfs_admin.8.html
- Local system man pages: `fstab(5)`, `blkid(8)`, `lsblk(8)`, `findmnt(8)`, `e2label(8)`, `tune2fs(8)`, and `mkswap(8)`

## Issues Found
- The post stated that filesystem UUIDs do not change unless the partition is reformatted. Red Hat documentation and filesystem tools support explicitly changing UUIDs, so the sentence was updated to mention explicit changes with filesystem tools.
- The post said labels must be unique across mounted filesystems. Label ambiguity applies to detected filesystems, not only currently mounted filesystems, so the wording was tightened.
- The post suggested `PARTUUID` in `/etc/fstab` is useful when a partition has not yet been formatted. A normal filesystem mount entry still needs a filesystem to mount, so the unformatted-partition wording was removed.
- The post stated that GPT partition names are not usable in fstab. `fstab(5)` supports `PARTLABEL=`, and RHEL documents `/dev/disk/by-partlabel`, so this was corrected to explain that GPT partition names are used with `PARTLABEL=`, not `LABEL=`.

## Review Notes
The remaining command examples and fstab snippets are valid for RHEL 9-style Linux systems. XFS label length and the requirement to unmount before `xfs_admin` changes were confirmed against `xfs_admin(8)`.
