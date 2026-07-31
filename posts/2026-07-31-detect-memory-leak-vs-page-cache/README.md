# How to Detect a Memory Leak Without Alerting on Healthy Page Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Memory Leak, Page Cache, Prometheus, Node Exporter, Troubleshooting

Description: Separate retained anonymous or unreclaimable memory from useful Linux page cache by combining composition, trend, reclaim pressure, and workload evidence.

---

“Used memory keeps rising” is not enough to diagnose a leak on Linux. The kernel puts file data into the page cache after reads and writes so later access can avoid expensive storage I/O. A server that has just scanned a large dataset may fill most of RAM with cache and still be healthy.

A credible leak investigation needs four kinds of evidence:

1. **composition:** which kind of memory is growing;
2. **retention:** whether it remains after the workload subsides;
3. **pressure:** whether reclaim, swapping, or OOM behavior is harming work;
4. **ownership:** which process, cgroup, or kernel subsystem retains it.

The goal is not to keep RAM empty. The goal is to catch memory that grows without a legitimate bound and cannot be reclaimed when the system needs it.

## Start with Available Memory, Not “Used”

Use the kernel's available-memory estimate:

```promql
node_memory_MemAvailable_bytes
/
node_memory_MemTotal_bytes
```

`MemAvailable` estimates how much memory can be supplied to new applications without swapping. A low `MemFree` value by itself is expected when page cache is effective.

Next, graph the major components:

```promql
node_memory_AnonPages_bytes
```

```promql
node_memory_Cached_bytes
```

```promql
node_memory_SReclaimable_bytes
```

```promql
node_memory_SUnreclaim_bytes
```

```promql
node_memory_Shmem_bytes
```

Interpret them carefully:

- `AnonPages` covers pages mapped into user space without file backing, commonly application heaps and stacks;
- `Cached` is in-memory cache for files, including tmpfs and shared memory, and excludes `SwapCached`, so it overlaps with `Shmem`;
- `SReclaimable` is slab memory the kernel may reclaim, such as some filesystem metadata;
- `SUnreclaim` is slab memory that is not reclaimable;
- `Shmem` includes tmpfs and shared-memory usage, which consumes RAM but is not ordinary clean file cache.

These categories are system-wide and are not a perfect ownership ledger. They are a way to choose the next investigation.

## Compare Shapes, Not Just Levels

Healthy page cache commonly follows workload:

- file cache rises during reads or writes;
- `MemFree` falls;
- `MemAvailable` remains adequate;
- after memory pressure, clean cache can shrink;
- application latency does not show sustained reclaim damage.

A user-space leak more often shows:

- anonymous memory rising across comparable workload cycles;
- memory not returning after requests, jobs, or connections finish;
- per-process private mappings increasing;
- `MemAvailable` steadily shrinking;
- eventually, reclaim stalls, swap activity, or OOM kills.

A kernel leak or unbounded kernel cache can instead appear as rising unreclaimable slab. Shared-memory or tmpfs growth can look different again, which is why “cache versus application” is not the only possible split.

Convert the trend into a rate for investigation:

```promql
deriv(node_memory_AnonPages_bytes[6h])
* 3600
/
1024
/
1024
```

This returns the least-squares trend in MiB per hour for each host. `deriv()` is intended for gauges and requires at least two samples. A positive result is a trend, not proof of a leak: a legitimate cache inside an application, a new steady-state load, or a long batch can produce the same shape.

Compare it with file cache:

```promql
deriv(node_memory_Cached_bytes[6h])
* 3600
/
1024
/
1024
```

Choose a range that spans several normal workload cycles. A 15-minute slope during startup is rarely useful evidence for a slow production leak.

## Add Pressure Evidence

Linux PSI measures how much execution time is lost when workloads contend for resources. With the node exporter pressure collector:

```promql
rate(node_pressure_memory_waiting_seconds_total[5m])
```

This is the recent fraction of wall time during which at least some tasks were stalled on memory. Sustained nonzero values alongside falling `MemAvailable` are stronger evidence of harmful memory pressure.

Also inspect:

```promql
rate(node_vmstat_pswpin[5m])
```

```promql
rate(node_vmstat_pswpout[5m])
```

```promql
rate(node_vmstat_pgmajfault[5m])
```

The exact `node_vmstat_*` set depends on the kernel and node exporter collector configuration. Swap activity and major faults can have legitimate bursts, so correlate them with latency and PSI.

Do not use existing swap occupancy alone as proof of current pressure. Linux may leave cold pages in swap even after pressure has ended.

## Page on Pressure; Ticket on a Leak Trend

A slow trend is usually a capacity or defect signal, not an immediate page. For example, this warning requires a rolling six-hour anonymous-memory trend of more than 1 MiB per second and less than 15% available memory, with both conditions remaining true for 30 minutes:

```yaml
groups:
  - name: host-memory-diagnostics
    rules:
      - alert: HostAnonymousMemoryGrowing
        expr: |
          (
            deriv(node_memory_AnonPages_bytes[6h])
            > 1024 * 1024
          )
          and
          (
            node_memory_MemAvailable_bytes
            /
            node_memory_MemTotal_bytes
            < 0.15
          )
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Anonymous memory is growing on {{ $labels.instance }}"
```

