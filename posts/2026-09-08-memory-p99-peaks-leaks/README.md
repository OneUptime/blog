# How to Size Memory for P99 Peaks Without Hiding Leaks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Memory, Capacity Planning, Linux, Kubernetes, Prometheus

Description: Set memory requests and limits from representative peak distributions and pressure signals while diagnosing sustained growth as a leak, cache, or backlog problem.

---

Adding memory can reduce OOM risk, but it can also stretch the time before a leak fails and make an unstable process appear healthy during a short test. A defensible plan distinguishes bounded workload-driven peaks from memory that grows with uptime.

Size the full process or container boundary, not only the managed heap.

## Account for every major component

Construct a component model to explain observations:

```text
container memory
  = runtime heap and live objects
  + stacks, code cache, and runtime metadata
  + native libraries and allocators
  + direct or off-heap buffers
  + socket and kernel-accounted memory
  + page cache charged to the cgroup
  + memory-backed volumes
  + in-flight request and queue state
```

On cgroup v2, `memory.current` reports total memory charged to the cgroup and descendants. `memory.stat` provides categories, `memory.events` exposes pressure and OOM events, and `memory.peak` can retain a high-water value. Kubernetes notes that memory-backed `emptyDir` volumes count as container memory and can grow to dangerous levels without explicit bounds.

Language heap graphs alone miss native and kernel-accounted memory. For HotSpot, Native Memory Tracking can compare JVM internal native-memory baselines, while heap dumps and Java Flight Recorder heap statistics help find growing object populations. NMT does not account for all third-party native allocations, so reconcile it with process and cgroup totals.

## Build a representative memory series

Run the production artifact through cold start, warmup, ordinary load, peak mix, a burst, sustained peak, dependency slowdown, backlog recovery, and idle recovery. Include a duration longer than relevant cache expiry, compaction, rotation, and garbage-collection cycles.

Sample:

- cgroup total and peak memory;
- anonymous, file-cache, slab, and socket categories;
- heap used after a comparable full collection when available;
- allocation and garbage-collection rates;
- active requests, queue depth, cache entries, threads, and connections;
- memory PSI and `memory.events` changes;
- OOM kills, restarts, and node eviction signals.

Use the same time window and labels when relating memory to workload. A cluster aggregate can hide one leaking replica.

## Interpret the p99 correctly

Choose a p99 over defined samples, such as 30-second container peaks across representative peak hours. State whether it is per replica, per node, or fleet-wide. A p99 from mostly idle night-time samples is not a peak sizing input.

Do not add p99 values for heap, cache, and native memory. Component peaks may occur together or at different times, and percentiles are not additive. Use the p99 or higher policy quantile of the measured combined boundary, then use components to explain it.

Suppose combined container memory across representative stages is:

```text
steady p50       1.9 GiB
peak-window p99  2.8 GiB
observed maximum 3.1 GiB
```

A candidate request could be based on the repeatable high working set and scheduling policy, while a candidate limit must cover the bounded peak, measurement error, and safe diagnostic operation. There is no universal margin. Test, for example, a 3.5-GiB limit under peak and failure scenarios and verify no sustained reclaim pressure or OOM event.

Kubernetes schedules primarily from requests, not recent memory use. If a Pod routinely uses far above its request, many such Pods can be placed on one node and trigger node pressure together. Set requests to protect realistic simultaneous use, then model node-level correlation and one-node failure.

## Separate a leak from bounded growth

Normalize memory against work and lifecycle. A cache that approaches a configured maximum and stabilizes is different from retained bytes that keep increasing after traffic and queues return to baseline.

Look for:

```text
post-recovery memory slope over process uptime
heap-after-GC slope
native committed-memory slope
objects, cache entries, threads, or buffers per unit of work
memory change after queues drain and connections close
```

Repeat with equal-duration windows and similar traffic. Use robust regression or a simple slope with confidence bounds, excluding only documented lifecycle events. If memory grows 20 MiB/hour after normalization, giving the process another 2 GiB merely delays expected exhaustion by roughly 100 hours.

Capture diagnostic evidence before an OOM when safe. For Java, compare NMT baselines and heap histograms, use a flight recording, or capture a protected heap dump with adequate disk and pause planning. For other runtimes, use their supported heap and allocator profilers.

## Include pressure, not just bytes

High cache use can be reclaimable, but reclaim itself may hurt latency. Linux memory PSI quantifies time tasks stall for memory, and cgroup `memory.events` shows `high`, `max`, `oom`, and `oom_kill` activity. A memory configuration fails if it meets a byte limit only by spending the latency budget in direct reclaim.

Test the candidate request and limit while another workload contends on the node. Confirm page faults, reclaim, memory PSI, latency, throughput, and OOM behavior. Kubernetes memory limits are enforced reactively by the kernel, commonly through an OOM kill when memory cannot be reclaimed; they are not an early warning mechanism.

## Make leak handling operational

Set separate alerts:

```text
capacity: high memory relative to limit plus pressure or projected exhaustion
leak: positive normalized post-recovery slope across multiple windows
safety: any increase in OOM or max events
```

Use bounded caches, queues, cardinality, and connection counts. A planned restart can limit impact temporarily, but document it as mitigation with an expiry date, not as proof that the memory requirement is stable.

Revalidate after runtime, allocator, concurrency, cache, payload, or sidecar changes. Roll out new limits gradually and preserve enough headroom to capture diagnostics without allowing one Pod to destabilize its node.

## Conclusion

Size memory from a clearly defined combined boundary over representative peak and recovery cycles. Use a high quantile only after specifying its population and window, then validate pressure and OOM behavior at the proposed request and limit. Treat continued normalized growth as a defect or explicitly bounded state, not a reason to keep adding headroom.

## Official Documentation

- [Linux kernel cgroup v2 memory controller](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html#memory)
- [Linux Pressure Stall Information](https://www.kernel.org/doc/html/latest/accounting/psi.html)
- [Kubernetes resource requests and memory limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes node-pressure eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Oracle Java: Troubleshoot memory leaks](https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshooting-memory-leaks.html)
- [Oracle Java diagnostic tools and Native Memory Tracking](https://docs.oracle.com/en/java/javase/11/troubleshoot/diagnostic-tools.html)
