# Fix Virtual Machine Disks Consolidation Is Needed Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, Snapshot, Disk Consolidation, VMDK, Backup, Troubleshooting

Description: Clear an ESXi consolidation warning by checking the live disk chain, free space, locks, and storage health before using supported vSphere actions.

---

The **Virtual machine disks consolidation is needed** warning means vCenter's snapshot inventory and the disk state on storage are not fully reconciled. It often follows an incomplete backup snapshot removal, a lock held by a backup proxy, insufficient datastore space, a storage interruption, or a host-management failure.

It does not mean that delta files can be deleted. Those files may contain the VM's newest writes. The safe response is to preserve the chain, remove the cause that blocked the prior cleanup, and ask vSphere to consolidate through the supported UI.

## Understand Delete and Consolidate

Deleting a snapshot does not revert the VM. It commits the changes represented by that snapshot into its parent while preserving the VM's current state. **Delete All** commits the snapshot chain into the base disk. **Consolidate** merges redundant or stranded delta disks when the snapshot manager's view no longer matches storage.

Revert is different: it deliberately returns the VM to an earlier snapshot state and discards later state from the active path. Do not use Revert to clear a consolidation warning.

On a traditional VMFS snapshot, the VM writes to an active delta. An online consolidation can create a helper delta to capture new writes while older deltas are merged. The operation is I/O intensive, can cause performance degradation and a stun that is usually brief but can become disruptive under heavy guest writes or storage latency, cannot safely be interrupted, and may take much longer than the task percentage suggests.

## Preserve Evidence and Stop New Snapshot Work

Record the exact alarm, failed task text, VM, host, datastore, time, and recent backup job. Pause scheduled snapshot-based backup and replication jobs for the VM so they do not create another delta while the incident is open.

In the vSphere Client, capture:

- VM power state and current host;
- Snapshot Manager contents;
- the consolidation banner;
- every hard disk's backing path in **Edit Settings**;
- datastore free capacity and health;
- active and recent Tasks and Events; and
- any VMDK unexpectedly attached to a backup proxy.

Preserve `/var/run/log/hostd.log`, `/var/run/log/vmkernel.log`, and the VM's `vmware.log` when the failed task reports a lock, missing file, I/O error, or space error. A support bundle is preferable when the failure is not immediately explained.

## Verify That Storage Is Healthy

Do not consolidate while the datastore is inaccessible, the array is saturated, paths are flapping, or the filesystem reports I/O errors. If many VMs on one datastore acquired the warning at the same time, treat storage as the primary suspect rather than performing 20 independent consolidations.

For block storage, review path state and SCSI errors. For NFS, test the actual VMkernel path to the NFS target. For vSAN, review Skyline Health, object health, capacity, and resynchronization. Resolve the storage condition first and confirm sustained healthy I/O.

Read-only host checks can establish the current mount and folder state:

```bash
esxcli storage filesystem list
ls -lah /vmfs/volumes/DatastoreName/VMFolder
```

Do not use `touch`, `mv`, `rm`, or descriptor editing as a diagnostic shortcut. A directory listing is not a complete snapshot graph, especially on vSAN or vVols.

## Check the Active Chain

The current backing shown by Edit Settings is authoritative for the configured virtual device. On VMFS, the `.vmx` file can corroborate it:

```bash
grep -i '.vmdk' /vmfs/volumes/DatastoreName/VMFolder/VMName.vmx
```

If a disk points to `VMName-000003.vmdk`, that descriptor is the active leaf, and earlier descriptors lead back to the base. The numerical sequence alone does not prove parent order because snapshot branches and past operations can leave gaps.

When the error suggests a broken or missing parent, run a support-guided read-only query on the ESXi host where the VM is registered to trace the active descriptor:

```bash
vmkfstools -q -v10 '/vmfs/volumes/DatastoreName/VMFolder/VMName-000003.vmdk'
```

Treat this as inspection only. A reported chain inconsistency, missing parent, CID mismatch, or absent extent is a stop condition. Copy the small descriptors and preserve all extents, then open a Broadcom Support case. Repointing the VM to an older delta can discard every write in a missing part of the chain.

## Calculate Working Space Conservatively

Check free space on every datastore that holds a VM base disk, delta or redo log, or configured snapshot working directory. In the default ESXi 5.0 and later file-backed layout, snapshot deltas live with their corresponding base disks, so a multi-datastore VM can have one healthy chain and one space-starved chain.

Broadcom's current insufficient-space guidance says available free space should be at least 1.5 times the total snapshot-file size for the affected VM in the documented file-too-large scenario. Treat that as a troubleshooting minimum for that scenario, not a universal formula. Thin base disks can grow while blocks are committed, and an online helper delta can grow with the guest's write workload.

If the margin is uncertain:

- extend the datastore through the supported storage and vSphere workflow;
- migrate another VM away to create headroom;
- reduce application writes; or
- schedule a powered-off consolidation or clone to a healthy datastore.

Do not assume delta files release space progressively. Broadcom documents that files for a virtual disk can remain until that disk's commit completes.

## Find and Release External Locks

A powered-on VM normally holds locks on its own active files. The problem is an unexpected lock, commonly a read-only attachment to a backup proxy after a failed hot-add backup.

