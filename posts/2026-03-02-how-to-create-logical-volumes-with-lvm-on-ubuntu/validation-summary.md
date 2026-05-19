# Validation Summary: How to Create Logical Volumes with LVM on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Linux LVM
- Physical Volumes
- Volume Groups
- Logical Volumes
- ext4
- XFS
- /etc/fstab
- fdisk

## Sources Consulted
- pvcreate(8), Linux manual page: https://man7.org/linux/man-pages/man8/pvcreate.8.html
- vgcreate(8), Linux manual page: https://man7.org/linux/man-pages/man8/vgcreate.8.html
- lvcreate(8), Linux manual page: https://man7.org/linux/man-pages/man8/lvcreate.8.html
- fdisk(8), Linux manual page: https://man7.org/linux/man-pages/man8/fdisk.8.html
- fstab(5), Linux manual page: https://man7.org/linux/man-pages/man5/fstab.5.html
- systemd-fstab-generator(8), Linux manual page: https://man7.org/linux/man-pages/man8/systemd-fstab-generator.8.html
- Local Ubuntu man pages for fdisk(8), fstab(5), and systemd-fstab-generator(8)

## Issues Found
- The whole-disk option in Step 1 ran `pvcreate /dev/sdb`, and Step 2 then ran the same initialization again. Following the post linearly would try to initialize the same device twice. I changed Step 1 to state that no partitioning is needed and to continue with `/dev/sdb` in the next step.
- The post used `pvcreate --physicalextentsize 8m`, but `--physicalextentsize` is a `vgcreate` option, not a `pvcreate` option. I changed the PV section to discuss `--dataalignment` only, then added the custom PE-size example under Volume Group creation using `vgcreate -s 8m`.
- The post described the default PE size as 4MB. LVM size arguments are binary units, and the manual describes size input units as base-two values, so I changed that wording to 4MiB and 8MiB where the PE-size examples are discussed.

## Review Notes
The LVM device paths, `lvcreate` size and extent examples, filesystem creation commands, mount examples, and `/etc/fstab` field structure are technically valid. The fstab example uses LVM device symlinks, which are acceptable for LVM volumes, though UUIDs remain the most generally portable option for broader filesystem configuration.
