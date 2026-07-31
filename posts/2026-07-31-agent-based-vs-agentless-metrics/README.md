# Agent-Based vs Agentless Infrastructure Metrics: Why the Numbers Do Not Match

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Monitoring, Prometheus, Node Exporter, SNMP, Cloud Monitoring, Metric

Description: Reconcile agent and agentless infrastructure metrics by aligning scope, source, units, windows, resource identity, and reset behavior.

---

Agent-based and agentless systems often use the same label-“CPU utilization,” “disk reads,” or “network bytes”-for measurements taken at different boundaries. Values that do not match are not automatically wrong.

An agent-based host source reads from inside the operating system. Prometheus node exporter, for example, reads Linux kernel interfaces such as `/proc` and `/sys` and is scraped over HTTP.

An agentless collector commonly runs outside the guest or managed host and obtains data through:

- a cloud platform API;
- a hypervisor;
- SNMP;
- a storage or network controller;
- a management interface;
- remote shell or management protocols.

“Agent-based” does not mean the agent must push. Node exporter is host-resident software in a pull-based Prometheus architecture. “Agentless” often means no **custom** host package; an SNMP agent, hypervisor instrumentation, or provider control plane still produces the data.

## The First Question Is: What Boundary Was Measured?

| Resource | Inside-guest source | Outside-guest or agentless source |
| --- | --- | --- |
| CPU | Guest scheduler's per-vCPU time and modes | Hypervisor or platform allocation/utilization |
| Memory | Guest `MemAvailable`, page cache, swap, cgroups | Ballooning, assigned memory, or no guest memory data |
| Disk space | Mounted filesystem blocks and inodes | Volume provisioned bytes or pool capacity |
| Disk I/O | Guest block-device requests | Volume, controller, or storage-service operations |
| Network | Guest interfaces, including virtual/overlay traffic | VM boundary, virtual switch, physical port, or provider edge |

Do not compare values until the two sources refer to the same resource boundary.

Microsoft's Azure VM documentation makes the distinction explicit: host-level metrics describe the Hyper-V session that manages the guest, while guest metrics describe the operating system, applications, components, and processes. Guest data requires an agent and collection configuration.

## CPU Can Use Different Clocks and Denominators

Node exporter exposes per-logical-CPU counters:

```promql
node_cpu_seconds_total{cpu="0", mode="user"}
```

A guest CPU ratio might be:

```promql
1 -
avg by (job, instance) (
  rate(node_cpu_seconds_total{mode="idle"}[5m])
)
```

An external platform metric may instead:

- measure hypervisor-scheduled time;
- normalize by reserved rather than guest-visible vCPUs;
- include or exclude steal and wait states differently;
- publish a one-minute or five-minute aggregate;
- use average, maximum, or another statistic;
- arrive minutes after the observation interval.

Google Cloud, for example, documents separate guest-visible and reserved-core metrics and notes that they differ for some shared-core machine types. Dividing by two guest-visible vCPUs and dividing by a 0.5 reserved-core entitlement cannot produce the same utilization.

Before comparing CPU, write both equations:

```text
CPU ratio
  = included CPU time
    ÷ observation duration
    ÷ capacity denominator
```

Align every term.

## Guest Memory May Not Exist Agentlessly

The hypervisor knows how much memory is assigned and may know balloon or host-side behavior. It does not necessarily know the guest kernel's current page-cache reclaimability or `MemAvailable` estimate.

This is why many cloud platforms require a guest agent for detailed memory metrics. Azure documents host metrics as automatic and guest CPU or memory as agent-collected. AWS documents that its CloudWatch agent obtains Linux memory data from `/proc/meminfo`.

Even two guest agents can disagree on “used” memory. The AWS CloudWatch agent documentation shows a Linux calculation based on total minus free, cached, and buffered memory, while the Linux kernel's native `MemAvailable` is an estimate that also accounts for reclaim and watermarks. Compare raw components or identical formulas, not two vendor fields both named `memory_used_percent`.

## Filesystem Space and Volume Capacity Are Different

Inside the guest:

```promql
node_filesystem_avail_bytes
```

describes bytes available to an unprivileged user on one mounted filesystem.

A cloud or storage API may report:

- provisioned volume size;
- allocated pool bytes;
- physical backend consumption;
- snapshot usage;
- burst or quota state.

Those values can all be correct while differing because:

- the volume contains partitions;
- a filesystem reserve is unavailable to the application;
- thin provisioning separates logical and physical use;
- snapshots consume backend space;
- the mount is an overlay;
- a quota limits one directory or project;
- the volume has not been grown inside the guest after a platform resize.

Use guest filesystem metrics for `ENOSPC` risk to the application and platform storage metrics for volume or pool constraints.

## Disk I/O Changes Across the Stack

One write can be:

1. accepted into the guest page cache;
2. merged with adjacent writes;
3. issued through a guest block device;
4. transformed by a virtual controller;
5. cached or combined by the host;
6. replicated by a storage service;
7. committed to physical media.

The guest's `/proc/diskstats` counters and a cloud volume's service counters observe different steps. Operation count, byte count, latency, and timestamp can all differ.

Align:

- logical volume and guest device mapping;
- read versus write direction;
- completed versus submitted operations;
- payload versus protocol bytes;
- cache policy;
- interval and aggregation;
- whether parallel requests contribute additive time.

Do not average the two sources to produce a “more accurate” number. Choose the source that measures the constraint in the alert.

## Network Counters Depend on the Observation Point

Guest interface counters can include:

- loopback;
- container veth pairs;
- bridges;
- tunnels and encapsulation;
- retransmitted packets;
- traffic between local workloads.

