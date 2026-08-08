# ESXi Datastore Is Full: Find Hidden Files Before Deleting Anything

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, Datastore, VMFS, Snapshot, VMDK, Storage Troubleshooting

Description: Recover a full ESXi datastore by finding its real consumers, creating safe headroom, and proving that files are unused before removal.

---

A full datastore is an availability incident, not a housekeeping task. Thin disks and snapshot deltas can stop extending, powered-on virtual machines can pause on an out-of-space question, new swap files can fail, and snapshot consolidation can become impossible precisely when it is most urgently needed.

The first objective is to stop growth and create a small amount of safe headroom. The second is to identify every consumer from supported inventory views. Deleting a file whose name looks old is never a valid first response. A base disk, snapshot parent, detached recovery disk, linked-clone dependency, or backup-proxy attachment can all look unused while still containing required data.

## Stabilize the Datastore

Record the affected datastore, hosts, virtual machines, active alarms, free capacity, and the time at which capacity was exhausted. Pause new deployments, snapshot-based backups, replication jobs, and other workflows that create files on it. Reduce application write load where the service owner can do so safely.

If the storage platform can extend the backing LUN or the NAS filesystem behind an export without disrupting service, expansion is normally the least risky way to regain working room. For VMFS, extend the backing LUN first, rescan every host that can access it according to the array procedure, and then expand VMFS through the vSphere Client. VMFS growth itself needs space for metadata updates, so a completely full datastore may need a small amount of headroom before the grow operation can succeed. For NFS, expand the backing filesystem according to the storage platform procedure and refresh the datastore's Summary page in vCenter; there is no VMFS partition to expand. Do not create a new VMFS datastore over an existing LUN and do not change partitions to make space appear.

When another datastore is available, migrate an unaffected VM or cold-migrate a powered-off VM through the vSphere Client. Do not begin an online Storage vMotion if the source is so full that it cannot create metadata or a required swap file. Broadcom's full-datastore guidance specifically identifies power-off and cold migration as recovery options when online operations cannot start.

Do not start consolidation merely because snapshots are large. Check storage health and the chain's space requirements first. An online consolidation creates a helper delta that can keep growing while the guest writes.

## Confirm Capacity at the ESXi Layer

Compare vCenter's datastore capacity with the host view. On an ESXi shell, these are read-only inventory commands:

```bash
esxcli storage filesystem list
df -h
```

Use the datastore UUID path under `/vmfs/volumes` when names are ambiguous. If one host reports a different state from peers that share the datastore, investigate paths, mounts, or management freshness before assuming the filesystem itself is full.

For VMFS backed by a thin-provisioned array, vCenter, `df`, and the array can legitimately report different numbers. The host accounts for VMFS allocations, while the array can apply compression, deduplication, and zero-block reclamation beneath it. An array pool with free physical capacity does not prove that VMFS has free blocks, and free VMFS capacity does not prove that the array pool has safe headroom.

## Find Large Directories and Files

Prefer the vSphere Client datastore browser for supported inspection. Sort VM folders and review the Files tab for the datastore. If shell inspection is necessary, keep it read-only:

```bash
du -h /vmfs/volumes/DatastoreName/*
find /vmfs/volumes/DatastoreName -type f -exec ls -lh {} \;
```

Look for these classes separately:

- snapshot descriptor and extent files such as `VM-000001.vmdk`, `-delta.vmdk`, or `-sesparse.vmdk`;
- powered-on VM swap files ending in `.vswp`;
- ISO, OVA, OVF, log bundle, core dump, and installer files;
- old VM directories that no longer have a registered inventory object;
- detached virtual disks that are deliberately retained;
- failed migration or backup remnants; and
- large `vmware-*.log` files caused by a repeating error.

File size is evidence, not ownership. Sparse and thin files can have a logical size that differs from allocated storage. vSAN and vVols also have object semantics that are not captured by treating the datastore like ordinary VMFS. Use their native health and capacity views instead of extrapolating from a directory listing.

## Account for VM Swap Files

A powered-on VM normally has a `.vswp` file sized from configured memory minus its memory reservation. A VM with 64 GB of memory and no reservation can therefore consume roughly 64 GB of datastore capacity before considering its virtual disks. Powering off the VM removes the active swap file and can create emergency headroom, but that is an outage and must be coordinated.

Do not add memory reservations merely to reclaim datastore space. Reservations consume guaranteed host or cluster memory capacity and can prevent other VMs from powering on. If swap placement is the long-term issue, use the supported cluster or host swap-file-location setting. Coordinate a full power-off and power-on, or a compute-only vMotion to another host configured for the destination swap datastore, so ESXi recreates the files in the intended location. A guest reboot is not sufficient, and Storage vMotion does not move `.vswp` files kept on a host swap datastore.

An old `.vswp` file is not safe to delete just because another one exists. Confirm the VM's power state and registration, check that no task is running, and use the supported lifecycle operation. Manual deletion belongs only to a specific diagnosed stale-file case with a backup and a documented recovery path.

