# Validation Summary: How to Set Up and Manage SWAP Space on Ubuntu

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu
- Linux swap files and swap partitions
- util-linux commands: swapon, swapoff, mkswap, fdisk
- /etc/fstab
- Linux virtual memory sysctls: vm.swappiness and vm.vfs_cache_pressure
- GRUB and initramfs hibernation configuration
- zram compressed swap

## Sources Consulted
- Ubuntu Community Help Wiki, SwapFaq: https://help.ubuntu.com/community/SwapFaq
- Linux kernel documentation, /proc/sys/vm sysctl settings: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux kernel documentation, zram block devices: https://docs.kernel.org/admin-guide/blockdev/zram.html
- swapon(8) Linux manual page: https://man7.org/linux/man-pages/man8/swapon.8.html
- mkswap(8) Linux manual page: https://man7.org/linux/man-pages/man8/mkswap.8.html
- Local Ubuntu/Linux man pages for swapon(8), mkswap(8), fdisk(8), fstab(5), and filefrag(8)

## Issues Found
- The post described `fallocate` as the fast swap-file creation method without noting filesystem restrictions. `swapon(8)` documents that preallocated files can be interpreted as files with holes depending on the filesystem, and that `dd` with `/dev/zero` is the most portable method. I updated the wording to note supported filesystems and made `dd` the portable fallback.
- The swappiness section stated the range as 0-100 and described 0 as "only swap to avoid out-of-memory." Current kernel documentation describes swappiness as 0-200 and says values over 100 can be useful for in-memory swap or faster swap devices. I corrected the range and refined the descriptions for 0 and >100.
- The fdisk partition-type instruction used `82 - Linux swap` without context. That code is correct for MBR partition tables but can be misleading on GPT disks. I changed it to select Linux swap, noting that 82 applies to MBR and that fdisk can list valid types.
- The hibernation section only showed `resume=UUID=...`, which is sufficient for a swap partition but incomplete for a swap file. Swap-file resume also requires a filesystem UUID and `resume_offset`. I clarified the partition case and added the minimal swap-file offset commands.
- The troubleshooting note for `swapon failed: Invalid argument` only mentioned an unformatted swap file. The same error can occur when the swap file has holes or unsupported extents. I added a `dd`-based recreation path.

## Review Notes
- The remaining commands and configuration snippets are technically valid for typical Ubuntu systems.
- The swap-size recommendations are general guidance; exact sizing depends on workload, hibernation requirements, kernel compression, and operational tolerance for memory pressure.
