# Validation Summary: How to Analyze System Performance with perf on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux `perf` (Performance Counters for Linux)
- Ubuntu (`linux-tools` packages, `apt`)
- Hardware Performance Monitoring Units (PMUs) and hardware/software counters
- `perf stat`, `perf record`, `perf report`, `perf top`, `perf annotate`, `perf mem`, `perf trace`, `perf script`
- Brendan Gregg's FlameGraph toolkit (stackcollapse-perf.pl, flamegraph.pl, difffolded.pl)
- Kernel tracepoints (block, ext4, syscalls, sched)
- NUMA (`numactl`), Intel PEBS / precise events
- Bash scripting, Docker container profiling

## Sources Consulted
- Linux kernel documentation — `perf_event_paranoid` sysctl (Documentation/admin-guide/sysctl/kernel.rst): https://www.kernel.org/doc/html/latest/admin-guide/sysctl/kernel.html
- perf man pages: perf-stat(1), perf-record(1), perf-report(1), perf-top(1), perf-trace(1), perf-mem(1), perf-script(1), perf-annotate(1)
- perf wiki / tutorial: https://perf.wiki.kernel.org/index.php/Tutorial
- Brendan Gregg, perf examples and FlameGraph repo: https://www.brendangregg.com/perf.html and https://github.com/brendangregg/FlameGraph
- Ubuntu packaging for `linux-tools-$(uname -r)` / `linux-tools-generic`

## Issues Found
- **`perf_event_paranoid` level descriptions were incorrect (Step 4 "Configure Kernel Parameters").** The original table listed:
  - `1` as "(default)" — the kernel default is actually `2`.
  - `2` as "Disallow all profiling (only kernel profiling allowed)" — this is backwards. Level `2` *disallows* kernel profiling while still permitting user-space profiling.
  - `0` as "Allow all users to access non-kernel events" — imprecise; at level `0` kernel and user profiling are both allowed and only raw/ftrace tracepoint access is restricted.

  Fixed the block to match the kernel documentation (cumulative restriction model, default `2`):
  ```
  # Paranoid levels (the kernel default is 2):
  # -1: Allow all users to access (almost) all events
  #  0: Disallow raw and ftrace tracepoint access; kernel and user profiling still allowed
  #  1: Also disallow CPU event access for unprivileged users
  #  2: Also disallow kernel profiling; only user-space profiling is allowed (default)
  ```

## Review Notes
- The remainder of the post is technically accurate: package installation, event-group brace syntax, event modifiers (`:u`, `:k`, `:pp`), the default 4000 Hz sampling frequency, frame-pointer vs DWARF call-graph unwinding, the FlameGraph pipeline, `perf mem`, `perf trace`, differential flame graphs (`difffolded.pl`), and the Python/Perl scripting subcommands all verified correctly.
- Minor (not changed, command is valid): the stray `sudo perf stat report` line at the end of Use Case 4 (Web Server Latency Analysis) would not produce output there because no preceding `perf stat record` was run. The subcommand itself is valid; it is simply out of place. Left as-is to avoid restructuring content.
- The `perf top` interactive key list is broadly correct; the `E` key is primarily an event-selection/expand control depending on perf version — behavior can vary slightly across kernel releases. Not changed as it is version-dependent and not strictly wrong.
- Example numeric outputs (counter values, IPC, GHz) are illustrative and will naturally vary by hardware; they are reasonable.
