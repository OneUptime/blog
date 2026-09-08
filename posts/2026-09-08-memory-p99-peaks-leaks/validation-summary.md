# Validation Summary: How to Size Memory for P99 Peaks Without Hiding Leaks

## Status
validated

## Post Type
Technical guide to memory capacity planning and leak diagnosis. The post contains implementation details and conceptual text snippets, so it qualifies for technical review despite having no executable code.

## Technologies Covered
- Linux cgroup v2 memory accounting, limits, reclaim, and OOM events
- Linux Pressure Stall Information (PSI)
- Kubernetes memory requests, limits, memory-backed emptyDir volumes, and node-pressure eviction
- Java HotSpot Native Memory Tracking (NMT), garbage collection, heap diagnostics, and Java Flight Recorder (JFR)
- Memory percentiles, workload normalization, and capacity monitoring; Prometheus is tagged but no PromQL is supplied

## Sources Consulted
- Linux kernel cgroup v2 memory controller: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html#memory
- Linux Pressure Stall Information: https://www.kernel.org/doc/html/latest/accounting/psi.html
- Kubernetes resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes node-pressure eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Oracle Java 21 memory leak troubleshooting: https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshooting-memory-leaks.html
- Oracle Java 11 diagnostic tools and NMT: https://docs.oracle.com/en/java/javase/11/troubleshoot/diagnostic-tools.html

## Issues Found
- The container-memory equation presented overlapping categories as independent additive terms. Request and queue state can already occupy heap or native buffers, and tmpfs-backed volumes are included in cgroup file-cache accounting. Replaced the equation operators with checklist markers and explicitly described the overlap. This preserves all listed components while preventing double counting.

## Review Notes
- Confirmed cgroup total and peak accounting, memory.stat categories, and the meanings of high, max, oom, and oom_kill events. Event counts complement PSI; they do not measure all memory contention. The max counter can increase even when reclaim succeeds without an OOM kill.
- memory.peak availability and reset support depend on the deployed kernel. A cumulative high-water reading is not automatically a sequence of independent 30-second peaks; collection must implement the stated sampling window. Swap usage is accounted separately in memory.swap.current.
- Confirmed PSI measures resource stall time and that reclaim can affect application performance before an OOM.
- Confirmed Kubernetes schedules using requests, accounts memory-backed emptyDir usage as memory, and can evict Pods under node pressure. Requests are scheduling inputs, not an unconditional guarantee against eviction.
- Confirmed NMT baseline comparisons and its limited coverage of non-JVM allocations. NMT must be enabled at JVM startup. The linked Java 11 and Java 21 documentation supports the general techniques described; diagnostic settings and overhead should be checked for the deployed JDK.
- Verified the arithmetic: 2 GiB / 20 MiB per hour = 102.4 hours, consistent with roughly 100 hours under continued linear growth.
- Percentiles of separate components are not generally additive. For example, disjoint 0.8% spikes in two otherwise-zero components give each component a zero p99 but their sum a positive p99. Measuring the combined boundary avoids that error.
- The sample memory figures and 3.5-GiB limit are illustrative, not measured results or a universal recommendation. Representative load, failure, recovery, and contention testing remains necessary to validate an actual deployment.
- All six documentation links resolved to the intended official resources. The author link is a plausible GitHub profile URL and is not a technical source.
- No executable code, terminal commands, configuration manifests, or PromQL expressions required syntax or runtime testing. Review was documentation-based; no production workload or Kubernetes cluster was exercised.
