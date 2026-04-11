# Validation Summary: How to Profile Redis at the Kernel Level

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (server internals: `dictFind`, `lookupKeyRead`, `activeExpireCycle`, `zmalloc`, `raxSeek`)
- Linux `perf` (CPU profiling, flamegraphs, `perf mem`, `perf top`)
- `strace` (syscall tracing)
- `bpftrace` / eBPF (dynamic tracing with tracepoints and uprobes)
- FlameGraph tools (Brendan Gregg's stackcollapse-perf.pl / flamegraph.pl)
- `numastat` / `numactl` (NUMA topology analysis and pinning)
- `vmstat` / `pidstat` (context switch monitoring)
- systemd (service override for NUMA binding)

## Sources Consulted
- strace man page (`man strace`) — `-p`, `-c`, `-T` flag semantics and mutual exclusivity with command arguments
- perf documentation — `perf record`, `perf top`, `perf mem` flag behavior, `-- sleep N` as workload duration limiter
- bpftrace reference guide — tracepoint, uprobe, `hist()`, `nsecs`, `tid`, `pid`, `ustack` builtins
- Redis source code (known function names: `dictFind`, `lookupKeyRead`, `activeExpireCycle`, `zmalloc`, `raxSeek`)
- numactl man page — `--cpunodebind`, `--membind` flags
- systemd documentation — `ExecStart=` override pattern in drop-in files

## Issues Found
1. **Incorrect strace duration-limiting pattern** (line 75): The original command `sudo strace -p $(pgrep -x redis-server) -c -T -- sleep 10` used `-- sleep 10` to limit tracing duration. This pattern works with `perf record` (which treats the command as a workload duration limiter), but NOT with `strace -p`. With strace, `-p PID` attaches to an existing process, and `-- sleep 10` would be treated as an additional process to trace, not a timer. Strace would continue tracing redis-server indefinitely after sleep exits. **Fixed** by replacing with `sudo timeout 10 strace -p $(pgrep -x redis-server) -c`, which correctly limits the tracing window using the `timeout` command.

2. **Misleading `-T` flag description with `-c`** (line 78): The original text claimed "The `-T` flag shows time spent in each call." While `-T` does annotate individual syscall output lines with wall-clock time, the `-c` flag suppresses all individual syscall output and only shows the summary table. Therefore `-T` has no visible effect when combined with `-c`. The `-c` summary table already includes its own time accounting (the `% time` and `seconds` columns) independent of `-T`. **Fixed** by removing `-T` from the command and updating the description to explain the `timeout` command instead.

## Review Notes
- The `perf top -K` flag on line 65 hides kernel symbols. While this is technically valid and appropriate for identifying Redis userspace hotspots, readers interested in kernel-level overhead (the stated goal of the post) may want to omit `-K` to also see kernel functions. This is a judgment call, not an error.
- The bpftrace scripts use shell string concatenation to inject the PID (`'...pid == '$(pgrep -x redis-server)'/ ...'`). This works correctly but will fail silently if multiple redis-server processes are running (pgrep returns multiple PIDs). A note about this would be helpful but is not a technical error.
- The systemd override pattern (`ExecStart=` empty line to clear default, then new `ExecStart=`) is correct and follows systemd best practices for drop-in overrides.
- All referenced Redis internal functions (`dictFind`, `lookupKeyRead`, `activeExpireCycle`, `zmalloc`, `raxSeek`) are real functions in the Redis codebase.
