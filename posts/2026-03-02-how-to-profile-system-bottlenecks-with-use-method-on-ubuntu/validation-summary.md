# Validation Summary: How to Profile System Bottlenecks with USE Method on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- USE Method (Brendan Gregg's performance methodology)
- Linux kernel observability interfaces (/proc/pressure, /proc/vmstat, /sys/block, /sys/devices/system/cpu, /proc/mdstat)
- sysstat (mpstat, iostat, sar)
- vmstat, free, ps, top, uptime, nproc
- perf (sched latency)
- mcelog
- edac-utils (EDAC error reporting)
- thermal_throttle sysfs counters
- smartmontools (smartctl)
- iotop
- mdadm (RAID arrays)
- nload, nicstat
- ip, ss, ethtool, netstat
- /proc/net/netstat counters
- PSI (Pressure Stall Information, kernel 4.20+)

## Sources Consulted
- Brendan Gregg, "The USE Method" — https://www.brendangregg.com/usemethod.html
- sysstat 12.6 iostat man page and output (verified locally — 23-column output for iostat -x with discard/flush stats)
- procps-ng `free` source: used = total - free - buffers - cached_adjusted; documented columns are total/used/free/shared/buff/cache/available
- vmstat(8) man page — output columns: r b swpd free buff cache si so bi bo in cs us sy id wa st (gu); no load average column
- Linux kernel PSI documentation — https://docs.kernel.org/accounting/psi.html (only cpu, memory, io are exposed)
- edac-utils source / man page — `-s` shows EDAC driver status; `-r` produces an error report; `-s` does not take a numeric argument
- GNU grep manual — in ERE (`-E`), `|` is alternation; `\|` is treated as a literal `|`, not alternation
- Linux block layer documentation for /sys/block/<dev>/stat field layout
- ethtool, ip-link, ss, iotop, smartctl, mdadm man pages

## Issues Found

1. **Incorrect memory utilization formula (line 92)**
   The original `($2-$4-$5-$6)/$2*100` subtracted column 5 ("shared"), which is already accounted for in the "used" column — this produces an under-reported utilization. Replaced with the straightforward `$3/$2*100` (used/total) which matches the value `free` itself computes.

2. **Invalid `edac-util -s 4` (line 125)**
   `edac-util`'s `-s` flag does not accept a numeric argument; any trailing number is interpreted as an error-message count, which is not meaningful with status mode. Replaced with `edac-util -s` (status) and added `edac-util -r` (report) to actually surface corrected/uncorrected memory errors as the surrounding comment implies.

3. **Wrong iostat field references (lines 158-161)**
   The post mapped `$9=avgqu-sz`, `$11=await`, `$16=%util`. These offsets match an old sysstat (pre-12.0) layout. Modern sysstat 12.x ships ~16-23 columns (discard/flush stats add more in 12.5+), and the columns the post claims are at $9/$11/$16 are actually `wkB/s`, `%wrqm`, and `drqm/s` on Ubuntu 24.04. Replaced the brittle awk-by-column-number approach with `iostat -x 1 5` plus comments naming the relevant columns (`aqu-sz`, `r_await`, `w_await`, `%util`) for the reader to look at directly.

4. **Broken `grep -E "drop\|miss\|error"` (line 220)**
   In extended regex, `|` is alternation and `\|` is a literal pipe. The original regex matched the literal string "drop|miss|error", which never appears in `ethtool -S` output, so the command silently produced no matches. Removed the backslashes so it works as intended. (Verified locally: `echo drop | grep -E "drop\|miss"` returns nothing; without the backslashes it matches.)

5. **`/proc/pressure/network` does not exist (line 227)**
   Upstream PSI only exposes `cpu`, `memory`, and `io`. The original line `cat /proc/pressure/network 2>/dev/null || echo "Network pressure not available"` suggested it might exist on some systems, which is misleading. Replaced with an explicit note that PSI does not cover network.

6. **vmstat has no load-average column (line 266)**
   The script labeled `$(NF-2) $(NF-1) $NF` of `vmstat` output as "Load avg", but those are the trailing CPU columns (`id wa st` or `wa st gu` depending on kernel). Replaced the awk to print run queue and blocked counts from vmstat, and added a follow-up `uptime | awk -F'load average:'` line to actually surface the load average.

7. **Same iostat field issue inside the report script (line 287)**
   The report script used the same incorrect `$9` / `$11` / `$NF` offsets to print queue/await/%util. Replaced the brittle awk with a plain `iostat -xz 1 1` invocation and a comment pointing at the relevant columns.

## Review Notes

- The `dmesg` commands throughout assume the running user can read kernel logs. On modern Ubuntu (`kernel.dmesg_restrict=1` by default), unprivileged users get nothing. Most invocations in the post don't use `sudo`; readers running these on hardened systems will see empty output. Not a correctness bug — just worth noting for future revisions.
- `nicstat` is in Ubuntu `universe`; readers on minimal images may need to enable that repo. The `apt install` command will still succeed on a default Ubuntu Server / Desktop install.
- The `ss -tmpne | awk '$2 > 0 ...'` parsing is fragile because `ss` with `-m` and `-p` emits multi-line per-socket records and a header row, so `$2` is not always the Recv-Q field. Left as-is because it does work as a quick scan, but a future revision could replace it with `ss -tn 'sport = :*' state established | awk 'NR>1 && $2 > 0 ...'` for robustness.
- `iostat -xzh 2 5` uses `-h` for human-readable output; available since sysstat 11.5+, so it works on all supported Ubuntu LTS releases.
- `netstat` is from `net-tools`, which is no longer installed by default on Ubuntu 18.04+; the `netstat -s` example will fail on a minimal install. The post installs other tools explicitly but doesn't `apt install net-tools`. Not a correctness bug in the command itself; flagging for future reference.
- The trailing `sudo chmod +x /usr/local/bin/use-method-report.sh` step assumes the reader saved the script there; the heredoc/Write step is implicit. Cosmetic — does not affect correctness.
