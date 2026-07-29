# Diagnose Azure VM Disk Throttling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Disk Performance, Azure Monitor, Troubleshooting

Description: Identify disk-level, VM-level, cached, uncached, and burst-credit throttling by correlating Azure Monitor metrics with guest latency and queue depth.

---

An Azure VM can have low CPU and plenty of free memory while storage is saturated. Azure managed disks have their own IOPS and throughput limits, and each VM size has separate cached and uncached storage limits. The effective ceiling is the first limit reached along the I/O path.

Diagnose four questions:

1. Is a specific disk at its limit?
2. Is the VM size capping aggregate I/O?
3. Is host-cached or uncached traffic saturated?
4. Did burst credits run out?

## Understand the limiting paths

For uncached managed-disk I/O:

```text
application
  -> guest block stack
  -> VM uncached IOPS and bandwidth limit
  -> managed disk IOPS and bandwidth limit
```

For host-cached I/O, requests also use the host SSD cache and the VM's cached storage limits. Cache hits can avoid managed-disk read I/O, while cache misses continue to remote storage. Temporary local disk uses a separate local path.

A single slow request can be latency-bound without reaching an IOPS limit. A large sequential workload can hit bandwidth before IOPS. A small random workload often reaches IOPS first.

## Start with Azure Monitor storage metrics

On the VM's **Metrics** page, chart these at one-minute granularity and split disk metrics by LUN where available:

- **OS Disk IOPS Consumed Percentage**;
- **OS Disk Bandwidth Consumed Percentage**;
- **Data Disk IOPS Consumed Percentage**;
- **Data Disk Bandwidth Consumed Percentage**;
- **VM Uncached IOPS Consumed Percentage**;
- **VM Uncached Bandwidth Consumed Percentage**;
- **VM Cached IOPS Consumed Percentage**;
- **VM Cached Bandwidth Consumed Percentage**.

A consumed-percentage metric near 100% at the same time as application latency is strong evidence of capping at that layer.

Also graph:

- disk read/write operations per second;
- disk read/write bytes per second;
- read/write latency;
- queue depth;
- burst IOPS and bandwidth targets;
- used burst-credit percentages for the disk and VM.

Microsoft documents most disk metrics as emitted every minute and burst-credit percentage metrics every five minutes. A short spike can be averaged inside that interval, so correlate with guest telemetry.

## Distinguish disk cap from VM cap

Example:

- three P30 disks can each supply 5,000 IOPS;
- the workload requests 15,000 aggregate uncached IOPS;
- the VM size permits only 12,800 uncached IOPS.

No individual disk must reach 100% for the VM to cap aggregate traffic. **VM Uncached IOPS Consumed Percentage** identifies that ceiling.

The opposite is also possible: a large VM can permit high aggregate I/O while one low-tier disk reaches 100% and delays only the workload on that LUN.

Use a simple decision table:

| Disk consumed % | VM consumed % | Likely bottleneck |
|---:|---:|---|
| Near 100 | Low | Disk tier or per-disk provision |
| Low on each | Near 100 | VM size aggregate storage limit |
| Near 100 | Near 100 | Both layers need review |
| Low | Low | Latency, guest, application, or another dependency |

Check both IOPS and bandwidth columns. A 1 MiB I/O consumes far more throughput per operation than an 8 KiB I/O.

## Map LUNs to guest devices

Azure Monitor disk metrics identify data disks by LUN. Map the LUN to the correct volume before changing a tier.

Azure model:

```bash
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query "storageProfile.dataDisks[].{name:name,lun:lun,sizeGiB:diskSizeGb,caching:caching,id:managedDisk.id}" \
  --output table
```

Linux:

```bash
ls -l /dev/disk/azure/scsi1/
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
```

The `/dev/disk/azure` links depend on image support. NVMe-based sizes require their documented mapping procedure.

Windows:

```powershell
Get-Disk |
  Format-Table Number, FriendlyName, SerialNumber, Location, Size

Get-Partition |
  Format-Table DiskNumber, DriveLetter, Size
```

Correlate Azure LUN/location, disk size, and resource model rather than relying only on drive letter.

## Measure inside the guest

Linux:

```bash
iostat -xz 1
```

Useful fields include request rate, throughput, average request size, queue depth, utilization, and latency. Exact columns vary by `sysstat` version and device mapper layout. Inspect both logical volumes and underlying devices.

Windows Performance Monitor counters include:

- PhysicalDisk reads/sec and writes/sec;
- disk read/write bytes/sec;
- average disk sec/read and sec/write;
- current disk queue length.

Guest tools show what the OS experiences. Azure metrics show where platform limits are consumed. Use both at the same UTC interval.

## Check bursting

Eligible Azure disks and VM sizes can temporarily exceed baseline performance using credits or on-demand bursting. A workload may look healthy after deployment, then slow down when accumulated credits reach zero.

Graph:

- disk used burst I/O credits percentage;
- disk used burst BPS credits percentage;
- VM cached and uncached used burst credits;
- target versus maximum burst IOPS and bandwidth.

Do not size a steady workload around temporary credit performance. Use the baseline provisioned target for capacity planning.

## Rule out other storage delays

Low consumed percentages do not prove storage is healthy. Investigate:

- filesystem errors or nearly full volumes;
- TRIM, checkpoint, compaction, or backup jobs;
- LVM, Storage Spaces, mdraid, or application striping imbalance;
- synchronous replication or database log flush latency;
- host cache miss pattern;
- encryption or filter drivers;
- snapshot or disk control-plane background-copy effects;
- queue depth too low to reach provisioned performance;
- noisy application locks mistaken for I/O wait.

Benchmark only on a nonproduction or approved target. `fio` and DiskSpd can overwrite data when configured incorrectly.

## Choose the right remediation

### When a disk is capped

- increase its provisioned tier or size where performance scales with size;
- use Premium SSD v2 or Ultra Disk when their capabilities and constraints fit;
- stripe across disks when the application and recovery design support it;
- separate hot data, logs, and temporary files;
- reduce I/O with batching, compression, indexing, or caching.

### When the VM is capped

- choose a VM size with higher cached or uncached storage limits;
- distribute I/O across more VMs;
- review whether caching places traffic on the intended limit path;
- avoid attaching disks whose aggregate potential far exceeds the VM's usable limit.

### When burst credits are exhausted

- provision a baseline that supports sustained demand;
- reschedule bursty maintenance;
- use on-demand bursting where supported and cost-appropriate;
- smooth concurrency and queue depth.

Changing size, tier, caching, or striping can be disruptive. Check live-resize support, backup, clustering, and application consistency first.

## Build an evidence bundle

For escalation, retain:

- VM size and exact disk SKUs/tier settings;
- caching mode by LUN;
- one-minute Azure metrics;
- guest `iostat` or Performance Monitor capture;
- request size and read/write mix;
- burst-credit history;
- UTC incident window;
- recent resize, attach, snapshot, or tier-change operations.

CPU and memory dashboards answer different questions. Disk consumed percentages and latency identify the storage ceiling.

## Official Documentation

- [Azure disk performance metrics](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-metrics)
- [Virtual machine and disk performance](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-performance)
- [Azure Disk Storage scalability and performance targets](https://learn.microsoft.com/en-us/azure/virtual-machines/disks-scalability-targets)
- [Design Azure Premium Storage for high performance](https://learn.microsoft.com/en-us/azure/virtual-machines/premium-storage-performance)

