# Size YARN NodeManager Memory and vCores Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, YARN, NodeManager, Capacity Planning, Performance

Description: Size NodeManager container memory and vCores from measured host headroom, colocated services, workload peaks, CPU enforcement, and scheduler constraints.

---

`yarn.nodemanager.resource.memory-mb` is the memory a NodeManager offers to YARN containers, not the server's installed RAM. `yarn.nodemanager.resource.cpu-vcores` is a scheduling capacity, not automatically a hard CPU limit. Setting both to the host totals can starve the operating system, DataNode, NodeManager, and monitoring agents precisely when the cluster is busiest.

Size the advertisement from measured non-container demand and failure headroom. Then confirm that the scheduler, container enforcement, and operating-system isolation implement the model you intended.

## Understand What the NodeManager Advertises

An explicit configuration looks like this:

```xml
<property>
  <name>yarn.nodemanager.resource.memory-mb</name>
  <value>180224</value>
</property>
<property>
  <name>yarn.nodemanager.resource.cpu-vcores</name>
  <value>28</value>
</property>
```

The example advertises 176 GiB and 28 vCores. It says nothing by itself about the host's physical size or whether a kernel cgroup enforces those totals.

The ResourceManager uses the registered capability to place containers. If running containers have been allocated all 176 GiB, no more memory is schedulable on that node. That protects the host only if 176 GiB left adequate non-YARN headroom and the chosen memory-control mechanism prevents containers from consuming beyond their allocations.

Similarly, vCores express how much CPU capacity the scheduler may allocate. The current default configuration explicitly says `yarn.nodemanager.resource.cpu-vcores` does not by itself limit the number of CPUs used by containers. Linux cgroups and settings such as `yarn.nodemanager.resource.percentage-physical-cpu-limit` are needed for supported CPU isolation.

## Inventory Everything Outside YARN Containers

Measure each hardware class during representative busy periods. On Linux, a starting inventory is:

```bash
free -m
grep -E 'MemTotal|MemAvailable|SwapTotal|SwapFree' /proc/meminfo
lscpu
ps -eo pid,ppid,rss,%cpu,comm --sort=-rss | head -30
```

Collect time-series data rather than relying on one snapshot. Account for:

- kernel and operating-system services;
- filesystem page cache and writeback bursts;
- NodeManager JVM heap and native memory;
- colocated DataNode heap, direct buffers, and transfer activity;
- log aggregation and local shuffle or spill I/O;
- security, observability, backup, and management agents;
- daemon restart and recovery spikes; and
- emergency margin for skew, retries, and slower disks.

The DataNode and NodeManager do not run inside ordinary application containers, so their memory is not part of the containers' YARN requests. A host can therefore remain “within YARN capacity” while those daemons and the kernel compete for the last gigabyte.

Page cache is reclaimable, but treating all of it as instantly free can create severe I/O latency and swapping. Preserve enough cache for the workload's measured disk and shuffle behavior.

## Build a Memory Budget

Use a budget rather than a generic percentage:

```text
YARN container memory
  = physical RAM
  - peak non-container committed memory
  - required filesystem/cache headroom
  - recovery and uncertainty margin
```

For an illustrative 256 GiB worker, an observed budget might be:

| Component | Budget |
| --- | ---: |
| Operating system, kernel, and agents | 16 GiB |
| NodeManager and DataNode, including native headroom | 20 GiB |
| Cache, writeback, and workload burst allowance | 32 GiB |
| Incident and measurement margin | 12 GiB |
| YARN containers | 176 GiB |

This is an example, not a Hadoop recommendation. A compute-only node, an HDFS-heavy node, and a node with additional services need different budgets. Validate committed memory, available memory, swap activity, OOM events, daemon garbage collection, and disk latency during a canary load.

Convert the final container figure to MiB for the property:

```text
176 GiB × 1024 = 180224 MiB
```

Then test how common normalized container sizes pack into 180224 MiB. A safe host budget can still create scheduler fragmentation if every workload asks for a size that leaves unusable residue.

## Understand Automatic Hardware Detection

The current reference XML stores `-1` for both NodeManager memory and vCores, but the outcome depends on another property:

```xml
<property>
  <name>yarn.nodemanager.resource.detect-hardware-capabilities</name>
  <value>false</value>
</property>
```

When detection is enabled on supported Windows and Linux systems and memory remains `-1`, YARN calculates available container memory. If detection is not active, the documented fallback is 8192 MB. For vCores, the corresponding fallback is 8.

Automatic memory calculation uses `yarn.nodemanager.resource.system-reserved-memory-mb`. That property matters only when hardware detection is true and `resource.memory-mb` is `-1`. If the reserve also remains `-1`, the current reference describes the calculated reserve as 20% of:

```text
system memory - 2 × HADOOP_HEAPSIZE
```

Do not mix an explicit `resource.memory-mb` with the expectation that `system-reserved-memory-mb` will be subtracted again. Under the documented conditions, the reserve participates in auto-detection; otherwise the explicit advertisement wins.

For CPU detection, YARN supports:

```xml
<property>
  <name>yarn.nodemanager.resource.count-logical-processors-as-cores</name>
  <value>false</value>
</property>
<property>
  <name>yarn.nodemanager.resource.pcores-vcores-multiplier</name>
  <value>1.0</value>
</property>
```

These affect auto-calculation only when hardware detection is enabled and `cpu-vcores` is `-1`. Decide deliberately whether hyperthreads count as cores for your workloads. A logical processor rarely provides the same incremental throughput as a physical core under saturation.

## Size vCores from Throughput, Not CPU Count Alone

Start with physical cores, reserve CPU for the operating system and daemons, then measure runnable work and saturation. A simple initial budget is:

