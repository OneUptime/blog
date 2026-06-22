# Validation Summary: How to Configure swap Space in Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux swap files and swap partitions
- util-linux tools: swapon, swapoff, mkswap, fstab
- GNU Parted and fdisk partitioning workflows
- Linux VM sysctl tuning: swappiness, vfs_cache_pressure, min_free_kbytes, drop_caches
- SSD TRIM/discard for swap
- dm-crypt / LUKS encrypted swap
- zswap and zram compressed swap
- Btrfs swap-file requirements

## Sources Consulted
- util-linux swapon(8): https://man7.org/linux/man-pages/man8/swapon.8.html
- util-linux mkswap(8): https://man7.org/linux/man-pages/man8/mkswap.8.html
- fstab(5): https://man7.org/linux/man-pages/man5/fstab.5.html
- Linux proc_sys_vm(5): https://man7.org/linux/man-pages/man5/proc_sys_vm.5.html
- Linux kernel sysctl VM documentation: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux kernel zswap documentation: https://docs.kernel.org/admin-guide/mm/zswap.html
- Linux kernel zram documentation: https://docs.kernel.org/admin-guide/blockdev/zram.html
- Linux kernel software suspend documentation: https://docs.kernel.org/power/swsusp.html
- Btrfs swapfile documentation: https://btrfs.readthedocs.io/en/latest/Swapfile.html
- GNU Parted manual page: https://www.gnu.org/software/parted/manual/parted.html

## Issues Found
- The swap-file section suggested using `blkid /swapfile` and a UUID-based fstab entry as a more robust swap-file configuration. Changed the wording to explain that UUID fstab entries are more appropriate for swap partitions, because swap-file UUIDs are not generally visible and usable as identifiers in the same way block-device UUIDs are.
- The post described swap partitions as having slightly better performance than swap files. Updated this to a more accurate reason for using partitions: a dedicated swap area or filesystems that do not reliably support swap files.
- The swappiness range was documented as `0-100`. Updated it to `0-200` and adjusted the examples for modern Linux behavior, including the meaning of values above 100.
- The swappiness value `0` was described as "only swap to avoid OOM." Updated this to "avoid swap until low watermarks," which better matches kernel behavior.
- `vm.min_free_kbytes` was described as "minimum free memory before swapping." Updated it to describe the VM free-memory reserve more accurately.
- The SSD section implied swap-file discard generally may not work directly. Updated this to note that support depends on the filesystem and that periodic `fstrim` handles filesystem-level trimming.
- The troubleshooting section recommended dropping caches as though it forces reclaim before swapping. Updated it to identify `drop_caches` as testing/debugging-only behavior, added `sync`, and clarified that it drops page cache and reclaimable slab objects.
- The Btrfs fallback snippet stopped after creating the file. Added the required `chmod 600`, `mkswap`, and `swapon` steps so the snippet forms a working sequence.
- The emergency cache-dropping command used a root redirection pattern that can fail under `sudo`. Changed it to `echo 3 | sudo tee /proc/sys/vm/drop_caches`.

## Review Notes
The remaining swap-size recommendations are reasonable rules of thumb, but they are workload- and distribution-dependent. Hibernation support also depends on resume configuration, especially `resume=` and `resume_offset=` for swap files.
