# How YARN Rounds Container Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, YARN, ResourceManager, Capacity Planning, Performance

Description: Understand YARN minimum, maximum, and scheduler-specific allocation increments, then measure normalized containers, fragmentation, and apparent wasted memory.

---

An application may ask YARN for 1500 MiB and receive a 2048 MiB container. Another may ask for 9000 MiB and be rejected instead of receiving the configured maximum. These outcomes follow different rules: a minimum is a lower bound, a maximum is a validation ceiling, and an allocation increment-when the selected scheduler uses one-defines the next grantable size.

Treat resource normalization as a contract between applications and the ResourceManager. It influences container concurrency, queue usage, fragmentation, and memory-limit enforcement, even when the application never uses the extra bytes.

## Separate the Three Controls

The current YARN reference defaults include:

```xml
<property>
  <name>yarn.scheduler.minimum-allocation-mb</name>
  <value>1024</value>
</property>
<property>
  <name>yarn.scheduler.maximum-allocation-mb</name>
  <value>8192</value>
</property>
<property>
  <name>yarn.scheduler.minimum-allocation-vcores</name>
  <value>1</value>
</property>
<property>
  <name>yarn.scheduler.maximum-allocation-vcores</name>
  <value>4</value>
</property>
```

These are reference defaults, not a recommendation for every cluster. Check the effective ResourceManager configuration in your deployment.

The documented behavior is asymmetric:

- a memory request below `yarn.scheduler.minimum-allocation-mb` is raised to the minimum;
- a vCore request below its minimum is similarly raised;
- a request above the corresponding maximum throws `InvalidResourceRequestException`; it is not silently rounded down; and
- an eligible request may be rounded to a configured allocation increment.

The applicable maximum is the scheduler's current maximum capability, not always just the static XML number. Queue overrides can lower it, and YARN can report a maximum based on registered NodeManager capability that is below the configured cluster maximum. Read the maximum shown for the active scheduler and queue when diagnosing a rejection.

There is another operational constraint: the reference says the ResourceManager shuts down a NodeManager configured with less memory or fewer vCores than the scheduler minimum. Never raise the minimum beyond the advertised capability of a small node without handling that node class.

## Increment Rounding Is Scheduler-Specific

Do not assume one increment property has identical meaning in every scheduler and Hadoop distribution. The current Fair Scheduler documentation explicitly defines:

```xml
<property>
  <name>yarn.resource-types.memory-mb.increment-allocation</name>
  <value>1024</value>
</property>
<property>
  <name>yarn.resource-types.vcores.increment-allocation</name>
  <value>1</value>
</property>
```

For Fair Scheduler, requests that are not multiples are rounded up to the next increment. Older names, `yarn.scheduler.increment-allocation-mb` and `yarn.scheduler.increment-allocation-vcores`, remain documented as no longer preferred.

With a 1024 MiB minimum, 8192 MiB maximum, and 1024 MiB Fair Scheduler increment, a useful mental model is:

```text
normalized = max(minimum, ceil(request / increment) * increment)
```

Validate the original request against the applicable maximum; requests above it fail rather than using the formula to clamp them. Example results are:

| Application request | Result | Reason |
| ---: | ---: | --- |
| 512 MiB | 1024 MiB | Raised to minimum |
| 1024 MiB | 1024 MiB | Already grantable |
| 1500 MiB | 2048 MiB | Rounded up to increment |
| 4097 MiB | 5120 MiB | Rounded up to increment |
| 9000 MiB | Rejected | Above maximum |

The global minimum is not automatically a universal increment for every scheduler version. Confirm `yarn.resourcemanager.scheduler.class`, then use that scheduler's current documentation and effective configuration. Capacity Scheduler also supports per-queue maximum allocation settings, which can make the applicable ceiling lower than the cluster-wide value.

## Find What the Application Actually Requested

Application frameworks translate their settings into YARN resource requests. MapReduce, for example, has separate resource properties for its ApplicationMaster, maps, and reducers. Current preferred names include:

```xml
<property>
  <name>yarn.app.mapreduce.am.resource.memory-mb</name>
  <value>1536</value>
</property>
<property>
  <name>mapreduce.map.resource.memory-mb</name>
  <value>1536</value>
</property>
<property>
  <name>mapreduce.reduce.resource.memory-mb</name>
  <value>3072</value>
</property>
```

The older `mapreduce.map.memory.mb` and `mapreduce.reduce.memory.mb` names are still common, but the current resource model marks them as no longer preferred. Inspect the submitted job configuration to see which values won precedence.

For any engine, distinguish at least three numbers:

1. the application's requested resource;
2. the ResourceManager's normalized and allocated resource; and
3. the process's observed peak use.

The Java `-Xmx` value is a fourth number. It limits heap, not the whole YARN container. Inferring the grant only from `-Xmx` misses non-heap and child-process overhead.

Use application diagnostics, the ResourceManager UI or REST API, scheduler metrics, and framework event logs to compare requested and allocated capability. A command-line starting point is:

```bash
yarn application -status application_1700000000000_0042
yarn logs -applicationId application_1700000000000_0042
```

The exact resource detail available in logs depends on the application. Instrument custom ApplicationMasters to record each request and returned container capability.

## Calculate Apparent Waste Correctly

For a single container, unused allocation at peak is approximately:

```text
allocated memory - measured peak container memory
```

