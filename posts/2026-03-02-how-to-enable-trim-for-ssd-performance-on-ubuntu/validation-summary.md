# Validation Summary: How to Enable TRIM for SSD Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu
- Linux block discard / TRIM
- util-linux `fstrim`
- systemd timers
- ATA/SATA SSDs and NVMe SSDs
- `lsblk`, `hdparm`, and `nvme-cli`
- `/etc/fstab` discard mount option
- LVM and LVM thin pools
- LUKS / dm-crypt
- ext4, XFS, and Btrfs

## Sources Consulted
- util-linux `fstrim(8)` manual: https://man7.org/linux/man-pages/man8/fstrim.8.html
- util-linux `lsblk(8)` manual: https://man7.org/linux/man-pages/man8/lsblk.8.html
- Linux `mount(8)` manual: https://man7.org/linux/man-pages/man8/mount.8.html
- systemd `systemd.timer(5)` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
- systemd `crypttab(5)` manual: https://www.freedesktop.org/software/systemd/man/latest/crypttab.html
- Ubuntu `nvme-id-ctrl(1)` manual: https://manpages.ubuntu.com/manpages/resolute/man1/nvme-id-ctrl.1.html
- Ubuntu `lvm.conf(5)` manual: https://manpages.ubuntu.com/manpages/noble/man5/lvm.conf.5.html
- Ubuntu `lvmthin(7)` manual: https://manpages.ubuntu.com/manpages/noble/man7/lvmthin.7.html
- Btrfs trim/discard documentation: https://btrfs.readthedocs.io/en/latest/Trim.html
- Red Hat discard guidance for Linux filesystems and logical devices: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_file_systems/discarding-unused-blocks
- Red Hat LVM configuration reference for `issue_discards`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/logical_volume_manager_administration/lvmconf_file

## Issues Found
- The NVMe section incorrectly stated that NVMe drives always support TRIM. Changed it to verify Dataset Management/Deallocate support with `nvme id-ctrl -H`, because NVMe discard capability is advertised by the controller rather than something to assume unconditionally.
- The systemd timer override only added `OnCalendar=daily`. Added a blank `OnCalendar=` first so the existing weekly calendar entry is reset instead of combined with the new schedule.
- The continuous discard example attempted to mount `/dev/sda3` directly on `/`, which is not the correct command for an already-mounted root filesystem. Changed it to `mount -o remount,discard /`.
- The LVM section incorrectly implied that `issue_discards = 1` is required for filesystem `fstrim` passthrough. Replaced it with discard capability checks for the block stack, an LVM thin-pool discard check, and clarified that `issue_discards` applies to LVM operations such as `lvremove` and `lvreduce`.
- The verification section implied that SMART/NVMe health commands can prove that TRIM commands were received. Replaced this with `fstrim` output and `lsblk` discard capability checks, and noted that consumer SSDs usually do not expose a simple per-TRIM receipt counter.
- The Btrfs section described `btrfs filesystem defragment -r -c` as a "defrag+discard" command. Removed that command and replaced it with a note that Btrfs supports asynchronous discard through the `discard=async` mount option.

## Review Notes
The guide is technically relevant and accurate after the corrections. The remaining guidance is general-purpose; exact defaults can vary by Ubuntu release, installed packages, filesystem, and storage stack, so administrators should still verify the local timer and discard capabilities on the target system.
