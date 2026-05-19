# Validation Summary: How to Monitor Memory Usage and Troubleshoot OOM Kills on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel OOM killer
- `/proc` filesystem (`/proc/meminfo`, `/proc/[pid]/oom_score`, `/proc/[pid]/oom_score_adj`, `/proc/slabinfo`, `/proc/buddyinfo`)
- `free`, `vmstat`, `sar`, `ps`, `watch`
- `dmesg` and `journalctl`
- systemd unit directives (`OOMScoreAdjust`, `MemoryMax`, `MemoryHigh`)
- Kernel sysctls (`vm.overcommit_memory`, `vm.overcommit_ratio`, `vm.swappiness`)
- `swapon`, `fallocate`, `mkswap`, `/etc/fstab`
- `slabtop`

## Sources Consulted
- Linux kernel documentation: https://www.kernel.org/doc/Documentation/sysctl/vm.txt
- Linux kernel mm/oom_kill.c source (message format)
- proc(5) man page: https://man7.org/linux/man-pages/man5/proc.5.html
- systemd.resource-control(5): https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html
- systemd.exec(5) (for OOMScoreAdjust): https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- journalctl(1) man page (verified `-g/--grep` flag and `--output verbose`)
- vmstat(8), sar(1), ps(1), free(1) man pages
- Documentation/admin-guide/mm/overcommit-accounting.rst (overcommit modes)

## Issues Found
1. **Outdated OOM kill message example.** The example showed the legacy two-line format including "Kill process 12345 (java) score 823 or sacrifice child", which corresponds to pre-4.x kernels. Modern Ubuntu kernels (4.x and later) emit a single consolidated line via `pr_err` in `mm/oom_kill.c`. Replaced the example with a representative single-line modern format that includes `total-vm`, `anon-rss`, `file-rss`, `shmem-rss`, `UID`, `pgtables`, and `oom_score_adj` fields.
2. **Inaccurate framing of `vm.overcommit_memory=2`.** The original text said this is used when "you want the system to hang rather than kill processes". This is misleading — under strict overcommit (mode 2), allocations that would exceed the commit limit fail at allocation time (e.g., `malloc` returns NULL with errno=ENOMEM), the system does not hang. Updated the sentence to "you want allocation requests to fail upfront rather than risk having processes killed later", which matches the subsequent explanation paragraph and the kernel documentation.

## Review Notes
- The section heading "Disabling OOM Killer (Rare Cases)" is a slight oversimplification — strict overcommit (`vm.overcommit_memory=2`) doesn't truly disable the OOM killer (it can still be invoked, for example for the global OOM killer when cgroup limits are hit), but it does dramatically reduce OOM kill occurrences by failing allocations early. Left as-is since the body text now correctly describes the actual behavior.
- The `oom_score_adj` range (-1000 to +1000) is correct. The older `oom_adj` interface (-17 to +15) is deprecated and not mentioned, which is appropriate.
- `MemoryMax` and `MemoryHigh` are cgroup v2 directives, which is the default on Ubuntu 22.04+ and 24.04. On older systems still using cgroup v1, systemd translates these where possible.
- `fallocate` for swap files works fine on ext4/xfs but is not supported for swap on btrfs (where `dd` or `chattr +C` + `truncate` workflows are required). The post does not call out filesystem caveats but its example is correct for typical Ubuntu installs (ext4 root).
- `pgrep myapp` inside `$(...)` for `watch` is captured once at invocation time rather than on each refresh; this is a minor caveat the reader should be aware of if the monitored process restarts.
- `cat /proc/slabinfo` requires root on modern kernels (`kptr_restrict`/permissions); the example would benefit from a `sudo` prefix, but `slabtop` (which is shown with `sudo`) is the more practical alternative recommended in the post.
- `awk`'s `strftime` is a gawk extension; this works on Ubuntu by default where `awk` is `mawk` linked or replaced with `gawk` via `update-alternatives`. In practice, `gawk` is the typical Ubuntu install path.