For example, if a normalized 2048 MiB container peaks at 1250 MiB, the apparent unused portion is 798 MiB. Across 500 simultaneous containers, that is roughly 390 GiB of scheduled capacity unavailable to other work.

But not all unused memory is waste. A safe request includes headroom for peak variation, native memory, direct buffers, thread stacks, subprocesses, and measurement intervals. Compare high-percentile peaks across representative inputs, not an average from successful tasks. A container that sits at 70% most of the time may briefly need 95% during shuffle, compaction, or serialization.

Use two separate terms in capacity reviews:

- **normalization overhead**: allocated minus requested; and
- **workload headroom**: requested minus measured peak.

This distinction shows whether changing the scheduler's grant sizes or tuning the application will produce the larger benefit.

## Account for Node-Level Fragmentation

Even perfectly normalized requests can leave unusable fragments. Suppose a NodeManager advertises 24 GiB and a job receives 5 GiB containers:

```text
4 containers × 5 GiB = 20 GiB
remaining = 4 GiB
```

That 4 GiB can run smaller work, but not another 5 GiB container. If every pending request is 5 GiB, the scheduler displays free memory while the job waits.

Now add CPU. Whether CPU constrains placement depends on the scheduler's resource policy or calculator. For example, with Capacity Scheduler configured to use `DominantResourceCalculator`, if each container requests 1 vCore and the node advertises only 4 vCores, CPU limits concurrency to four even if memory could fit more. Conversely, under multidimensional scheduling, an 8 GiB, 8-vCore node cannot place an 8 GiB request needing 9 vCores. Capacity Scheduler's default `DefaultResourceCalculator` uses only memory for resource comparisons, so do not assume advertised vCores cap container concurrency without checking the active configuration. YARN represents a resource vector, but the scheduler configuration determines which dimensions affect placement.

Node labels, placement constraints, queues, user limits, custom resources such as GPUs, and locality further reduce the eligible pool. Do not call all unallocated memory “rounding loss” until these constraints are separated.

Measure:

- allocated and available memory and vCores per NodeManager;
- pending request sizes by application and queue;
- normalized container-size distribution;
- unallocatable residue by node;
- container peak usage by size class; and
- wait time and throughput after any change.

## Choose an Increment from Real Workload Shapes

A smaller increment reduces normalization overhead but creates more grantable sizes. A larger increment simplifies the size palette and can leave more intentional headroom, but may waste scheduled capacity for small workloads.

Consider a cluster where most containers need around 1.3, 2.7, and 5.5 GiB. With a 1 GiB increment, grants become 2, 3, and 6 GiB. With a 512 MiB increment, they become 1.5, 3, and 5.5 GiB. The second scheme reduces normalization overhead, but its operational value depends on node sizes, CPU requests, peak variance, and the scheduler in use.

Evaluate candidate settings offline using a sample of real requests and peaks:

```text
for each request:
  reject if request > applicable maximum
  otherwise normalize using the active scheduler's rules
  calculate normalization overhead
pack the resulting resource vectors into actual node shapes
```

Simple arithmetic on total cluster memory overstates the benefit because it ignores per-node packing and other resource dimensions.

## Align Node, Queue, and Application Limits

The cluster maximum must not exceed what any intended node class can place if users expect every container to run everywhere. It may be deliberately larger for a labeled high-memory node pool, but placement must express that design.

For Capacity Scheduler, inspect per-queue settings such as:

```xml
<property>
  <name>yarn.scheduler.capacity.root.analytics.maximum-allocation-mb</name>
  <value>16384</value>
</property>
```

The queue maximum must be no greater than the cluster maximum. A job can therefore pass its framework validation but be rejected under the queue's applicable resource ceiling.

Also compare `yarn.nodemanager.resource.memory-mb` and `.cpu-vcores` across node classes. Scheduler settings determine allowed request shapes; for resource dimensions considered by the active scheduler, NodeManager advertisements determine where those shapes can actually fit.

When changing resource boundaries:

1. inventory the active scheduler and all queue overrides;
2. model current and proposed normalization from production request data;
3. ensure every NodeManager class satisfies the new minimum;
4. preserve container overhead above heap or process working set;
5. canary representative small, medium, and large applications; and
6. verify allocated capability, failure rate, queue wait, and node residue.

Do not lower requests merely to make dashboards look efficient. A memory-limit kill and retry can consume more capacity than intentional headroom.

## Official Documentation

- [YARN Resource Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/ResourceModel.html)
- [YARN Default Configuration](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-common/yarn-default.xml)
- [Fair Scheduler](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/FairScheduler.html)
- [Capacity Scheduler](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/CapacityScheduler.html)
- [YARN Commands](https://hadoop.apache.org/docs/current/hadoop-yarn/hadoop-yarn-site/YarnCommands.html)
- [MapReduce Default Configuration](https://hadoop.apache.org/docs/current/hadoop-mapreduce-client/hadoop-mapreduce-client-core/mapred-default.xml)

## Conclusion

YARN raises requests below the minimum, rejects requests above the applicable maximum, and may round eligible requests to scheduler-specific increments. The difference between requested, allocated, and measured memory reveals whether capacity is lost to normalization, intentional safety headroom, or node-level fragmentation. Check the active scheduler and queue rules, model real request shapes, and preserve enough container overhead before changing the size grid.
