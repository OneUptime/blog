# Validation Summary: How to Optimize Memory (vm.swappiness, overcommit) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel VM subsystem (`vm.*` sysctl parameters)
- Ubuntu (sysctl persistence via `/etc/sysctl.d/`)
- `sysctl` CLI
- `vmstat`, `free`, `sar` (sysstat), `smem` monitoring tools
- Redis (BGSAVE / fork memory behavior)
- PostgreSQL / MySQL (database tuning context)

## Sources Consulted
- Linux kernel admin-guide sysctl/vm documentation: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Red Hat solution on swappiness range change (0-100 → 0-200) in kernel 5.8: https://access.redhat.com/solutions/7042476
- Redis administration documentation (vm.overcommit_memory=1 guidance): https://redis.io/docs/latest/operate/oss_and_stack/management/admin/
- vmstat(8) man page (column ordering): https://man7.org/linux/man-pages/man8/vmstat.8.html

## Issues Found
No technical issues found.

Verified specifically:
- `vm.swappiness` range 0–200 (correct for kernel ≥ 5.8 — applies to modern Ubuntu 22.04/24.04).
- Ubuntu default `vm.swappiness=60` is still accurate.
- `vm.overcommit_memory` modes 0/1/2 descriptions are correct; Mode 2 formula `swap + (overcommit_ratio% * RAM)` is a faithful simplification of the kernel's `CommitLimit` definition.
- Default `vm.overcommit_ratio=50` is correct.
- Defaults for `vm.dirty_background_ratio=10`, `vm.dirty_ratio=20`, `vm.dirty_writeback_centisecs=500` (5s) are correct.
- Redis officially recommends `vm.overcommit_memory=1` to prevent BGSAVE fork failures.
- The `vmstat 2 30 | awk 'NR>2 {print $7, $8}'` snippet correctly extracts the `si` and `so` columns (vmstat default layout: r b | swpd free buff cache | si so | ...).
- Lowering `vm.vfs_cache_pressure` from 100 to 50 correctly described as making the kernel retain inode/dentry caches more aggressively.
- All `sysctl`, `tee`, and `sysctl --system` invocations are syntactically correct; the first `tee` (no `-a`) followed by `tee -a` for subsequent appends to the same file is the correct pattern.

## Review Notes
- The 0–200 range for `vm.swappiness` is only valid on kernel 5.8+. Users on very old Ubuntu releases (18.04 with HWE kernels < 5.8, etc.) would still see the historical 0–100 cap. Not worth correcting in-post since Ubuntu LTS releases in active standard support all ship 5.8+ kernels.
- The post could be more explicit that `vm.overcommit_memory=2` interacts with cgroup/container memory accounting in ways that may surprise users running on Kubernetes — but this is an enhancement, not an inaccuracy.
- Minor stylistic nit (not a technical error): the first code block has a blank line between the comment and the `cat` command, which is inconsistent with later blocks. Left as-is per "no stylistic changes" rule.
