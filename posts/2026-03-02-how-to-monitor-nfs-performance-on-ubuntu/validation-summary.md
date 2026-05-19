# Validation Summary: How to Monitor NFS Performance on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NFS (Network File System) — client and server, including NFSv4
- nfsstat (from nfs-utils / nfs-common)
- mountstats (from nfs-utils)
- /proc/self/mountstats and /proc/fs/nfsd/ (threads, stats)
- dd, fio (benchmarking)
- ifstat, iftop, ss, netstat, ip -s link (network monitoring)
- iostat (sysstat)
- systemd service unit configuration
- nfs-kernel-server (Ubuntu/Debian) and /etc/default/nfs-kernel-server (RPCNFSDCOUNT)
- NFS mount options (rsize/wsize)

## Sources Consulted
- nfs-utils mountstats source: https://git.linux-nfs.org/?p=steved/nfs-utils.git;a=blob;f=tools/mountstats/mountstats.py
- Ubuntu nfsstat(8) man page: https://manpages.ubuntu.com/manpages/jammy/man8/nfsstat.8.html
- Local verification of `ip -s link show` output format on Linux 6.17
- Linux kernel documentation for /proc/fs/nfsd and NFS mount options
- nfs(5) man page for rsize/wsize mount option semantics
- fio(1) documentation for benchmark flags (--rw, --bs, --numjobs, --time_based, --runtime, --group_reporting)
- iostat(1) documentation for -x extended statistics

## Issues Found

1. **Incorrect nfsstat interval syntax.** The post used `nfsstat -c 2` claiming this would update every 2 seconds. The standard nfs-utils `nfsstat` does not accept an interval as a positional argument. The correct way is `--sleep=SECONDS` (or `-Z`). Fixed to `nfsstat -c --sleep=2` with a corrected comment describing the actual behavior (snapshot, sleep, then show delta).

2. **Non-existent `mountstats --dump` flag.** The post showed `mountstats --dump /tmp/nfs-baseline.stats` to save a baseline. The mountstats tool from nfs-utils has no `--dump` option. The `--since FILE` flag expects a copy of `/proc/self/mountstats`. Fixed by replacing the dump line with `sudo cp /proc/self/mountstats /tmp/nfs-baseline.stats` and reordering so the baseline is captured before being compared against.

3. **Grep pattern that does not match `ip -s link` output.** The post used `grep -A 5 "RX errors\|TX errors"`. The actual output of `ip -s link show` contains lines starting with `RX:` and `TX:` followed by column headers (which include `errors` as a column name) and a row of counters — the literal strings "RX errors" / "TX errors" do not appear. Replaced with `grep -E -A 1 '^[[:space:]]*(RX|TX):'` which correctly highlights the RX/TX counter lines.

## Review Notes
- The example outputs of `nfsstat -c` and `mountstats` are illustrative and simplified compared to actual output (which contains many more operations and additional fields); kept as-is since they clearly convey the structure being explained.
- `RPCNFSDCOUNT` in `/etc/default/nfs-kernel-server` is the correct knob on Ubuntu/Debian for the legacy SysV-style configuration; on newer systems with the systemd unit reading `nfs.conf`, the equivalent is `[nfsd] threads=` in `/etc/nfs.conf`. The post's approach still works on current Ubuntu LTS releases, so no change was made, but readers on bleeding-edge distributions may prefer `nfs.conf`.
- The KPI thresholds in the summary table are reasonable rules-of-thumb but workload-dependent — the post correctly frames them as starting baselines.
- `iftop -i eth0 -f "port 2049"` is correct (2049 is the canonical NFS port); on hosts that no longer use predictable interface names, readers will need to substitute the actual interface (e.g., `enp3s0`).
- The `dd ... oflag=direct` / `iflag=direct` flags correctly bypass the page cache for raw throughput testing, and dropping caches on the server before the read test is the right methodology.
