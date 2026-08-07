# Fix YARN “Container Is Running Beyond Memory Limits”

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, YARN, NodeManager, Memory, Troubleshooting

Description: Diagnose YARN container memory-limit failures by separating heap, off-heap, child-process, physical, virtual, polling, and cgroup accounting.

---

A YARN container is a resource boundary, not a synonym for one Java heap. Its memory can include the task JVM, native and direct allocations, metaspace, thread stacks, memory-mapped data, and every child process in the container's process tree. Setting `-Xmx` equal to the container request therefore leaves no operating margin.

The familiar “container is running beyond memory limits” diagnostic is also incomplete without context. Determine whether YARN measured physical or virtual memory, whether the NodeManager used periodic process-tree polling or Linux cgroups, and whether the kernel—not YARN—reported an out-of-memory event.

## Preserve the Evidence from the Failed Container

Start with the application and container diagnostics rather than a generic cluster setting:

```bash
yarn application -status application_1700000000000_0042
yarn logs -applicationId application_1700000000000_0042 > /tmp/app-0042.log
```

In the ResourceManager UI or aggregated log, record:

- container ID, node, attempt, and exit status;
- requested memory and vCores;
- measured physical and virtual usage at termination;
- whether the message names a physical or virtual limit;
- application, NodeManager, and operating-system timestamps; and
- whether all attempts fail at the same data stage or only on one node.

An exit code of `137` means a process received `SIGKILL`, but it does not identify the actor by itself. The official YARN cgroups guide recommends checking the host system log for an OOM cause when a container exits with 137. Also inspect the NodeManager log and the container's stderr. A Java `OutOfMemoryError`, a NodeManager polling kill, a cgroup OOM kill, and a host-wide kernel OOM can look similar at the application level but require different fixes.

## Separate the Container Request from the Java Heap

For MapReduce, these settings represent different limits:

```xml
<property>
  <name>mapreduce.map.memory.mb</name>
  <value>4096</value>
</property>
<property>
  <name>mapreduce.map.java.opts</name>
  <value>-Xmx3072m</value>
</property>
```

`mapreduce.map.memory.mb` asks YARN for a 4096 MiB container. `-Xmx3072m` caps only the Java heap. The remaining 1024 MiB is not wasted: it must cover non-heap memory and other processes. Reducers use `mapreduce.reduce.memory.mb` and `mapreduce.reduce.java.opts`.

Current MapReduce defaults can infer the container request from Java options and `mapreduce.job.heap.memory-mb.ratio`, or infer `-Xmx` from the container request when it is absent. Explicitly inspect the job's effective configuration rather than relying on an old cluster-wide ratio.

Choose headroom from measurement. Workloads using compression codecs, native libraries, large direct buffers, many threads, Python or shell subprocesses, or JNI commonly need more non-heap space than a simple Java mapper. A fixed 80% heap rule can be a starting experiment, not proof of correctness.

Other engines have their own request and overhead properties. Do not tune MapReduce keys for a Spark, Tez, Flink, or custom YARN application unless that engine actually consumes them.

## Understand Process-Tree Accounting

The NodeManager launches and manages the container, then attributes resource use to its process tree. If the task starts helpers, their memory belongs to the same allocation:

```text
container launcher
└── task JVM
    ├── native library threads
    └── python or shell child
```

This explains a common puzzle: the JVM's heap graph remains under `-Xmx`, yet the container crosses its limit. Inspect the process tree on the affected node while a reproducible container runs:

```bash
ps -eo pid,ppid,rss,vsz,cmd --forest
```

Use host access and production commands under your security policy. RSS and VSZ are snapshots, shared-memory accounting is nuanced, and a fast spike can occur between samples. Prefer application-native metrics, NodeManager metrics, cgroup counters, and a time series over one `ps` reading.

For Java, measure at least heap occupancy, direct-buffer use, metaspace, thread count, native memory where supported, and allocation behavior during shuffle or serialization. For mixed-language jobs, instrument the worker processes too.

## Physical and Virtual Memory Mean Different Things

The relevant NodeManager switches are:

```xml
<property>
  <name>yarn.nodemanager.pmem-check-enabled</name>
  <value>true</value>
</property>
<property>
  <name>yarn.nodemanager.vmem-check-enabled</name>
  <value>true</value>
</property>
<property>
  <name>yarn.nodemanager.vmem-pmem-ratio</name>
  <value>2.1</value>
</property>
```

Those are the current reference defaults, but distribution packaging and local `yarn-site.xml` may differ. The ratio expresses allowed virtual memory relative to the physical-memory allocation when virtual checking is used.

The legacy `ProcfsBasedProcessTree` view obtains virtual size from `/proc`. On 64-bit systems, that address space can include mapped files and large reserved ranges that are not backed by physical RAM or swap. Some JVMs reserve gigabytes of address space without consuming it. A virtual-memory violation can therefore reflect the measurement model rather than actual pressure.

Apache Hadoop documents `CGroupsResourceCalculator` as a more representative alternative because its virtual measure sums physical use and swapped pages while excluding reserved address space:

