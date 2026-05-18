# Validation Summary: How to Understand I/O Schedulers on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux block layer (blk-mq) and I/O schedulers (none, mq-deadline, BFQ, Kyber)
- Ubuntu 22.04+ kernel (5.15+)
- sysfs block-device tunables (`/sys/block/<dev>/queue/`)
- udev rules for persistent scheduler configuration
- `lsblk`, `blockdev`, `iostat`, `iotop`, `fio` userspace tools
- cgroup-based I/O weights (BFQ)
- Pressure Stall Information (`/proc/pressure/io`)

## Sources Consulted
- Linux kernel docs — block layer: https://docs.kernel.org/block/
- BFQ scheduler docs: https://docs.kernel.org/block/bfq-iosched.html
- Kyber scheduler docs: https://docs.kernel.org/block/kyber-iosched.html
- mq-deadline source (`block/mq-deadline.c`) for default tunable values
- Kernel parameters: https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html
- PSI docs: https://docs.kernel.org/accounting/psi.html
- `blockdev(8)`: https://www.man7.org/linux/man-pages/man8/blockdev.8.html
- `lsblk(8)`: https://man7.org/linux/man-pages/man8/lsblk.8.html
- `iotop(8)` (Ubuntu jammy): https://manpages.ubuntu.com/manpages/jammy/man8/iotop-c.8.html
- Red Hat KB on `elevator=` removal in RHEL 8 (corresponds to kernel ≥ 4.18 / blk-mq-only)
- Debian Bug #914758 — `elevator=` no longer honored
- openSUSE `udev-extra-rules` 60-io-scheduler.rules (canonical udev pattern)

## Issues Found

1. **`elevator=` kernel parameter section was outdated/incorrect.** The post recommended adding `elevator=bfq` to `GRUB_CMDLINE_LINUX_DEFAULT`. This parameter was tied to the legacy single-queue block layer, which was removed in Linux 5.0. On Ubuntu 22.04+ (which ships kernel 5.15+, blk-mq only), the parameter is ignored. **Fix:** Replaced the "Setting Default via Kernel Command Line" section with a "Note on the `elevator=` Kernel Parameter" that explains it is deprecated/ignored on modern kernels and directs readers to the udev rules approach already documented above.

2. **BFQ `low_latency` example was misleading.** The post showed `echo 1 | sudo tee .../low_latency`, but per the BFQ kernel docs the default is already 1 (low-latency mode enabled). Writing 1 is a no-op on stock kernels. **Fix:** Added a comment noting it is enabled by default, and changed the example `echo` to `0` (which actually changes behavior — disabling low-latency mode in favor of throughput) so the example does something meaningful.

## Review Notes
- All scheduler-default values (mq-deadline `read_expire=500ms`, `write_expire=5000ms`; Kyber `read_lat_nsec=2,000,000`, `write_lat_nsec=10,000,000`; `read_ahead_kb=128`) were verified against the kernel source and documentation and are correct.
- The udev `ATTR{queue/scheduler}="..."` syntax is the canonical pattern (matches openSUSE's shipped rules) and is correct.
- `lsblk -o NAME,SCHED` uses a valid documented column.
- `iotop -bod 5` correctly bundles `-b -o -d 5` per getopt short-option rules.
- `blockdev --setra` units are 512-byte sectors regardless of the device's logical block size; the example (`4096 * 512 = 2MB`) is right.
- The "Check if blk-mq is in use" comment on `cat /sys/block/sda/queue/nr_requests` is slightly misleading (that file exists regardless), but `ls /sys/block/sda/mq/` shown later in the post is the correct check; left as-is since the post does present the better check elsewhere.
- BFQ cgroup weight range "1–1000, default 100" is accurate for both cgroup v1 `blkio.bfq.weight` and cgroup v2 `io.bfq.weight`. Note that the generic cgroup v2 `io.weight` (not BFQ-specific) uses 1–10000, but the post is specifically describing BFQ's weights, so the range is correct.
- `iotop` is not installed by default on Ubuntu; readers may need `sudo apt install iotop`.
