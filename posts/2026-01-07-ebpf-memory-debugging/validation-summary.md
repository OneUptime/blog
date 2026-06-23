# Validation Summary: How to Debug Memory Issues with eBPF

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- eBPF
- bpftrace
- BCC / BPF Compiler Collection
- Linux memory management
- Linux kernel tracepoints, kprobes, uprobes, and perf software events
- OOM killer and cgroups
- FlameGraph tooling
- Bash and Python

## Sources Consulted
- bpftrace documentation: https://bpftrace.org/docs/0.22
- Linux kernel kmem tracepoint documentation: https://docs.kernel.org/trace/events-kmem.html
- Linux kernel tracepoint documentation: https://docs.kernel.org/trace/tracepoints.html
- Linux kernel OOM tracepoint source: https://codebrowser.dev/linux/linux/include/trace/events/oom.h.html
- BCC reference guide: https://github.com/iovisor/bcc/blob/master/docs/reference_guide.md
- BCC memleak tool documentation and source: https://raw.githubusercontent.com/iovisor/bcc/master/tools/memleak_example.txt and https://raw.githubusercontent.com/iovisor/bcc/master/tools/memleak.py
- cgroup v2 memory controller documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Local tool checks: `bpftrace --version`, `bpftrace --help`, and kernel version inspection

## Issues Found
- The page fault explanation implied all page faults mean the data is not in physical RAM. Updated it to distinguish unmapped page table entries, minor faults, and major faults.
- The architecture diagram mapped `mm_page_alloc` tracepoints to page fault analysis and perf page-fault events to OOM debugging. Corrected the mapping.
- The setup script always tried to mount `/sys/fs/bpf` after checking for it. Updated it to use `mountpoint -q` and mount only when needed.
- Several bpftrace examples used deprecated keyed-map deletion syntax and truthy map lookups. Updated them to use `has_key(map, key)` and `delete(map, key)`.
- The user-space allocation tracer stored `ustack` without calling the current `ustack()` builtin. Updated it.
- The custom BCC leak detector compared wall-clock time to `bpf_ktime_get_ns()` monotonic timestamps. Updated it to use `BPF.monotonic_time()`.
- The custom BCC leak detector treated `calloc` and `realloc` as `malloc`, which miscounted `calloc` sizes and failed to account for old `realloc` allocations. Added dedicated handlers.
- The BCC memleak example described `-c` as combining allocations, but upstream uses `-c` for command execution. Replaced it with `--combined-only`.
- The page fault bpftrace script treated `exceptions:page_fault_user` as a major-fault source. Updated it to use `software:minor-faults` and `software:major-faults`, keeping the exception tracepoint only for address ranges.
- The BCC page fault analyzer classified major/minor faults solely by latency. Renamed those buckets to fast/slow fault latency and clarified the heuristic.
- The OOM bpftrace example called `oom_score_adj_update` an OOM kill tracepoint. Corrected the description.
- RSS calculations assumed 4 KB pages. Updated Python and Bash examples to use the system page size.
- The memory allocation flamegraph pipeline converted bpftrace output manually and then passed it to `stackcollapse-bpftrace.pl`. Updated it to save raw bpftrace stack output and let FlameGraph parse it once.
- The container memory script used a nonstandard `tracepoint:cgroup:cgroup_memory_limit_reached`. Replaced it with `tracepoint:oom:mark_victim` correlated by cgroup ID and noted `memory.events` for exact cgroup v2 counters.

## Review Notes
Some examples still depend on kernel configuration, symbol availability, glibc paths, and tracepoint fields that can vary by distribution and kernel version. I could not run full bpftrace dry-runs because local bpftrace requires root, but syntax and semantics were checked against current bpftrace, BCC, and Linux kernel documentation.
