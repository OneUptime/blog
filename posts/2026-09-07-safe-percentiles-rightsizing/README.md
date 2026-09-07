# P95, P99, or Maximum for Safe Rightsizing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rightsizing, Capacity Planning, Performance, Cost Optimization

Description: Select percentiles by resource behavior and service risk, then convert utilization history into a recommendation without hiding important peaks.

---

P95, P99, and maximum answer different questions. None is automatically the safe rightsizing statistic. The right choice depends on whether the resource can queue, throttle, spill, scale, or fail when demand exceeds the proposed capacity.

AWS Compute Optimizer makes this tradeoff explicit. Its configurable CPU thresholds include P90, P95, and P99.5, and its default uses P99.5 before applying headroom. Azure Advisor uses P95 CPU and outbound-network statistics but P99 memory, with different target ceilings for user-facing and non-user-facing workloads. The percentile and target ceiling are separate policy choices.

## Work in resource units, not only utilization percentages

A utilization percentage is tied to the current size. Convert it back to demand before comparing candidates:

```text
used CPU cores = current vCPU count * CPU utilization
used memory GiB = current memory GiB * memory utilization
required capacity = selected demand statistic / target utilization
```

If an 8-vCPU instance reaches P99 CPU utilization of 35 percent, its P99 demand is about 2.8 vCPU. At a target of 70 percent, the CPU-derived requirement is:

```text
2.8 / 0.70 = 4 vCPU
```

That calculation is only a candidate. Network bandwidth, storage throughput, architecture, local disks, licenses, and minimum replica requirements can rule it out.

When an autoscaler changes replica count or instance size inside the window, use absolute demand per unit of work or segment the data by configuration. A percentile of percentages across differently sized machines is not a coherent capacity requirement.

## Understand what each statistic protects

| Statistic | What it ignores | Appropriate starting use |
| --- | --- | --- |
| P95 | Highest 5 percent of samples | Tolerant batch work, queues, or horizontally scalable noncritical services |
| P99 | Highest 1 percent of samples | Many user-facing services with tested burst handling |
| P99.5 | Highest 0.5 percent of samples | Sensitive production services where rare peaks matter |
| Maximum | Nothing | Hard memory bounds, singular jobs, or nonrepeatable safety analysis |

A percentile is a frequency statement, not a duration statement. With one-minute samples over 30 days, 1 percent represents roughly 432 samples. They could be scattered one-minute bursts or one continuous seven-hour incident. Those patterns require different mitigations.

## Treat CPU and memory differently

CPU is compressible. Exceeding available CPU normally increases queueing and latency; a CPU limit can add cgroup throttling. If replicas can scale before the service objective is breached, a high CPU percentile plus measured headroom can be reasonable.

Memory is not safely compressible in the same way. A container that crosses its enforced memory limit can be killed. Use working-set or post-garbage-collection memory, inspect OOM history, and give leak, cache, native allocation, and failover behavior separate consideration. P95 memory is rarely a sufficient limit for a process that must survive occasional high-cardinality requests.

Storage, network, and accelerators add more constraints. An instance may average low CPU while already approaching its network packet rate, EBS bandwidth, connection limit, or GPU memory ceiling.

## Keep maximums, then explain them

Do not discard a maximum simply because it produces an expensive answer. Add context:

```text
timestamp: 2026-08-28T09:42Z
duration: 3 minutes
cause: cache rebuild after zone failover
repeatable: yes
service impact: none on current size
mitigation on target: prewarm plus autoscaling
```

If a maximum came from a bad deploy, telemetry error, or one-time data migration, exclude it only through an auditable rule. If it represents a recovery path the system still promises to support, either size for it or demonstrate another mechanism that serves it safely.

## Avoid percentile calculation traps

- Preserve a sampling interval shorter than damaging spikes.
- Do not average replicas before looking for a single hot shard.
- Separate stopped periods; zeros can push percentiles down.
- Weight samples by time when scrape intervals vary.
- Calculate workload-level demand as well as per-instance demand.
- Segment by region, tenant class, job type, and deployment epoch where behavior differs.
- Compare latency and error percentiles at the same timestamps.

For HPA-managed Kubernetes workloads, CPU utilization is usage divided by the request. Changing the request changes the HPA signal even if actual CPU demand is unchanged. Recalculate the scaling threshold or use a direct average-value or business metric when appropriate.

## Build a recommendation from multiple guards

Suppose a service has these measured CPU demands per replica:

```text
P95: 1.4 cores
P99: 2.1 cores
max: 4.8 cores for 20 seconds
```

The service has a 60-second autoscaling reaction time and a 200 ms latency objective. A safe process is:

1. Replay the 4.8-core burst against candidate sizes.
2. Verify whether existing replicas absorb the first minute.
3. Select P99 as the steady request only if queueing remains within the objective.
4. Add explicit growth and recovery headroom.
5. Confirm the candidate against memory, network, and storage.
6. Canary it and rollback on throttling, latency, errors, or OOMs.

This may lead to a 3-core request with no tight CPU limit, rather than either 1.4 cores or 4.8 cores. The operational mechanism matters as much as the percentile.

## Conclusion

Use P95 for deliberately tolerant workloads, higher percentiles for latency-sensitive production paths, and maximums to expose hard bounds and recovery events. Convert percentages into absolute demand, preserve peak context, apply resource-specific safety rules, and validate every candidate against service outcomes.

## Official Documentation

- [AWS Compute Optimizer rightsizing thresholds and headroom](https://docs.aws.amazon.com/compute-optimizer/latest/ug/rightsizing-preferences.html)
- [AWS Compute Optimizer EC2 utilization graphs](https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ec2-recommendations.html)
- [Azure Advisor VM resize recommendation criteria](https://learn.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations)
- [Kubernetes resource requests and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
