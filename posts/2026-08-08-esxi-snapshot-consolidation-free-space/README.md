# How Much Free Space Does ESXi Need to Consolidate a Snapshot?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, Snapshot Consolidation, Datastore Capacity, VMDK, VMFS

Description: Estimate ESXi snapshot-consolidation headroom from changed blocks, thin-disk growth, helper deltas, and workload writes instead of one unsafe percentage.

---

There is no single free-space percentage that guarantees ESXi snapshot consolidation will succeed. The required capacity depends on which blocks changed, where each base and delta lives, whether the base disk is thin, whether the VM remains powered on, how quickly it writes, and which consolidation or clone workflow is used.

Broadcom publishes a 1.5-times-snapshot-size threshold for a specific **File too large** consolidation failure. Another Broadcom snapshot-descriptor article states that commit or clone requirements can range from almost none to almost 100 percent of the virtual snapshot disk size. These are not contradictory: they describe different failure modes and operations. Treat any rule of thumb as a scenario-specific floor, then model the actual chain.

## Understand Where Space Is Needed

On traditional VMFS snapshots, each virtual disk has a base descriptor and extent plus one or more delta descriptors and extents. A powered-on VM writes to the active leaf. During online consolidation, ESXi can create a helper snapshot so guest writes continue while older deltas merge.

Capacity can therefore be required for:

- growth of a thin base as changed blocks are committed;
- growth of a parent delta when a child is deleted into it;
- the online helper delta that captures new writes;
- filesystem metadata and operational overhead;
- other VMs, swap files, logs, backups, and snapshots sharing the datastore; and
- temporary recovery clones when in-place consolidation is not used.

The delta files themselves are not necessarily removed one at a time. Broadcom documents that files for a virtual disk can remain until that disk's consolidation is complete, so operators cannot count on early deltas freeing space for later ones.

## Inventory Every Disk and Datastore

In **VM > Edit Settings**, expand each virtual disk and record:

- active descriptor path;
- configured capacity;
- provisioning type;
- datastore; and
- controller slot.

Then record Snapshot Manager contents, the consolidation warning, VM power state, memory and swap location, datastore capacity, and workload write rate. A VM with disks on three datastores needs adequate headroom on all three; aggregate free space elsewhere does not help a constrained disk's datastore.

On VMFS, read-only inspection can corroborate file sizes and the configured leaf:

```bash
grep -i '.vmdk' /vmfs/volumes/DatastoreName/VMFolder/VMName.vmx
ls -lah /vmfs/volumes/DatastoreName/VMFolder
```

Do not add the apparent logical sizes of sparse files as if they were allocated blocks. Use vSphere's datastore views and the storage platform's native capacity tools. vSAN and vVols use object and policy semantics that are not reducible to VMFS filenames.

## Estimate Changed Data, Not Just Filename Size

A snapshot delta can grow toward the configured capacity of its base disk as unique blocks change. Its allocated size is evidence of current changed data, but the merge target matters.

Consider a 1 TB thin base that currently consumes 300 GB and a 220 GB delta. If most delta blocks map to ranges never allocated in the base, committing them can make the base grow substantially. If they mostly overwrite already allocated ranges, base growth can be much smaller. The datastore must sustain the actual writes, not just retain the existing files.

For a child merged into another delta, the parent can grow. For **Delete All**, changes ultimately reach the base. Snapshot depth, branch structure, disk format, and storage offload affect the operation.

Do not estimate from guest-used space. A guest can overwrite blocks repeatedly, and a deleted guest file might still occupy virtual-disk blocks until an end-to-end reclamation process succeeds.

## Add Online Helper-Delta Growth

If the VM remains powered on, estimate writes during the whole consolidation window:

```text
helper growth estimate = sustained guest write rate x conservative duration
```

Use storage or VM performance data from a comparable busy interval, not an idle five-minute sample. Add margin for bursts and for a consolidation that runs slower than expected because it competes with production I/O.

For example, a VM writing 25 MB/s for four hours can generate about 360 GB of writes. Snapshot allocation tracks changed blocks rather than a simple stream total, so actual unique-block growth may be lower, but the calculation shows why a small fixed margin is unsafe for a busy database.

Powering off the VM prevents new guest writes and avoids creation and growth of an online helper delta. Broadcom's snapshot FAQ notes that a powered-off delete does not need that additional online-write space and normally completes faster. A thin base can still need to grow as existing snapshot data is committed, so powered off does not mean that a nearly full datastore is automatically safe.

## Apply Official Rules Only to Their Scenario

For the error documented in Broadcom KB 398339, **File too large** caused by insufficient free space, Broadcom specifies free space of at least 1.5 times the total size of all snapshot files for the VM. Use that threshold when diagnosing that documented scenario, then add room for concurrent datastore growth and online writes.