That threshold represents roughly 21.1 GiB over six hours if the trend remains constant, so it must be tuned to the host and expected workload. A better production rule often normalizes by requests, active sessions, jobs, or another workload measure.

Reserve a page for urgent evidence such as:

- an imminent memory limit or very low available memory;
- sustained PSI or swap thrashing;
- OOM kills;
- a user-visible latency or error symptom;
- a runbook action that can prevent an outage.

## Find the Owner at Process Scope

The node exporter's meminfo collector is host-wide and does not attribute memory to individual processes. On the host, inspect the process interfaces under `/proc`:

- `/proc/<pid>/status` exposes `VmRSS`, `RssAnon`, `RssFile`, and `RssShmem`;
- `/proc/<pid>/smaps` breaks mappings into resident, proportional, shared, private, anonymous, and other categories;
- `/proc/<pid>/smaps_rollup` provides an accumulated view when supported.

RSS alone can overcount shared pages when values are added across processes. PSS distributes a shared page proportionally among the processes mapping it, which is more useful for some ownership comparisons.

Compare the same process generation and workload phase. A restarted process has a new PID and reset counters; a rolling deployment can make a host-wide trend look like growth or recovery even when each process behaves identically.

For a suspected application:

1. record request rate, concurrency, queue depth, and cache configuration;
2. drive a repeatable load;
3. let the workload return to idle;
4. compare private and anonymous mappings after each cycle;
5. capture heap or allocator profiles using the application's supported tooling;
6. prove that retained allocations have no intended owner before calling them a leak.

## Use cgroup Composition for Containers

For cgroup v2, `memory.current` is the current memory used by the cgroup and its descendants, while `memory.stat` reports current amounts, type-specific details, and event counters through keys including:

- `anon`;
- `file`;
- `kernel`;
- `slab_reclaimable`;
- `slab_unreclaimable`;
- `workingset_refault_anon` and `workingset_refault_file`;
- page-scan, fault, and major-fault counters.

These keys are not mutually exclusive: for example, `kernel` includes slab, and `file` includes the `shmem` subset. The `file` value includes filesystem cache, tmpfs, and shared memory charged to that cgroup; it is not automatically a leak or necessarily ordinary clean file cache. A rising `anon` value that stays high after comparable work ends is more suspicious. Repeated file-cache refaults indicate that reclaimed pages are being needed again, so aggressively shrinking that cache could hurt performance.

Also inspect `memory.events` for `high`, `max`, `oom`, and `oom_kill` events. A container can hit its cgroup limit while system-wide `MemAvailable` remains healthy.

Use the metric names documented by your container collector rather than assuming node exporter exposes every cgroup file.

## Do Not “Test” by Dropping All Caches

Writing to `/proc/sys/vm/drop_caches` can release clean page cache and reclaimable slab, but Linux kernel documentation explicitly says it is not a mechanism for controlling cache growth and warns that using it can cause performance problems.

It also does not prove an application's behavior. A forced cache drop changes the workload's I/O path and can create a misleading recovery followed by a predictable refill.

A safer test is controlled pressure or a representative workload cycle while observing whether Linux reclaims file cache and whether anonymous/private memory remains. Run disruptive experiments only on a system where the performance impact is acceptable.

## Watch for Accounting Traps

- `Cached` is not “all reclaimable bytes.”
- tmpfs and shared memory are real memory consumers, even though they are file-like.
- transparent huge pages can make changes appear in large steps.
- a memory-mapped file can be present in process RSS and in page-cache accounting; adding every displayed category can double count.
- application allocators may retain freed arenas for reuse without returning pages to the kernel immediately.
- slab growth needs subsystem evidence; not all slab is reclaimable.
- virtual memory size is address space, not resident physical memory.

Treat the metrics as a decision tree, not as columns that must sum neatly to `MemTotal`.

## Summary

Healthy Linux page cache consumes RAM but remains reclaimable and helps performance. Detect leaks by showing that anonymous, private, shared-memory, or unreclaimable kernel memory grows across comparable workload cycles and fails to return, then confirm ownership at process or cgroup scope. Use `MemAvailable`, PSI, swap activity, and OOM events to judge impact. Do not alert simply because `MemFree` is low or `Cached` is high.

## Official Documentation

- [Linux kernel memory-management concepts: page cache, anonymous memory, and reclaim](https://docs.kernel.org/admin-guide/mm/concepts.html)
- [Linux `proc_meminfo(5)` memory field definitions](https://man7.org/linux/man-pages/man5/proc_meminfo.5.html)
- [Linux `proc_pid_status(5)` process memory fields](https://man7.org/linux/man-pages/man5/proc_pid_status.5.html)
- [Linux `proc_pid_smaps(5)` mapping accounting](https://man7.org/linux/man-pages/man5/proc_pid_smaps.5.html)
- [Linux kernel cgroup v2 memory accounting](https://docs.kernel.org/admin-guide/cgroup-v2.html#memory)
- [Linux kernel Pressure Stall Information](https://docs.kernel.org/accounting/psi.html)
- [Linux kernel warning and behavior for `drop_caches`](https://docs.kernel.org/admin-guide/sysctl/vm.html#drop-caches)
- [Prometheus gauge functions including `deriv()`](https://prometheus.io/docs/prometheus/latest/querying/functions/)
