# Validation Summary: How to Configure Readahead Settings for Disk Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux block device readahead
- util-linux blockdev, findmnt, lsblk, mountpoint
- systemd udev rules
- Linux sysfs block queue settings
- POSIX posix_fadvise
- fio benchmarking
- vmstat, iostat, /proc/meminfo

## Sources Consulted
- Linux kernel queue sysfs documentation: https://www.kernel.org/doc/html/v5.15/block/queue-sysfs.html
- util-linux blockdev help output and blockdev(8): https://www.man7.org/linux/man-pages/man8/blockdev.8.html
- systemd udev rule documentation: https://www.freedesktop.org/software/systemd/man/udev.html
- fio official documentation: https://fio.readthedocs.io/en/master/fio_doc.html
- POSIX/Linux posix_fadvise documentation: https://www.man7.org/linux/man-pages/man2/posix_fadvise.2.html
- POSIX fcntl.h documentation: https://www.man7.org/linux/man-pages/man0/fcntl.h.0p.html
- Linux kernel ext4 mount option documentation: https://www.kernel.org/doc/html/latest/admin-guide/ext4.html
- Linux kernel XFS documentation: https://docs.kernel.org/admin-guide/xfs.html
- Local command help/man output for blockdev, udevadm, findmnt, and lsblk.

## Issues Found
- The introduction described readahead as eliminating a disk seek. This is only literally true for rotational media, so it now says readahead reduces read latency and avoids extra seeks on rotational disks.
- The database guidance claimed several database systems all benefit from disabled readahead and that every 4K random read causes extra readahead. This was too absolute, so it now says reduced readahead may help random database data volumes and that aggressive readahead can cause unused reads.
- The mountpoint helper only handled partition-backed mounts reliably. It now falls back to the mounted device's own kernel name when `PKNAME` is empty.
- The filesystem-level section incorrectly suggested `fsconfig`, ext4 `max_batch_time` / `min_batch_time`, and XFS `largeio` / `swalloc` as generic readahead controls. It now documents the actual `read_ahead_kb` sysfs setting and notes that `blockdev --setfra` maps to `--setra` on modern kernels.
- The C `posix_fadvise` example used `close()` without including `<unistd.h>`. The missing header was added and the snippet compiles with `gcc -Wall -Werror`.
- The fio benchmark used `--direct=1`, which bypasses the buffered page-cache path where block-device readahead matters. It now uses buffered reads with `--direct=0` and adds `--readonly` for safety.
- The fio terse parsing for sequential bandwidth used field `$6`, which is total read KiB in terse v3. It now uses field `$7`, the read bandwidth in KiB/s.
- The monitoring section installed `linux-tools-$(uname -r)` but used `iostat`, which is provided by `sysstat`. The package command now installs `sysstat`.
- The `Inactive(file)` explanation implied it directly proves wasted readahead. It now states that it is reclaimable file cache and only suggests over-aggressive readahead when correlated with increased disk reads and no throughput improvement.

## Review Notes
The examples use generic device names such as `/dev/sda`, `/dev/sdb`, and `/dev/nvme0n1`; readers still need to substitute the correct devices for their systems. The fio examples are read-only, but benchmarking raw block devices should still be performed carefully on non-production systems or known-safe devices.