```xml
<property>
  <name>yarn.nodemanager.resource-calculator.class</name>
  <value>org.apache.hadoop.yarn.server.nodemanager.containermanager.linux.resources.CGroupsResourceCalculator</value>
</property>
```

This class is the cgroup v1 calculator in the current API. A cgroup v2 host must use the calculator and resource-handler configuration supported for cgroup v2 by its Hadoop release. In either case, do not paste the class setting alone and assume enforcement changed; resource calculation and enforcement are related but separate choices.

## Identify the Enforcement Mode

Current YARN documentation describes three mechanisms:

1. **Polling** periodically measures the process tree and kills a container after it observes a limit violation. A spike can exist between checks, and delayed action can expose the node to pressure.
2. **Strict cgroup control** uses the kernel's cgroup OOM behavior to terminate a container at its boundary.
3. **Elastic cgroup control** allows individual containers to burst while aggregate container memory on the node remains below its configured limit, then selects containers for preemption when the node-level container cgroup reaches that limit.

Key cgroup prerequisites include `LinuxContainerExecutor`, an allowed `default` Linux runtime, and:

```xml
<property>
  <name>yarn.nodemanager.resource.memory.enabled</name>
  <value>true</value>
</property>
```

Strict cgroup enforcement additionally uses `yarn.nodemanager.resource.memory.enforced=true`. Elastic control uses `yarn.nodemanager.elastic-memory-control.enabled=true` with strict enforcement disabled in the documented basic setup. The official guide contains an advanced combined mode with different behavior; deploy it only after understanding that interaction.

Inventory the effective settings on the failing NodeManager, including its container executor and cgroup hierarchy. A property that appears in `yarn-default.xml` may be inactive because a prerequisite is false.

## Decide Whether the Container Is Too Small or the Job Is Leaking

Plot peak memory by input size, partition, attempt, and task phase. The shape is diagnostic:

- a stable peak just above the limit suggests insufficient request or heap headroom;
- growth throughout a task suggests retained data, an unbounded cache, or a leak;
- a sharp shuffle or sort peak suggests buffers or partition skew;
- failures only for certain keys suggest data skew or oversized records;
- failures only on one node suggest local configuration, runtime, or kernel differences; and
- a high VSZ with modest RSS suggests virtual address reservation rather than physical exhaustion.

Increase a container request only after identifying what consumes the memory. Larger containers reduce cluster concurrency and may simply postpone a leak. Conversely, shrinking heap to create overhead can cause Java heap exhaustion if live data genuinely needs it.

For a controlled MapReduce experiment, change request and heap independently:

```bash
hadoop jar job.jar com.example.Job \
  -Dmapreduce.map.memory.mb=5120 \
  -Dmapreduce.map.java.opts=-Xmx3584m
```

Generic `-D` options normally need to appear where the application's Hadoop option parser accepts them; verify the job's CLI. Confirm the ResourceManager actually granted the normalized request, because scheduler minimum, maximum, and increment rules can alter or reject it.

## Protect the Node, Not Just the Container

`yarn.nodemanager.resource.memory-mb` is the memory advertised for YARN containers on a NodeManager. It is not the host's total RAM. The operating system, NodeManager, DataNode, monitoring agents, security software, filesystem cache, and colocated services require headroom.

If the host itself is swapping heavily or invoking the global OOM killer, fix node resource sizing and workload concurrency. Disabling both physical and virtual checks merely removes YARN's guardrail; it does not create RAM. The NodeManager memory-control guide explicitly supports a no-control mode, but using it safely requires another reliable isolation mechanism and operational review.

Roll out enforcement changes to a small node group first. Verify cgroup mounts and permissions, restart requirements, ResourceManager node capacity, real container limits, and both Java and non-Java workloads before cluster-wide deployment.

## A Reliable Diagnostic Order

1. Read the exact application and container diagnostic and identify the node.
2. Correlate application, NodeManager, cgroup, and kernel logs.
3. Compare granted container memory with JVM heap and engine-specific overhead settings.
4. Enumerate child processes and native/off-heap consumers.
5. Determine whether the reported limit is physical or virtual.
6. Identify the active calculator and enforcement mode, including prerequisites.
7. Plot memory through time and across attempts to distinguish sizing, skew, and leaks.
8. Change one request, heap, measurement, or enforcement variable in a canary test.
9. Verify node-level headroom and cluster scheduling impact.

This order preserves the distinction between making the workload fit and hiding a bad measurement.

## Official Documentation

- [Using Memory Control in YARN](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManagerCGroupsMemory.html)
- [YARN NodeManager](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/NodeManager.html)
- [YARN Resource Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/ResourceModel.html)
- [YARN Commands](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YarnCommands.html)
- [YARN Default Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-common/yarn-default.xml)
- [MapReduce Default Configuration](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/mapred-default.xml)

## Conclusion

YARN kills a container based on the container's accounted process tree, not just its Java heap. Diagnose the exact physical or virtual limit, include child and off-heap memory, and identify whether polling, strict cgroups, elastic cgroups, or the host kernel acted. Then size the request and heap from measured peaks while preserving node headroom. That turns a vague memory-limit message into a specific, testable resource decision.