Do not turn 1.5 times into a universal vSphere guarantee. Disk layout, changed-block distribution, thin-base expansion, helper-delta growth, and other workloads can require a different amount.

Broadcom KB 341646 states that space to clone or commit snapshots varies with delta size and the amount of changes, from almost zero to almost 100 percent of the virtual snapshot disk size. A recovery clone generally needs destination capacity for a new consolidated disk and should be sized against its logical output plus datastore overhead.

Broadcom's large-VM snapshot guidance recommends reserving 20 to 30 percent additional free datastore capacity when planning to create snapshots. That is planning guidance for snapshot growth, not a calculation that proves an existing consolidation is safe.

## Create a Conservative Capacity Budget

For each datastore, build this budget:

```text
estimated required headroom =
  possible merge-target growth
  + possible online helper growth
  + unrelated planned growth during the window
  + operational safety margin
```

Use an upper bound when the changed-block overlap is unknown. For a critical VM, it is often safer to provision enough destination capacity for a full clone than to depend on a tight in-place calculation.

Also reserve capacity for powered-on VM swap files. A VM restart during the incident might need a `.vswp` file approximately equal to configured memory minus reservation. Do not consume that last margin with consolidation and then discover that another VM cannot power on.

## Regain Headroom Safely

In order of lower ambiguity:

1. Extend the backing storage and VMFS through supported array and vSphere workflows.
2. Migrate unrelated VMs to another datastore.
3. Move completed support bundles and unused installation media after proving no VM references them.
4. Schedule an application shutdown and powered-off consolidation when the service can tolerate it.
5. Clone the powered-off active leaf to a sufficiently large healthy datastore.

Do not delete snapshot or VMDK files to create consolidation space. Do not remove the base of a linked clone, and do not assume a disk is orphaned because Snapshot Manager is empty.

If the datastore is already full, stop write-producing backup jobs and use Broadcom's full-datastore recovery guidance. A cold migration or approved VM shutdown can release a swap file. Consolidation should begin only after stable headroom exists.

## Check Performance as Well as Bytes

Capacity is necessary but not sufficient. Consolidation reads and writes substantial data, and a storage array can be technically below capacity while latency or queueing makes the operation impractical. Review:

- datastore read and write latency;
- backend pool and cache health;
- path errors, APD, or NFS reconnects;
- vSAN object health and resynchronization;
- competing backup, migration, and snapshot jobs; and
- guest responsiveness and acceptable stun risk.

Schedule large commits during a low-write period. Reduce workload writes through application controls where possible. Do not throttle or terminate the ESXi operation with an undocumented shell action.

## Monitor an Active Consolidation

Once consolidation starts, it cannot safely be canceled or paused. A client task can remain at 99 percent while work continues. Monitor:

- datastore free capacity and growth rate;
- VM and datastore latency;
- VM responsiveness;
- file sizes and timestamps for VMFS, as observational evidence;
- `vmware.log` consolidation progress messages; and
- backend storage health.

Do not restart management agents to force the task to stop, reboot the host, or launch another consolidation against the VM. If timestamps and I/O continue, allow it to finish. If it fails, preserve the exact error and recalculate before retrying.

## Validate the Result

After completion, confirm that the warning clears, every disk points to the expected base descriptor, and Snapshot Manager contains only deliberately retained snapshots. Validate the application, not merely VM power state. Check datastore and backend capacity after the files are removed, and confirm that the next backup can create and delete its temporary snapshot.

Update capacity alerts to include snapshot growth rate and time-to-full. A datastore at 60 percent can be more dangerous than one at 80 percent if a high-write delta is growing rapidly.

## Official Documentation

- [How to calculate snapshot size and understand consolidation factors](https://knowledge.broadcom.com/external/article/316414/how-to-calculate-snapshot-consolidation.html)
- [VM consolidation fails because of insufficient free space](https://knowledge.broadcom.com/external/article/398339/vm-consolidation-tasks-fail-with-the-err.html)
- [Troubleshooting virtual machine snapshot descriptor problems](https://knowledge.broadcom.com/external/article/341646/troubleshooting-virtual-machine-snapshot.html)
- [FAQ: Delete All Snapshots and Consolidate Snapshots Feature](https://knowledge.broadcom.com/external/article/371714/faq-delete-all-snapshots-and-consolidate.html)
- [Recommendations for creating a snapshot for a large VM](https://knowledge.broadcom.com/external/article/418600/recommendations-for-creating-a-snapshot.html)
- [Snapshot removal stops a virtual machine for a long time](https://knowledge.broadcom.com/external/article/323397/snapshot-removal-stops-a-virtual-machine.html)

## Conclusion

Size consolidation from the active chain and its merge target, not one percentage. Account for thin-base growth, online helper writes, other datastore consumers, and storage performance. Use the 1.5-times rule only for its documented failure case, and choose powered-off consolidation or a recovery clone when a tight online margin would put data at risk.
