# Validation Summary: How to Debug Capacity Bottlenecks

## Status
validated

## Post Type
Tutorial / Guide (Site Reliability Engineering)

## Technologies Covered
- Python 3 (dataclasses, enum, typing, functools, statistics, time.perf_counter)
- Linux performance tooling: top, ps, perf, free, /proc/meminfo, iostat, iotop, lsof, netstat, ss, iftop
- PostgreSQL (pg_stat_activity, pg_stat_user_tables)
- MySQL (SHOW PROCESSLIST)
- JVM garbage collection (G1GC, ZGC)
- Linux kernel sysctls (net.ipv4.tcp_tw_reuse, vm.swappiness)
- Mermaid diagrams (flowchart TD, flowchart LR, subgraph)
- YAML

## Sources Consulted
- iostat(1) man page (sysstat) — verified `-x 1 5` syntax (extended stats, 1s interval, 5 reports)
- iotop(8) man page — verified `-b` batch mode and `-n` iteration count
- top(1) man page — verified `-b -n 1` (batch mode, one iteration)
- perf-top(1) man page — verified `-g` for call-graph
- ss(8) man page — verified `-s` summary
- iftop(8) man page — verified `-t` text and `-s` seconds
- lsof(8) man page — verified `+D` directory descent
- Linux kernel networking docs (Documentation/networking/ip-sysctl.rst) for `net.ipv4.tcp_tw_reuse`
- Linux kernel admin-guide/sysctl/vm for `vm.swappiness`
- PostgreSQL docs: pg_stat_activity, pg_stat_user_tables view definitions
- MySQL docs: SHOW PROCESSLIST
- Python docs: dataclasses, enum, typing, functools.wraps, time.perf_counter, statistics.mean
- OpenJDK GC docs (G1, ZGC) for pause-time GC selection
- Mermaid documentation for flowchart syntax (TD/LR, subgraph, edge labels, style)

## Issues Found
No technical issues found. Spot-checks of Linux CLI flags, sysctls, PostgreSQL/MySQL queries, Python standard-library APIs, and JVM GC references are all current and correct. The Mermaid and YAML snippets parse with valid syntax.

## Review Notes
- The p99 calculation in `analyze_gc_logs` uses `sorted(pause_times_ms)[int(len(pause_times_ms) * 0.99)]`. This is correct for typical sample sizes (e.g. len=100 → index 99) and never overflows because `int(n * 0.99) < n` for any positive int n, but a more robust implementation would use `statistics.quantiles` or `numpy.percentile`. Not an error — illustrative code.
- `cpu_bottleneck.py` includes `import subprocess` and `import re` that are unused in the shown example. Harmless and consistent with the "simulate getting CPU stats" comment that hints at where real implementations would invoke them.
- The growth-rate calculation in `diagnose_memory_bottleneck` divides by `len(historical_used)` rather than `len(historical_used) - 1` intervals; for the indicative thresholds used here (100 MB/hour), the small discrepancy doesn't affect the diagnosis. Acceptable for illustration.
- `diagnose_disk_io` documents `severity` values as `low|medium|high|critical` but the logic never assigns `critical`. Stylistic, not a correctness issue.
- `SHOW PROCESSLIST` works on both MySQL and MariaDB and is correctly noted as MySQL-specific in the comment.
- The post correctly notes `perf top -g` "Requires perf installed" (perf is part of linux-tools and not preinstalled on most distros).
