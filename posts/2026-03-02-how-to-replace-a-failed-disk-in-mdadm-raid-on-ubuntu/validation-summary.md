# Validation Summary: How to Replace a Failed Disk in mdadm RAID on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- mdadm (Linux Software RAID)
- /proc/mdstat and /sys/block kernel interfaces
- sfdisk and sgdisk (partition tools)
- hdparm and smartctl (disk inspection)
- systemd (mdmonitor service)
- update-initramfs
- Ubuntu Linux

## Sources Consulted
- mdadm(8) man page (https://man7.org/linux/man-pages/man8/mdadm.8.html)
- mdstat(5) man page / kernel documentation on /proc/mdstat (https://raid.wiki.kernel.org/index.php/Mdstat)
- sgdisk(8) man page (https://www.man7.org/linux/man-pages/man8/sgdisk.8.html)
- sfdisk(8) man page (https://man7.org/linux/man-pages/man8/sfdisk.8.html)
- smartmontools documentation (https://www.smartmontools.org/)
- Linux RAID wiki (https://raid.wiki.kernel.org/)
- Ubuntu mdadm package documentation (provides mdmonitor.service)
- Kernel md driver documentation on /proc/sys/dev/raid/speed_limit_min and speed_limit_max
- Kernel documentation on /sys/block/mdX/md/sync_action and mismatch_cnt

## Issues Found
1. **Duplicated and malformed mdadm --detail output**: The example output contained a duplicated `Raid Level : 5` line and a misaligned `Chunk Size : 512K` line, while omitting the standard `Update Time`, `State`, `Active Devices`, `Working Devices`, `Failed Devices`, `Spare Devices`, and `Layout` fields that mdadm always emits. Replaced with a more realistic block that includes those fields in the correct positions and removes the duplicate Raid Level.
2. **Inconsistent mdstat bitmap during rebuild**: The example showed `[UUU_]` (slot 3 down) while the preceding `--detail` example showed the removed disk at RaidDevice slot 2. Changed to `[UU_U]` and updated the explanatory sentence so the bitmap matches the slot that the example shows as being rebuilt.
3. **Non-standard `Number` for removed device**: Changed the `Number` column for the removed entry from `4` to `-`, matching how mdadm renders a removed slot after `--remove`.

## Review Notes
- The mdadm command syntax (`--manage`, `--fail`, `--remove`, `--add`, `--detail`, `--monitor --test --oneshot`) is correct and current as of recent mdadm releases on Ubuntu.
- `sgdisk -R <dest> <source>` semantics (operating on source, replicating to the device named after `-R`) and `sgdisk -G` for GUID randomization are correct.
- `sfdisk -d /dev/sda | sfdisk /dev/sdc` is the standard recipe for cloning an MBR partition table.
- The `mdmonitor.service` name is correct for Debian/Ubuntu's mdadm package.
- `/proc/sys/dev/raid/speed_limit_min` and `speed_limit_max`, `/sys/block/md0/md/sync_action`, and `/sys/block/md0/md/mismatch_cnt` are all valid kernel interfaces.
- The MBR partition type `fd` (Linux raid autodetect) referenced in passing is deprecated by the kernel for auto-assembly, but it is still a valid type ID and the post's wording ("or similar") allows for GPT type GUIDs used on modern systems, so no change was needed.
- The text correctly notes that arrays remain readable/writable during a RAID-5 rebuild and that a second failure during rebuild causes data loss, both of which match how the md driver behaves.
