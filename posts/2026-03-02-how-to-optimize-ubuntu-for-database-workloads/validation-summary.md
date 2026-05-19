# Validation Summary: How to Optimize Ubuntu for Database Workloads

## Status
validated

## Post Type
Tutorial / Performance tuning guide

## Technologies Covered
- Ubuntu (22.04 / 24.04 era kernels)
- Linux kernel sysctl / virtual memory tunables
- Transparent Huge Pages (THP) and explicit hugepages
- systemd service units and overrides
- I/O schedulers (none, mq-deadline) via sysfs / udev
- `blockdev` read-ahead and `nr_requests` queue depth
- NUMA (`numactl`)
- XFS and ext4 mount options
- CPU frequency governors (`cpufrequtils`, `intel_pstate`)
- GRUB kernel command-line parameters
- `fio` benchmarking
- PostgreSQL and MySQL/MariaDB ulimits

## Sources Consulted
- Linux kernel admin docs - VM sysctl reference: https://docs.kernel.org/admin-guide/sysctl/vm.html
- PostgreSQL Kernel Resources (overcommit, shared memory): https://www.postgresql.org/docs/current/kernel-resources.html
- PostgreSQL server start / packaging on Debian/Ubuntu: https://www.postgresql.org/docs/current/server-start.html
- XFS upstream patch deprecating/removing `barrier`/`nobarrier` (kernel 4.10 deprecation, 4.19 removal)
- `blockdev(8)` man page: https://www.man7.org/linux/man-pages/man8/blockdev.8.html
- `systemd-rc-local-generator(8)` on Ubuntu: https://manpages.ubuntu.com/manpages/jammy/man8/systemd-rc-local-generator.8.html
- MongoDB Production Notes - swappiness recommendation
- Percona / community PostgreSQL kernel tuning guidance

## Issues Found

1. **Incorrect description of `vm.vfs_cache_pressure`.** The original comment read "How often kswapd reclaims memory (centiseconds)". This is wrong - that phrasing fits `vm.dirty_writeback_centisecs`, not `vfs_cache_pressure`. Per the kernel docs, `vfs_cache_pressure` is "a percentage value [that] controls the tendency of the kernel to reclaim the memory which is used for caching of directory and inode objects." Rewrote the comment to describe dentry/inode cache reclaim and the rationale for using `50` on a database host.

2. **Missing `sudo` on `blockdev --setra`.** `blockdev` opens root-owned block device nodes and will fail with "Permission denied" for a non-root user. Added `sudo` to the active command and to the commented-out variant.

3. **XFS `nobarrier` mount option no longer valid.** The original `fstab` example used `nobarrier` for XFS. The option was deprecated in kernel 4.10 and removed in 4.19; Ubuntu 22.04 ships 5.15 and 24.04 ships 6.8, so XFS will refuse/ignore it. Removed `nobarrier` from the XFS example and `barrier=0` from the ext4 example, and rewrote the trailing note to explain the deprecation/removal and to point readers at disabling the drive's volatile write cache when they truly have BBU-backed storage.

4. **`/etc/rc.local` on modern Ubuntu.** The post created `/etc/rc.local` and `chmod +x`'d it but did not note that modern Ubuntu does not ship the file; `rc-local.service` is only auto-pulled by `systemd-rc-local-generator` when the file exists and is executable. The original commands actually satisfy that requirement (file is created and chmod'd), so the snippet works - I clarified the comment so readers understand why the `chmod +x` step is load-bearing, and softened the misleading "Disable CPU frequency scaling" header (the snippet sets `energy_perf_bias`, it does not disable frequency scaling).

## Review Notes
- `kernel.shmmax` / `kernel.shmall` are largely vestigial for PostgreSQL 9.3+, which uses POSIX shared memory by default; the values shown still match (16 GiB), but most readers will not need to set them. Worth a follow-up comment in a future revision.
- `vm.overcommit_memory = 2` is described as a strict PostgreSQL recommendation. The PostgreSQL docs actually present it as one of two options (the other being per-process `oom_score_adj`); the current wording is acceptable but slightly stronger than the upstream stance.
- The systemd unit example uses `ExecStart=/usr/lib/postgresql/16/bin/postgres ...`. On Debian/Ubuntu the shipped unit is a wrapper that calls `pg_ctlcluster`; the more idiomatic override is to set `Environment=PG_OOM_ADJUST_FILE=...` or wrap `pg_ctlcluster`, not to replace the postgres invocation directly. The shown approach still works if the operator wants tight control, but readers should know it bypasses the cluster manager.
- `echo 1024 > /sys/block/nvme0n1/queue/nr_requests` may be silently clamped by the driver; not an error, just a caveat.
- The `disable-thp.service` uses `After=network.target`, but THP should be disabled before the database starts. Since the database services typically depend on `multi-user.target` (which `disable-thp.service` is `WantedBy=`), ordering is usually fine in practice; a `Before=postgresql.service` would be tighter.
