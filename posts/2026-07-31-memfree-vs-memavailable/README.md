# MemFree vs MemAvailable: Which Linux Memory Metric Should Trigger an Alert?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Prometheus, Node Exporter, Memory Monitoring, PromQL, Alerting

Description: Choose Linux low-memory alerts from MemAvailable rather than literal free RAM, with PromQL that preserves scope and adds pressure evidence.

---

For a general Linux host low-memory alert, use `MemAvailable`, not `MemFree`.

`MemFree` is RAM doing nothing at this instant. Linux intentionally uses otherwise idle RAM for page cache and reclaimable kernel caches, so a healthy, busy server can have very little completely unused memory.

`MemAvailable` is the kernel's estimate of how much memory can be supplied to new applications without swapping. It includes immediately free memory plus a conservative estimate of reclaimable memory. That is much closer to the operational question an alert should answer: **can this host satisfy more allocations without entering memory pressure?**

## The Metrics Are Not Synonyms

The Linux `/proc/meminfo` interface defines:

| Kernel field | node exporter metric | Meaning |
| --- | --- | --- |
| `MemTotal` | `node_memory_MemTotal_bytes` | Total usable RAM |
| `MemFree` | `node_memory_MemFree_bytes` | Completely unused RAM |
| `MemAvailable` | `node_memory_MemAvailable_bytes` | Estimated RAM available for new applications without swapping |
| `Cached` | `node_memory_Cached_bytes` | File page cache, excluding `SwapCached` |
| `Buffers` | `node_memory_Buffers_bytes` | Temporary raw block buffers |
| `SReclaimable` | `node_memory_SReclaimable_bytes` | Reclaimable part of the kernel slab |

The `free` utility follows the same distinction. Its `used` value is calculated as total minus available, while its `free` column is the literal `MemFree` value.

That is why this alert is usually wrong:

```promql
node_memory_MemFree_bytes
/
node_memory_MemTotal_bytes
< 0.10
```

It fires whenever cache has productively occupied most unused RAM, even if the kernel can reclaim that cache cheaply.

## The General-Purpose Host Alert

Calculate the available-memory ratio:

```promql
node_memory_MemAvailable_bytes
/
node_memory_MemTotal_bytes
```

Or calculate unavailable memory:

```promql
1 -
(
  node_memory_MemAvailable_bytes
  /
  node_memory_MemTotal_bytes
)
```

These expressions preserve each series' existing labels, normally including `job` and `instance`. Do not sum memory ratios across hosts.

A practical warning rule can start like this:

```yaml
groups:
  - name: host-memory
    rules:
      - alert: HostMemoryAvailableLow
        expr: |
          (
            node_memory_MemAvailable_bytes
            /
            node_memory_MemTotal_bytes
          ) < 0.10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Available memory is below 10% on {{ $labels.instance }}"
```

Ten percent and ten minutes are starting points, not universal constants. A 10% reserve is 800 MiB on an 8 GiB host but 25.6 GiB on a 256 GiB host. Large-memory systems may need a ratio **and** an absolute threshold:

```promql
(
  node_memory_MemAvailable_bytes
  /
  node_memory_MemTotal_bytes
  < 0.10
)
and
(
  node_memory_MemAvailable_bytes
  < 4 * 1024 * 1024 * 1024
)
```

The `and` requires both conditions for the matching label set. Select values from workload tests and the amount of memory required for recovery, failover, or a normal traffic burst.

## Add Evidence of Real Pressure

`MemAvailable` is an estimate, not a guarantee. Confirm that low availability is harming allocation or forcing reclaim.

If the node exporter pressure collector is available, the following rate is the fraction of wall time during which at least some tasks were stalled by memory contention:

```promql
rate(node_pressure_memory_waiting_seconds_total[5m])
```

Linux Pressure Stall Information (PSI) measures time lost because tasks cannot make progress on CPU, memory, or I/O. A rising memory PSI rate is stronger evidence than low free memory alone.

Also inspect:

```promql
rate(node_vmstat_pswpin[5m])
```

```promql
rate(node_vmstat_pswpout[5m])
```