A platform boundary may exclude same-host traffic, count encapsulated bytes, apply provider-specific filtering, or aggregate all virtual interfaces for the VM. A physical switch port sees another boundary again.

For SNMP, Prometheus's official `snmp_exporter` maps MIB indices such as `ifIndex` to Prometheus labels and reads interface counters centrally. Match the guest interface to the correct switch or appliance interface before comparing. Interface renames, bonds, VLANs, virtual functions, and changing `ifIndex` values can otherwise pair unrelated series.

Counter width matters too. Prometheus's SNMP exporter includes handling for large `Counter64` values because Prometheus samples use floating-point representation. Older or vendor-specific counters may wrap at different widths.

## Sampling and Aggregation Create Visible Gaps

Suppose an agent is scraped every 15 seconds and a platform publishes a five-minute average:

- the agent graph can show a 30-second 100% spike;
- the five-minute average shows roughly 10%;
- both describe the same episode.

If a one-minute guest CPU ratio has been pre-recorded as `instance:node_cpu_utilization:ratio1m`, align source periods before comparing:

```promql
avg_over_time(
  instance:node_cpu_utilization:ratio1m[5m]
)
```

That expression is only useful if the recorded metric and platform field use compatible definitions. Matching the time window cannot repair a scope mismatch.

For counters, compare increase over the same nominal interval:

```promql
increase(node_network_receive_bytes_total[30m])
```

In Prometheus 3.x, range selectors are left-open and right-closed; Prometheus 2.x included both boundaries. `increase()` extrapolates the observed counter rate to cover the full range. Account for that behavior along with platform timestamp semantics, publication delay, counter resets, and missing samples. An “Average” statistic for a delta metric is not interchangeable with “Sum.”

AWS EC2 basic monitoring publishes most instance metrics at five-minute periods, while detailed monitoring enables one-minute periods. Azure and Google metrics have their own sampling and visibility delays. Never infer raw resolution from a dashboard's one-minute plotting step.

## Resource Identity Is a Frequent Hidden Cause

The same machine may be identified by:

- hostname;
- IP and exporter port;
- cloud instance ID;
- VM resource URI;
- BIOS or machine ID;
- Kubernetes node name;
- SNMP engine or interface index.

Hostnames and IPs can be reused. Instances can be replaced while a dashboard line appears continuous. A volume can be detached and reattached under a different guest device name.

Create an explicit inventory mapping with effective start and end times. Preserve stable IDs in labels where their cardinality and privacy are acceptable, and do not join series only because their display names look similar.

## Reconcile Two Sources Step by Step

1. **Copy the official definitions.** Record source interface, metric kind, unit, included states, and statistic.
2. **Match one resource.** Resolve host, VM, interface, filesystem, or volume identity for the same time.
3. **Align the boundary.** Guest filesystem is not provider volume; guest veth is not physical port.
4. **Align units.** Convert bytes versus bits, seconds versus milliseconds, ratios versus 0–100 percentages.
5. **Align metric type.** Apply `rate()` or `increase()` to counters; do not rate a gauge.
6. **Align windows and statistics.** Use the same start, end, average or sum, and publication delay.
7. **Align denominators.** Compare per-core, guest-capacity, quota, or reserved-capacity ratios explicitly.
8. **Handle resets and gaps.** Exclude reboot, replacement, wrap, failed poll, and missing-data periods.
9. **Compare totals over a longer interval.** Integrated counter totals are easier to reconcile than individual timestamp spikes.
10. **Document the expected residual.** Caches, offload, layering, and clock alignment may leave a legitimate difference.

If the gap remains, capture raw `/proc`, `/sys`, SNMP walk, or provider API values at matched times before blaming the dashboard.

## Choose a Source by Operational Question

Use agent-based metrics when you need:

- guest memory and page-cache semantics;
- per-filesystem space and inodes;
- process, cgroup, or application attribution;
- Linux pressure and scheduler details;
- short collection intervals.

Use agentless or platform metrics when you need:

- visibility when the guest is unreachable;
- provider, hypervisor, switch, or storage-service limits;
- inventory coverage without guest deployment;
- an independent outside-in availability signal;
- hardware or appliance telemetry.

Use both for critical systems, but assign roles:

- platform availability can page when the guest agent is silent;
- guest metrics diagnose why the workload is unhealthy;
- platform volume metrics cover service quotas;
- guest filesystem metrics cover application headroom.

Also monitor each pipeline. An agent can fail with the host, while an external poll can fail because of credentials, firewall rules, API quota, or stale inventory.

## Summary

Agent and agentless numbers differ because they observe different boundaries, clocks, aggregation periods, denominators, and resource identities. Reconcile official definitions and raw counters over the same resource and interval. Use guest agents for operating-system and workload semantics, external metrics for provider and hardware constraints plus independent availability, and never average incompatible sources merely because their display names match.

## Official Documentation

- [Prometheus node exporter scope, collectors, and host deployment](https://github.com/prometheus/node_exporter)
- [Linux kernel `/proc` interfaces used for host accounting](https://docs.kernel.org/filesystems/proc.html)
- [Prometheus `rate()` and `increase()` counter semantics](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus SNMP exporter concepts and counter handling](https://github.com/prometheus/snmp_exporter)
- [AWS EC2 basic and detailed CloudWatch monitoring periods](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-detailed-monitoring.html)
- [AWS CloudWatch agent host metric definitions and Linux calculations](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html)
- [Azure VM host-level and guest-level monitoring](https://learn.microsoft.com/en-us/azure/virtual-machines/monitor-vm)
- [Google Cloud Ops Agent host metrics](https://cloud.google.com/monitoring/api/metrics_opsagent)
- [Google Cloud VM guest-visible and reserved CPU metrics](https://cloud.google.com/monitoring/api/metrics_gcp_c)