First inspect the backup console and every proxy VM's Edit Settings. Match the complete datastore path, filename, and disk identity. If the target VM's VMDK is still attached to a proxy and no backup task is active, remove it from the proxy using **Remove from virtual machine**, never **Delete files from datastore**.

For VMFS, Broadcom documents lock inspection with:

```bash
vmfsfilelockinfo -p '/vmfs/volumes/DatastoreName/VMFolder/Disk-flat.vmdk'
```

Run it against the exact VMFS `-flat.vmdk`, `-delta.vmdk`, or `-sesparse.vmdk` extent implicated by the error or VM log. Map the reported MAC address or host identity to the ESXi inventory. vSAN locks require the vSAN-specific investigation procedure rather than assumptions based on VMFS lock output.

Do not kill a process or restart `hostd` and `vpxa` merely because a lock exists. Confirm that it is stale, identify the owning workflow, and use the specific Broadcom KB or Support direction. Restarting agents normally does not power off running VMs, but it disrupts management and can interfere with in-flight operations. A host reboot is a last resort after evacuating or shutting down workloads and proving that no supported release path remains.

## Run the Supported Consolidation

When storage is healthy, adequate headroom exists, the chain is complete, and external locks are gone:

1. Keep backup jobs paused.
2. Select the VM in the vSphere Client.
3. Choose **Snapshots > Consolidate**.
4. Confirm the operation.
5. Monitor storage latency, capacity, VM responsiveness, Tasks and Events, and the VM log.

If ordinary snapshots are visible and intentionally no longer needed, use Snapshot Manager's **Delete** or **Delete All** action according to the required snapshot state. Do not press Revert.

Once a commit begins, let it finish. The progress bar can remain at 99 percent even while storage I/O and file timestamps show continuing work. Do not initiate another consolidation on the same VM, restart agents to force cancellation, power-cycle the host, or delete files underneath it.

## Classify a Failed Retry

The retry text and supporting log context determine the next branch:

- **Not enough space**: add verified headroom and recalculate thin-disk and online-write exposure. **File too large**: verify actual free space and inspect the host logs because Broadcom also documents stale datastore-size metadata and host-side free-space query failures with that task text.
- **Failed to lock the file** or **One or more disks are busy**: identify the external host, process, or proxy attachment.
- **File not found** or **Unable to enumerate all disks**: preserve the directory and inspect the complete parent chain; on vSAN, also verify the backing objects and lock state. Do not fabricate a descriptor casually.
- **I/O error** or **APD**: restore storage health before touching snapshots. **Device or resource busy**: inspect the full log context because it can indicate a file lock or a transient SESparse bitmap error rather than a storage outage.
- task says complete but the warning remains: recheck active backing, external locks, and residual API snapshots; collect a support bundle if the state is ambiguous.

If the chain is complete but normal consolidation cannot proceed, Broadcom documentation describes cloning a powered-off VM or, with the VM powered off, cloning an individual disk from its current active descriptor with `vmkfstools -i` as recovery paths. These require enough destination capacity and a verified source chain. Prefer a vSphere Client clone. Use CLI cloning only with a Broadcom KB or Support plan, never by copying sparse VMDK components with generic `cp` or `scp`.

## Validate the Result

After consolidation:

- the warning is gone;
- Snapshot Manager shows only snapshots intentionally retained;
- each disk's active chain resolves to the expected base and any intentionally retained snapshot leaf;
- no unexpected VM disk remains attached to a proxy;
- datastore free capacity is stable;
- the VM and application pass functional checks; and
- the next backup creates and removes its temporary snapshot successfully.

Old-looking files can remain for legitimate reasons. Do not make cosmetic directory cleanup part of the incident unless each file has been separately proven orphaned.

## Prevent Recurrence

Alert on snapshot age, delta growth, consolidation-needed events, datastore growth rate, backup snapshot-removal failures, and abnormal VMDK attachments to proxies. Broadcom recommends no more than 72 hours for a single VMware snapshot and only two or three snapshots in a chain for better performance, despite an overall supported maximum of 32.

Shorter is better for high-write databases. Use application-aware backups for durable recovery and remove change-window snapshots as soon as validation completes.

## Official Documentation

- [FAQ: Delete All Snapshots and Consolidate Snapshots Feature](https://knowledge.broadcom.com/external/article/371714/faq-delete-all-snapshots-and-consolidate.html)
- [How to calculate snapshot consolidation space and time](https://knowledge.broadcom.com/external/article/316414/how-to-calculate-snapshot-consolidation.html)
- [VM consolidation fails because of insufficient free space](https://knowledge.broadcom.com/external/article/398339/vm-consolidation-tasks-fail-with-the-err.html)
- [Snapshot consolidation failure due to a file lock](https://knowledge.broadcom.com/external/article/374141/snapshot-consolidation-failure-failed-to.html)
- [Undetected snapshots in Snapshot Manager and snapshot chain](https://knowledge.broadcom.com/external/article/316545/undetected-snapshots-in-snapshot-manager.html)
- [Best practices for using VMware snapshots](https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html)

## Conclusion

A consolidation warning is a consistency signal, not permission to clean up files manually. Prove storage health, chain completeness, free-space margin, and lock ownership, then let the supported vSphere workflow perform the merge. Missing parents, uncertain locks, and storage errors are stop conditions that justify a support case.
