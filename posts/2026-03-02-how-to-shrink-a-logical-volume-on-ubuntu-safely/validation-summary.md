# Validation Summary: How to Shrink a Logical Volume on Ubuntu Safely

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- LVM (Logical Volume Manager) — lvcreate, lvreduce, lvresize, lvremove, vgchange
- ext4 filesystem (resize2fs, e2fsck)
- XFS (limitation discussion)
- Btrfs (brief mention)
- Ubuntu system administration
- systemd (systemctl)
- Standard Linux utilities: mount/umount, lsof, fuser, du, df, rsync

## Sources Consulted
- LVM manpages: lvreduce(8), lvresize(8), lvcreate(8), vgchange(8) — https://man7.org/linux/man-pages/man8/lvreduce.8.html
- e2fsprogs documentation: resize2fs(8), e2fsck(8) — https://man7.org/linux/man-pages/man8/resize2fs.8.html
- fsadm(8) manpage (used by lvreduce -r)
- XFS FAQ and documentation confirming no shrink support — https://xfs.org/index.php/XFS_FAQ
- Btrfs wiki on filesystem resize — https://btrfs.readthedocs.io/en/latest/btrfs-filesystem.html
- Ubuntu Server Guide on LVM

## Issues Found
No technical issues found.

Verifications performed:
- Block math: `26214400 * 4096 = 107,374,182,400 bytes = 100 GiB` — matches the stated 100GB target. `52428800 * 4096 = 214,748,364,800 bytes = 200 GiB` — matches the original LV size shown in the LVM output. The example output is internally consistent.
- `resize2fs` with a `G` suffix uses base-2 units (GiB), matching the calculation shown.
- `lvcreate -L 20G -s -n db_data_snap /dev/data_vg/db_data` is correct snapshot syntax.
- `lvreduce -L 100G` and `lvresize -L -100G` are both correct invocations.
- `lvreduce -r` (which delegates to fsadm) does correctly perform filesystem shrink before LV shrink, and requires the ext4 filesystem to be unmounted (online shrink is not supported by ext4).
- XFS shrink limitation is accurate — XFS supports growth only, no in-place reduction.
- Btrfs supports online shrinking via `btrfs filesystem resize` — accurate.
- The safe order of operations (unmount → fsck → resize2fs → lvreduce → fsck → mount) is the standard, correct sequence and is consistent across the post.
- `vgchange -ay` from a live USB to activate VGs is correct.
- The e2fsck output format matches what e2fsprogs actually produces.

## Review Notes
- The post uses "GB" loosely throughout the prose (e.g., "Shrink filesystem to 100GB") while the LVM tool output correctly uses "GiB". This is a common convention in sysadmin writing and the actual numbers are consistent (100 GiB is what resize2fs and lvreduce produce with `100G`). Not technically wrong, since `100G` to these tools means 100 GiB.
- The fsck version shown (`1.46.5 (30-Dec-2021)`) is the version shipped with Ubuntu 22.04 LTS. On Ubuntu 24.04 LTS the version is `1.47.0 (5-Feb-2023)`. The output format is unchanged so the example remains valid; readers on newer Ubuntu will simply see a different version banner.
- The advice to leave headroom (20% free) is conservative and appropriate for general guidance, though specific workloads (e.g., databases with bloat) may need more.
- For the root filesystem section, the post correctly notes that you cannot shrink the running root LV. A minor nuance not covered: on Ubuntu's default LVM-on-LUKS installs, the user would also need to unlock the encrypted PV from the live environment via `cryptsetup luksOpen` before `vgchange -ay` would see the VG. This is out of scope of the post and not an error.