## Distinguish Snapshots from Ordinary Files

Snapshot Manager is the first inventory source, but it is not complete in every failure mode. Backup products can create API snapshots, and failed deletion can leave a VM running on a delta even when Snapshot Manager is empty. Check the VM's Summary tab for a consolidation warning and inspect each hard disk's current backing path in Edit Settings.

The active `.vmx` file identifies the descriptor attached to each controller. Broadcom documents a read-only check like this:

```bash
grep -i '.vmdk' /vmfs/volumes/DatastoreName/VMFolder/VMName.vmx
```

If it points to `VMName-00000N.vmdk`, the VM is running on a snapshot chain. Do not delete any base, delta, descriptor, change-tracking, or snapshot metadata file. Use Snapshot Manager or **Snapshots > Consolidate** only after checking for conflicting file locks, chain health, and space. If a parent is missing or `vmkfstools -qv10 <current-descriptor.vmdk>` on the ESXi host running the VM reports failed opens or chain errors, stop and preserve the directory for Broadcom Support. For broker-managed VDI linked or instant clones, do not use the standard vCenter **Consolidate** or **Delete All Snapshots** operations; remediate them through the VDI management console.

## Prove Whether a VMDK Is Orphaned

An unreferenced file in one `.vmx` is not necessarily orphaned. It may be attached to another VM, a template, a backup proxy, or a VM whose configuration lives on another datastore. It may also be stored in a Content Library, registered as a First Class Disk such as one backing a Cloud Native Storage volume, or used as a parent in a snapshot chain.

Use this proof sequence:

1. Inventory every VM and template disk path in vCenter, including powered-off objects. Also check Content Libraries and the First Class Disk or Cloud Native Storage inventory.
2. Inspect Snapshot Manager, consolidation state, and the current hard-disk backing for the suspected VM.
3. Check backup and replication consoles for an active or stranded hot-add attachment.
4. Check whether the descriptor is referenced as a snapshot parent.
5. Check file locks and registration on every host that can access the datastore.
6. Confirm ownership with the application and backup teams and verify a recoverable backup.
7. Prefer a storage-only migration of the live VM when possible. VMware moves files referenced by its configuration; files left at the source are stronger orphan candidates, but still require a final dependency check.

Only after that evidence should an operator use the datastore browser to delete a specifically named, confirmed orphan. Never run wildcard removal against a VM directory. A deleted VMDK has no normal VMFS undelete workflow.

## Reclaim Space in Risk Order

Use the least ambiguous consumers first:

1. Move completed support bundles, old installation media, and positively identified unused ISOs off the datastore.
2. Remove obsolete ISO references from VM CD/DVD devices before deleting the ISO.
3. Cold-migrate or temporarily power off approved VMs to release their swap files.
4. Extend the datastore or migrate complete VMs through supported workflows.
5. Consolidate healthy snapshot chains with no conflicting file locks after sufficient headroom exists.
6. Delete a VMDK only after the full orphan proof is documented.

Monitor datastore free space and array capacity throughout. Once recovery begins, snapshot commit can generate sustained reads and writes, and delta files are not necessarily removed one by one. Do not interrupt an active consolidation, restart management agents to force it to stop, or reboot its host.

## Validate Recovery

Confirm that capacity alarms clear, affected VMs answer through their application health checks, and no VM remains paused on an out-of-space question. Verify that backup jobs did not leave new snapshots, all datastores and paths are accessible, and array capacity is also healthy.

Create alerts with enough lead time for the largest plausible snapshot, swap, migration, and policy overhead. Track both consumed capacity and growth rate. A static percentage alarm alone can be too late for a fast-growing delta disk.

## Official Documentation

- [Datastore is full, need to free disk space](https://knowledge.broadcom.com/external/article/414077/datastore-is-full-need-to-free-disk-spac.html)
- [Orphaned VMDK and zombie files on datastore](https://knowledge.broadcom.com/external/article/404094/orphaned-vmdk-and-zombie-files-on-datast.html)
- [How to validate if a VM is using a VMDK file](https://knowledge.broadcom.com/external/article/430686/how-to-validate-if-a-vm-is-using-a-vmdk.html)
- [Higher than expected datastore usage due to large VM swap files](https://knowledge.broadcom.com/external/article/342554/higher-than-expected-datastore-usage-due.html)
- [Best practices for using VMware snapshots](https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html)
- [Datastore usage is higher than shown on array](https://knowledge.broadcom.com/external/article/314355/datastore-usage-is-higher-than-shown-on.html)

## Conclusion

Recover a full datastore by stopping growth, adding safe headroom, and reconciling inventory with files. Swap, snapshots, ISOs, and abandoned disks all require different evidence. Supported vSphere migrations and snapshot workflows should do the moving and merging; manual deletion is reserved for a specifically proven orphan with a tested backup.
