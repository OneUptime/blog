# Validation Summary: How to Use perf for CPU Performance Profiling on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux `perf` (linux-tools)
- Linux kernel performance counters / tracepoints
- `/proc/sys/kernel/perf_event_paranoid`
- Brendan Gregg's FlameGraph toolchain (`stackcollapse-perf.pl`, `flamegraph.pl`)
- Ubuntu package management (`apt`, `ddebs.ubuntu.com` debug symbol repo)
- `perf` subcommands: `record`, `report`, `stat`, `list`, `top`, `trace`, `script`, `archive`, `inject`, `annotate`

## Sources Consulted
- Linux kernel documentation for `perf_event_paranoid` (Documentation/admin-guide/sysctl/kernel.rst)
- `perf-record(1)`, `perf-report(1)`, `perf-stat(1)`, `perf-top(1)`, `perf-trace(1)`, `perf-archive(1)`, `perf-inject(1)`, `perf-annotate(1)` man pages
- Ubuntu package archive (linux-tools-*, ubuntu-dbgsym-keyring, libc6-dbgsym, linux-image-*-dbgsym)
- Ubuntu Debug Symbol Packages wiki (https://wiki.ubuntu.com/Debug%20Symbol%20Packages) for the ddebs repository setup
- Brendan Gregg's FlameGraph GitHub repository (https://github.com/brendangregg/FlameGraph) and his perf examples site

## Issues Found
1. **Inaccurate `perf_event_paranoid` range description.** The post claimed "0=most permissive, 4=most restrictive". In reality `-1` is the most permissive value (not `0`), the upstream kernel only defines values up to `2`, and `3`/`4` are Ubuntu/Debian-patched extensions. Updated the comment to: `-1=most permissive; 2 is upstream max, Ubuntu adds 3 and 4`.
2. **`perf report --call-graph --stdio` is ambiguous.** The `--call-graph` long option takes a `<print_type,...>` argument and may not work bare on all perf versions. Changed to the idiomatic `perf report -g --stdio | head -100`.
3. **`perf trace -s -p 1234 sleep 10` is contradictory.** `-p PID` attaches to an existing process; supplying a `sleep 10` workload at the same time is invalid. Removed the trailing `sleep 10` so the example reads `sudo perf trace -s -p 1234`.
4. **`perf top -F 1000` does not "increase" sampling frequency.** Modern perf top defaults to 4000 Hz, so 1000 Hz is actually below the default. Changed to `-F 9999` and updated the comment to "Increase sampling frequency above the default (higher overhead)".

## Review Notes
- Package names (`linux-tools-$(uname -r)`, `linux-tools-common`, `linux-tools-generic`, `ubuntu-dbgsym-keyring`, `libc6-dbgsym`, `linux-image-$(uname -r)-dbgsym`) are all valid on current Ubuntu releases.
- The FlameGraph workflow (`perf record -F 99 -g`, `perf script | stackcollapse-perf.pl | flamegraph.pl`) is standard and correct.
- `perf archive`, `perf inject --build-id`, and `perf annotate --stdio` flags verified against the man pages.
- The `perf trace` examples will only work with `perf_event_paranoid <= 1` (or with `sudo`) and require the `libtraceevent` userspace bits in newer Ubuntu builds; the post implicitly assumes the user already lowered the paranoid level, which is fine since that was covered earlier.
- The hardware-event thresholds quoted (cache miss > 5–10%, branch mispredict > 2–5%) are heuristics, not absolute rules; workload-dependent, but reasonable rules of thumb.