Those counters show pages moving from and to swap when the node exporter `vmstat` collector exposes them. A host can have swap space in use without currently thrashing, so alert on sustained activity and impact rather than the mere fact that `SwapFree` is below `SwapTotal`.

Useful corroborating signals include:

- application latency and timeouts;
- memory PSI;
- sustained swap-in or swap-out;
- major page faults;
- OOM-kill events;
- anonymous or unreclaimable memory continuing to grow.

Page only when the signal is urgent and actionable. A lower-severity capacity warning may use `MemAvailable` alone; a page should normally include service impact or strong pressure evidence.

## Do Not Reconstruct `MemAvailable` by Addition

This tempting approximation is not equivalent:

```promql
node_memory_MemFree_bytes
+
node_memory_Cached_bytes
+
node_memory_Buffers_bytes
```

It ignores the kernel's watermarks and assumes every cached byte is safely reclaimable. It also omits some reclaimable slab memory and can mishandle shared memory and other accounting categories.

The `free` manual explicitly notes that `available` accounts for page cache and the fact that not all reclaimable slab objects can actually be reclaimed. Prefer the kernel estimate when it exists.

On kernels before Linux 3.14, the native `MemAvailable` field does not exist. Do not silently replace a missing series with `MemFree`. Treat missing memory telemetry as a monitoring-coverage problem, or deploy a tested compatibility calculation for the exact operating systems you support.

## Host Memory Is Not Container Memory

`node_memory_MemAvailable_bytes` describes the host kernel's system-wide view. It does not tell a container how much headroom remains below its cgroup limit.

A container can be killed at its cgroup memory limit while the host has abundant `MemAvailable`. Conversely, the host can be under pressure while a small container remains far below its own limit. For cgroup v2 workloads, use controller data such as:

- `memory.current` for the cgroup's accounted usage;
- `memory.max` for its hard limit;
- `memory.high` and `memory.events` for throttling and limit events;
- `memory.stat` to split anonymous memory, file cache, and kernel memory.

Use metrics from your container collector that map those values, and verify the exact names and hierarchy semantics for that collector. Do not mix a host numerator with a container denominator.

## Tune the Threshold from History

Review the minimum available ratio during representative periods:

```promql
min_over_time(
  (
    node_memory_MemAvailable_bytes
    /
    node_memory_MemTotal_bytes
  )[7d:5m]
)
```

The subquery evaluates the ratio every five minutes across seven days, then selects each host's minimum. Compare:

- ordinary daily peaks;
- deployments and batch jobs;
- traffic surges;
- failover or recovery;
- an intentionally stressed test;
- the point where latency, PSI, or swapping becomes unacceptable.

Set the warning above the observed danger point with enough time for the runbook action to work. A capacity alert should answer what to do next: reduce workload, fix a leak, change limits, add capacity, or shed optional work.

## When `MemFree` Is Still Useful

`MemFree` is useful for explaining Linux's current memory composition and for low-level kernel investigations. A sudden change may help correlate boot behavior, cache reclaim, or a workload phase.

It is not useless; it is simply the wrong denominator for the usual “is this host running out of memory?” alert.

## Summary

Use `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes` for general Linux host headroom. `MemFree` counts only completely unused RAM and therefore treats healthy cache as a problem. Add PSI, swap activity, OOM events, and service symptoms to separate benign high utilization from damaging pressure, and monitor containers against their own cgroup limits rather than host-wide memory.

## Official Documentation

- [Linux `proc_meminfo(5)` definitions for `MemFree` and `MemAvailable`](https://man7.org/linux/man-pages/man5/proc_meminfo.5.html)
- [Linux `free(1)` definitions for free, used, cache, and available memory](https://man7.org/linux/man-pages/man1/free.1.html)
- [Linux kernel `/proc/meminfo` documentation](https://docs.kernel.org/filesystems/proc.html#meminfo)
- [Linux kernel Pressure Stall Information](https://docs.kernel.org/accounting/psi.html)
- [Linux kernel cgroup v2 memory controller](https://docs.kernel.org/admin-guide/cgroup-v2.html#memory)
- [Prometheus node exporter meminfo collector source](https://github.com/prometheus/node_exporter/blob/master/collector/meminfo_linux.go)