```text
YARN vCores = workload-usable physical cores × chosen oversubscription factor
```

An oversubscription factor of 1 means one advertised vCore per workload-usable physical core. I/O-bound tasks may benefit from a larger factor; CPU-bound compression, encryption, serialization, or machine-learning tasks often do not. Determine the factor with throughput, run queue, CPU steal, context switching, throttling, and tail latency.

Keep these concepts separate:

- **advertised vCores** control scheduler accounting;
- **container vCore requests** express expected runnable CPU demand;
- **physical CPU percentage** can cap the aggregate used by containers on Linux with cgroups; and
- **scheduler resource calculation** determines how memory, CPU, and custom resources affect fairness and capacity.

The reference property's default for `yarn.nodemanager.resource.percentage-physical-cpu-limit` is 100. Lowering it can reserve CPU for non-YARN work when the supported cgroups configuration is active, but it is not a replacement for a truthful vCore advertisement.

Inspect the active scheduler's resource calculator. In Capacity Scheduler, a memory-oriented calculator and `DominantResourceCalculator` do not make identical multi-resource decisions. A vCore budget cannot prevent CPU overcommit if the effective scheduling and enforcement path ignores the dimension you expected it to constrain.

## Align with Scheduler Minimums and Maximums

The NodeManager advertisement and container-request grid must agree. Current reference defaults set scheduler minimum allocation to 1024 MiB and one vCore, and maximum allocation to 8192 MiB and four vCores. Production clusters commonly override the maxima.

The YARN reference warns that the ResourceManager shuts down a NodeManager configured below the scheduler's minimum memory or vCores. Check every node class before changing these settings.

Also verify:

- cluster and queue-specific maximum allocations;
- Fair Scheduler allocation increments where used;
- normalized ApplicationMaster, task, and service-container sizes;
- node labels that restrict large jobs to particular hardware; and
- custom resources such as GPUs.

A 64 GiB maximum container cannot run on a node advertising 48 GiB even if the cluster maximum permits it. Either reserve that request for a suitable labeled pool or lower the application size.

## Treat Enforcement as a Separate Design

Polling-based checks, strict cgroup memory control, and elastic cgroup memory control behave differently. Advertising 176 GiB says how much the ResourceManager may allocate; it does not prove the NodeManager's container process trees cannot exceed it.

The official memory-control guide documents cgroup prerequisites including `LinuxContainerExecutor`, an allowed Linux runtime, and `yarn.nodemanager.resource.memory.enabled=true`. It also distinguishes physical and virtual checking through:

```xml
<property>
  <name>yarn.nodemanager.pmem-check-enabled</name>
  <value>true</value>
</property>
<property>
  <name>yarn.nodemanager.vmem-check-enabled</name>
  <value>true</value>
</property>
```

Review the full supported combination before changing these switches. A container includes heap, off-heap memory, and child processes, while legacy virtual-memory measurement may include large reserved address ranges. Resource sizing and measurement choice must be tested together.

Do not disable checks as a substitute for host headroom. Without another reliable limit, one container can pressure the entire worker and take out the DataNode or NodeManager.

## Roll Out and Verify the Registered Capability

Use configuration management to create explicit profiles for each worker class. After the planned NodeManager restart or re-registration procedure, verify what the ResourceManager sees:

```bash
yarn node -list -all
yarn node -status worker17.example.com:45454
```

Use the exact NodeId shown by `yarn node -list`; the port can vary. Confirm memory and vCores in the ResourceManager UI or REST API, then run canary workloads that cover:

- many minimum-size containers;
- the common memory-to-vCore ratios;
- a largest permitted container;
- CPU-bound and I/O-bound tasks;
- shuffle and local-disk pressure; and
- a DataNode recovery or other expected daemon spike.

Monitor host `MemAvailable`, swap-in/out, OOM events, CPU run queue, throttling, DataNode and NodeManager JVMs, container kills, disk latency, scheduler wait, and node-level unallocated fragments.

Adjust one dimension at a time. If reducing advertised memory cures OOM events but destroys throughput, investigate application peaks and non-YARN consumers instead of immediately restoring the unsafe value.

## A Repeatable Sizing Checklist

1. Group workers by actual hardware and colocated-service profile.
2. Measure high-percentile non-container memory and CPU during representative peaks.
3. reserve explicit OS, daemon, cache, recovery, and uncertainty headroom.
4. Set container memory from the remaining budget and model normalized request packing.
5. Set vCores from measured CPU throughput and a tested oversubscription factor.
6. Verify scheduler resource calculation, minima, maxima, increments, queues, and labels.
7. Verify polling or cgroup enforcement independently from resource advertisement.
8. Re-register a canary NodeManager and confirm its capability at the ResourceManager.
9. Load-test container and daemon peaks together, then document the safe profile.

Revisit the budget after adding agents, changing heap sizes, enabling encryption or compression, changing disks, or shifting the workload mix. Capacity settings age as the node's real work changes.

## Official Documentation

- [YARN Default Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-common/yarn-default.xml)
- [Using Memory Control in YARN](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManagerCGroupsMemory.html)
- [YARN NodeManager](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManager.html)
- [YARN Resource Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/ResourceModel.html)
- [Capacity Scheduler](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/CapacityScheduler.html)
- [YARN Commands](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YarnCommands.html)

## Conclusion

Safe NodeManager sizing begins with what must remain outside containers. Subtract measured operating-system, daemon, cache, recovery, and uncertainty headroom from physical RAM, then validate how real container sizes pack into the remainder. Size vCores from workload throughput and understand that scheduling tokens need a matching CPU-control design. Finally, verify the ResourceManager's registered capability and canary the node under combined container and daemon pressure.
