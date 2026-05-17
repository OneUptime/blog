# Validation Summary: How to Install Ubuntu Server on NVMe SSD Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server 24.04 LTS
- NVMe SSDs / nvme-cli
- Subiquity installer
- LVM, ext4, XFS
- systemd (`fstrim.timer`)
- udev rules
- Linux block layer (I/O schedulers, sysfs queue tunables)
- fio (benchmarking)

## Sources Consulted
- Linux kernel sysfs-block ABI documentation — https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-block
- Linux kernel queue sysfs files — https://www.kernel.org/doc/Documentation/block/queue-sysfs.rst
- Linux kernel blk-mq documentation — https://docs.kernel.org/block/blk-mq.html
- RHEL 8 — Setting the disk scheduler — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_storage_devices/setting-the-disk-scheduler_managing-storage-devices
- Arch Linux Forums — udev rule for NVMe ioscheduler — https://bbs.archlinux.org/viewtopic.php?id=299481
- Gentoo Wiki — NVMe — https://wiki.gentoo.org/wiki/NVMe
- Western Digital — NVMe Queues Explained — https://blog.westerndigital.com/nvme-queues-explained/
- Ubuntu manpage — `nvme_id_ctrl` — https://manpages.ubuntu.com/manpages/noble/man2/nvme_id_ctrl.2.html
- `mkfs.ext4(8)` man page — https://linux.die.net/man/8/mkfs.ext4
- Samsung 980 Pro datasheet — https://download.semiconductor.samsung.com/resources/data-sheet/Samsung-NVMe-SSD-980-PRO-Data-Sheet_Rev.2.1_230509_10129505081019.pdf

## Issues Found
1. **`read_ahead_kb` unit comment was wrong.** The post described the sysfs file `/sys/block/nvme0n1/queue/read_ahead_kb` as being in "512-byte sectors, so 256 = 128KB". Per the kernel `sysfs-block` ABI, this file is unambiguously in **kilobytes**, so `256` means `256 KB`, not `128 KB`. Replaced the comment with "value is in kilobytes; default is typically 128 KB".
2. **udev rule `KERNEL` pattern was too loose.** The original `KERNEL=="nvme[0-9]*"` also matches the controller character device (e.g. `nvme0`), which has no `queue/scheduler` attribute. Tightened it to `KERNEL=="nvme[0-9]*n[0-9]*"`, which matches NVMe namespace block devices (`nvme0n1`, `nvme1n1`, …) — the standard pattern recommended in the kernel docs and on the Arch wiki.

## Review Notes
- The fio examples use `--filename=/dev/nvme0n1` for read-only tests, which is safe, but readers should be cautious to never adapt these to `--rw=write` / `--rw=randwrite` against a raw device path — that would corrupt data on the drive. The post only shows reads, so it is technically fine.
- `mkfs.ext4 -E lazy_itable_init=0` was kept as written. The comment ("ensures inode table is initialized immediately") is slightly informal but accurate: `=0` disables the lazy/deferred initialization that the kernel would otherwise complete in the background after mount.
- The Gen4 NVMe benchmark thresholds (`>3000 MB/s sequential`, `>500k 4K random IOPS`) are conservative compared to peak vendor specs (often ~7000 MB/s / ~1M IOPS for drives like the Samsung 980 Pro). They work as a "drive is functioning acceptably" baseline rather than a peak-performance target, which matches the post's framing.
- The udev `ATTR{queue/scheduler}="none"` will still work on most modern systems where `none` is already the default for NVMe block devices, so the original rule's main risk was silent no-op on the character device rather than data loss.
- Versions referenced (Ubuntu Server 24.04 LTS) are current as of the validation date (2026-05-17), but readers on Ubuntu Server 26.04 LTS (expected April 2026) should double-check installer/Subiquity wording.
