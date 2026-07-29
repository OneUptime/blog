# Azure VM Disk Host Caching: None, ReadOnly, or ReadWrite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Managed Disks, Disk Performance, Caching

Description: Choose Azure disk host caching from workload read and durability requirements, and avoid unsafe ReadWrite caching for write-critical data.

---

Azure VM host caching uses storage on the physical host to serve managed-disk I/O closer to the VM. It can reduce read latency and increase effective read throughput, but it changes the I/O path and introduces separate cached limits.

Choose caching per disk and workload:

- **None** for an uncached remote-storage path;
- **ReadOnly** for read-heavy data where stale-cache and write behavior are supported;
- **ReadWrite** only when the application correctly preserves required writes to persistent storage.

Do not select the mode from a generic performance checklist alone. Database data, logs, operating systems, and scratch workloads have different correctness requirements.

## How the modes behave

### None

Reads and writes use the uncached managed-disk path and are subject to:

- the disk's IOPS and bandwidth limits;
- the VM size's uncached IOPS and bandwidth limits.

Use None when host-cache benefit is low, unsupported, or unsafe. Write-heavy transaction logs are a common example because ReadOnly provides little benefit and write durability is critical.

### ReadOnly

Reads first check the host cache:

- a cache hit is served from the host cache and its cached I/O limits;
- a cache miss reads from the managed disk and fills the cache;
- writes continue to persistent storage and invalidate affected cached content as required by the platform.

Microsoft recommends ReadOnly for read-heavy Premium Storage workloads and uses SQL Server data files as an example. Reads served from cache do not count against the managed disk's IOPS and throughput, which can free remote-disk capacity for misses and writes.

ReadOnly is not universally faster. Random reads larger than cache capacity, streaming scans with little reuse, or workloads already limited elsewhere may see little benefit.

### ReadWrite

With ReadWrite caching, a write can be acknowledged after it reaches the host cache, before the persistent managed disk path has completed. Microsoft warns that the application must have a proper way to write cached data to persistent disks. An application that assumes every acknowledged cache write is durably on remote storage can lose required data if the VM or host fails.

Operating-system disks commonly use ReadWrite caching because the platform and OS image are designed around that setting. That default is not a recommendation to enable ReadWrite on arbitrary database logs or application data.

Use ReadWrite on a data disk only when the workload vendor explicitly supports the Azure configuration and its write-ordering, flush, and recovery semantics have been validated.

## Check disk-type support

Caching support depends on disk type, size, VM size, and scenario. Important current constraints include:

- Ultra Disks do not support host caching and should use None;
- Premium SSD v2 does not support host caching;
- host caching is supported only within documented disk-size limits;
- VM sizes expose separate cached and uncached performance limits;
- some shared, clustered, or specialized configurations have additional rules.

Consult the selected disk type and VM-size pages. A portal option being unavailable is often a support constraint, not a transient UI problem.

## Match the mode to the workload

| Workload component | Typical starting point | Reason |
|---|---|---|
| OS disk | Platform/image default, commonly ReadWrite | Designed and tested as part of OS configuration |
| Read-heavy immutable data | ReadOnly | Repeated reads can hit local cache |
| Database data files | Vendor guidance, often ReadOnly in Microsoft's SQL example | Lower read latency without write-back semantics |
| Database transaction log | None | Primarily write-heavy and durability-sensitive |
| Sequential one-pass scan | Benchmark None vs ReadOnly | Limited reuse can make cache ineffective |
| Ultra Disk or Premium SSD v2 | None | Host caching unsupported |
| Application write-back data | ReadWrite only with explicit support | Acknowledgement and failure semantics must be correct |

This is a test plan, not a universal prescription. PostgreSQL, MySQL, SQL Server, distributed databases, and filesystems have their own durability and direct-I/O behavior.

## Inspect the current configuration

```bash
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query "storageProfile.{os:{name:osDisk.name,caching:osDisk.caching,sku:osDisk.managedDisk.storageAccountType},data:dataDisks[].{name:name,lun:lun,caching:caching,sku:managedDisk.storageAccountType}}" \
  --output json
```

Also inspect the disk resource and VM-size specifications. The VM's cached capacity and cached IOPS/bandwidth can be shared across cached disks and local storage features.

## Measure before and after

Use Azure Monitor:

- VM Cached IOPS Consumed Percentage;
- VM Cached Bandwidth Consumed Percentage;
- VM Uncached IOPS Consumed Percentage;
- VM Uncached Bandwidth Consumed Percentage;
- per-disk IOPS, bandwidth, latency, and queue depth.

Inside Linux, correlate with `iostat -xz`. On Windows, use PhysicalDisk performance counters. Benchmark the application's real read/write mix, not only a synthetic test with an unrealistically small working set that fits entirely in cache.

Record:

- block size;
- read/write ratio;
- sequential/random mix;
- queue depth;
- working-set size;
- warm-cache and cold-cache results;
- p50, p95, and p99 latency;
- recovery behavior after restart or host movement.

## Change caching as a controlled operation

Changing a disk's cache setting can detach and reattach the target disk or require VM state changes in some scenarios. Treat it as disruptive unless current documentation for the exact configuration proves otherwise.

Before changing:

1. confirm backup and recovery;
2. stop or quiesce the application;
3. flush writes and unmount when required;
4. check cluster ownership and shared-disk coordination;
5. verify the new mode is supported;
6. schedule an approved maintenance window.

In the portal, select the VM, open **Disks**, change **Host caching** for the intended disk, and save. Confirm by querying the VM model afterward.

Do not change a data disk by array position in an unreviewed script. Identify it by name and LUN so adding another disk cannot redirect the change.

## Durability tests matter

For any proposed ReadWrite data-disk use, test more than throughput:

- application-issued flush and fsync behavior;
- crash recovery;
- write-ahead log ordering;
- database consistency checks;
- host-movement or forced-restart recovery in a safe environment;
- documented vendor support.

If the application owner cannot explain how an acknowledged write becomes durable on the managed disk, use None or ReadOnly as appropriate.

## Common misconceptions

**Caching increases the managed disk's provisioned limit.**  
No. Cache hits use a separate host path. Misses and writes still interact with disk and VM limits.

**ReadOnly means the disk cannot be written.**  
No. It describes host-cache behavior; the managed disk can still receive writes.

**ReadWrite is always faster.**  
It may reduce write latency, but unsupported durability semantics can make the result incorrect.

**A cache survives every lifecycle event.**  
No. Treat host cache as reconstructable. Managed disk persistence, not cache contents, is the durable boundary.

The safest mode is the one that meets both measured performance and the workload's recovery contract.

## Official Documentation

- [Virtual machine and disk performance](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-performance)
- [Design Azure Premium Storage for high performance](https://learn.microsoft.com/en-us/azure/virtual-machines/premium-storage-performance)
- [Azure disk performance metrics](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-metrics)
- [Azure managed disk frequently asked questions](https://learn.microsoft.com/en-us/azure/virtual-machines/faq-for-disks)
- [Select a disk type for Azure IaaS VMs](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types)

