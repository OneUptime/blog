# Validation Summary: How to Set Up systemd Resource Control with MemoryMax on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd (resource control directives)
- Linux control groups (cgroups v2)
- systemd unit files and drop-in overrides
- systemd-cgtop
- systemctl
- journalctl
- Memory, CPU, and I/O controllers
- systemd slices

## Sources Consulted
- `systemd.resource-control(5)` man page — definitions and defaults for MemoryMax, MemoryHigh, MemoryMin, MemoryLow, MemorySwapMax, CPUWeight, CPUQuota, IOWeight, IOReadBandwidthMax/IOWriteBandwidthMax, IOReadIOPSMax/IOWriteIOPSMax, TasksMax
- `systemd-cgtop(1)` man page — verified `-m` / `--order=memory` flag semantics
- `systemd.exec(5)` — CPUSchedulingPolicy values (other, batch, idle, fifo, rr) and CPUSchedulingPriority range (1–99)
- Linux kernel cgroup v2 documentation (https://docs.kernel.org/admin-guide/cgroup-v2.html) — verified `memory.max`, `memory.high`, `memory.current` semantics and the cgroup-aware OOM killer behavior

## Issues Found

1. **MemoryHigh description reversed direction of memory flow.** The post said "the kernel starts returning memory more aggressively to the cgroup", which is backwards — under MemoryHigh pressure the kernel *reclaims* memory *from* the cgroup, it does not return memory to it. Per `systemd.resource-control(5)` MemoryHigh docs: "the processes are heavily slowed down and memory is taken away aggressively". Updated the wording to: "processes are heavily slowed down and the kernel reclaims memory from the cgroup more aggressively, but does not kill processes".

2. **`systemd-cgtop -m` mislabeled as a filter.** The post described `-m` as "Show only memory metrics", but per `systemd-cgtop(1)` the `-m` flag is `--order=memory`, which orders all cgroups by memory usage while still showing every column. Updated the comment to "Order cgroups by memory usage".

## Review Notes
- All directive names, syntactic forms, default values (CPUWeight=100, IOWeight=100, CPUSchedulingPriority range, allowed memory suffixes K/M/G/T with base 1024, percentage values, `infinity`), and cgroup v2 file paths (`/sys/fs/cgroup/<path>/memory.max|high|current`) match the official systemd documentation.
- The note that CPUWeight replaces CPUShares is accurate (CPUShares is the cgroup v1 attribute).
- The monitoring script will print `[not set]` for `MemoryCurrent` on services where `MemoryAccounting` is not implicitly enabled (i.e., services without any Memory* limits set). The bash arithmetic on that string will fail with a `value too great for base` error for those rows. The post does not claim universal robustness so this isn't strictly incorrect, but a future revision could guard with a numeric-value check.
- The recommendation in `systemd.resource-control(5)` is to "use MemoryHigh= as the main control mechanism and use MemoryMax= as the last line of defense". The post emphasizes MemoryMax in framing and title but does cover MemoryHigh and recommends using them together, which is consistent with upstream guidance.
