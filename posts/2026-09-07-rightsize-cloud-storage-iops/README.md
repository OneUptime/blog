# Rightsizing Cloud Storage Without Creating an IOPS Bottleneck

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Storage, Rightsizing, Cloud Computing, Performance

Description: Reduce cloud storage capacity or tier cost only after validating IOPS, throughput, latency, queue depth, burst behavior, and host limits.

---

Storage has at least two independent dimensions: how many bytes it holds and how quickly it serves I/O. On some cloud volume types, capacity and performance are coupled. A smaller disk can therefore have enough free space and still lose the IOPS or throughput that kept the application healthy.

Treat capacity rightsizing and performance rightsizing as separate calculations.

## Characterize the I/O workload

Collect read and write signals separately:

```text
used and provisioned bytes
read and write IOPS
read and write throughput
average and tail latency
queue depth
average I/O size
random versus sequential access
burst-credit balance or throttled time
host or instance storage limits
```

Correlate them with application latency, database waits, compaction, backups, and batch windows. A low daily average can hide a checkpoint or restore that determines the required tier.

Use a sampling interval shorter than the damaging saturation period. Retain peaks and durations, not only percentiles.

## Relate IOPS, throughput, and I/O size

The basic relationship is:

```text
throughput = IOPS * average I/O size
```

A workload issuing 10,000 random 8KiB operations per second needs about 78MiB/s and 10,000 application IOPS. A sequential workload issuing 500 operations of 1MiB per second needs 500MiB/s and 500 application IOPS. Provider-counted IOPS can differ when requests are split or merged: AWS EBS SSD volumes count a 1MiB request as four 256KiB operations, so the second workload requires 2,000 EBS IOPS. The first usually needs an SSD IOPS profile; the second may be throughput-bound.

Cloud documentation makes this distinction explicit. Google Persistent Disk describes small random I/O as commonly IOPS-bound and large sequential I/O as commonly throughput-bound. AWS EBS documents the relationship among demand, IOPS, queue length, latency, I/O size, and throughput.

## Find every performance ceiling

For I/O reaching the volume, first find the lowest applicable ceiling in each dimension:

```text
IOPS ceiling = min(volume IOPS, instance IOPS, path IOPS limits)
throughput ceiling = min(volume throughput, instance bandwidth, path throughput limits)
effective IOPS ceiling = min(IOPS ceiling, throughput ceiling / average I/O size)
effective throughput ceiling = min(throughput ceiling, IOPS ceiling * average I/O size)
```

Use consistent units and I/O accounting at the same layer. These are upper bounds, not guaranteed delivered performance; cache hits can bypass the volume. Also check aggregate limits across all volumes attached to a VM. Moving one disk to a faster tier does not help when the instance is already at its EBS, SCSI, network, or vCPU-dependent ceiling.

Provider models differ:

- AWS `gp3` separates provisioned capacity, IOPS, and throughput within documented ranges, while other volume types can tie performance to size or credits.
- Azure Managed Disks have type- and size-specific performance, burst, caching, and performance-tier options.
- Google Persistent Disk performance can depend on disk size, disk type, machine type, vCPU count, and I/O size; Hyperdisk has its own provisioned-performance model.

Use the current documentation and pricing for the exact region and volume type. Do not copy old limits into policy.

## Interpret queue depth with latency

Queue depth is outstanding work, not automatically a problem. Some parallelism is needed to reach provisioned performance. A rising queue combined with rising latency and a flat IOPS or throughput line indicates saturation. A low queue and low delivered IOPS can mean the application is not issuing enough concurrent work.

Evaluate queue behavior by workload. A transaction log is sensitive to individual write latency, while a sequential scan can deliberately maintain a deeper queue for throughput.

## Size capacity with operational reserves

Model:

```text
required bytes = live data
               + expected growth until next expansion
               + local backups, logs, or retained copies stored on the volume
               + temporary maintenance space
               + filesystem reserve
               + recovery margin
```

Cloud snapshot storage is normally billed separately and does not consume the source volume's filesystem space. Include it in the cost model, but only include snapshots in this capacity equation when the storage implementation keeps their changed blocks or copies inside the volume being sized.

Databases may need temporary space for compaction, index builds, vacuum, or replication catch-up. Running a filesystem near full can degrade performance or stop writes even when the nominal volume has a few free gigabytes.

Expansion is commonly easier than shrinking. Kubernetes volume expansion grows supported volumes when the StorageClass allows it; the Kubernetes documentation notes that this feature does not shrink volumes. Many cloud disks similarly require creating a smaller destination and copying data. Plan snapshots, consistency, cutover, validation, and rollback.

## Benchmark the proposed configuration

Use a restored or representative dataset and the same filesystem, mount options, encryption, cache, instance type, and access pattern. A generic `fio` run is useful only when its block size, read/write mix, concurrency, and direct-I/O settings resemble the application.

Test:

1. steady traffic;
2. normal peak;
3. checkpoint, compaction, or backup overlap;
4. burst longer than the credit window;
5. restore and recovery;
6. degraded or failover topology.

Gate on application latency and completion objectives as well as storage counters. Confirm that monitoring itself can observe volume and instance throttling.

## Roll out with a reversible cutover

For a tier or performance change that supports in-place modification, verify provider limits and cooldowns, then canary on a replica or low-risk volume. For a shrink that requires migration:

- take a consistent snapshot or backup;
- create the target with explicit IOPS and throughput where supported, or select a size and tier that provide the required performance;
- copy and verify data;
- quiesce or replicate final changes;
- switch a controlled consumer;
- retain the old volume until acceptance;
- test restoration, not only reads.

Calculate savings including provisioned IOPS, throughput, snapshots, temporary migration volumes, and any longer runtime. Cheaper capacity with separately purchased performance may or may not be cheaper overall.

## Conclusion

Rightsize storage across bytes, IOPS, throughput, latency, queue depth, and burst duration. Check volume and host ceilings, reserve maintenance space, and benchmark the actual access pattern. Use a reversible data migration whenever shrinking is not supported in place.

## Official Documentation

- [Amazon EBS I/O characteristics and monitoring](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-io-characteristics.html)
- [Amazon EBS General Purpose SSD volumes](https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html)
- [Azure Managed Disk performance options](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-performance-options)
- [Google Persistent Disk performance](https://cloud.google.com/compute/docs/disks/performance)
- [Kubernetes StorageClasses and expansion](https://kubernetes.io/docs/concepts/storage/storage-classes/)
