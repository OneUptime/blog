# ESXi Snapshot Manager Is Empty but Delta Files Remain: What Happened?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, Snapshot Manager, Delta Disk, VMDK, Backup, Consolidation

Description: Diagnose delta files that remain outside Snapshot Manager and determine whether the VM is still using them before consolidation or recovery.

---

Snapshot Manager is a management view, not a raw inventory of every file with a snapshot-like name. A failed backup API cleanup, corrupted `.vmsd` metadata, interrupted consolidation, storage outage, or deliberately solution-managed redo log can leave delta files on storage while the UI shows no snapshots.

The important question is not whether a filename remains. It is whether the VM's current virtual disk points to that delta, whether the delta is part of its parent chain, and whether another product owns it. Deleting the file before answering those questions can remove the VM's newest data.

## Separate Four Possible States

An empty Snapshot Manager with delta-looking files can represent:

1. **The VM is actively running on an undetected snapshot.** Its `.vmx` or Edit Settings backing points to a numbered descriptor whose parent links show that it is a snapshot leaf.
2. **Consolidation is needed.** vCenter knows residual deltas must be committed and shows a warning.
3. **The files are abandoned and unreferenced.** A completed migration, deleted disk, or failed cleanup left storage artifacts.
4. **The files are solution-managed.** Backup, replication, VDI, or another platform controls redo objects that should not be removed manually.

The same filename pattern can occur in each state. Classification must come before remediation.

## Stop New Snapshot Activity

Pause scheduled backup and replication jobs for the VM. Record the latest successful and failed jobs, recent snapshot tasks, storage events, host failures, and migrations. Avoid creating a test snapshot until storage health, free space, and chain consistency are known.

Capture:

- VM power state and registered host;
- the empty Snapshot Manager view;
- any consolidation-needed banner;
- every virtual disk path in **Edit Settings**;
- datastore capacity and health; and
- the VM's `vmware.log`, host `hostd.log`, and relevant backup logs.

If the VM is still running, do not power it off casually. A broken on-disk chain can become a power-on failure after shutdown.

## Find the Current Disk Backing

The path in **Edit Settings** is the supported starting point. Expand each hard disk. If it shows a path such as `[Datastore1] AppVM/AppVM-000007.vmdk`, the VM is using that numbered descriptor. On VMFS it commonly represents a snapshot leaf, but confirm the descriptor's parent relationship because a numbered filename alone is not proof.

On VMFS, connect to the ESXi host where the VM is registered and inspect the configured leaves without changing them:

```bash
grep -i '.vmdk' /vmfs/volumes/Datastore1/AppVM/AppVM.vmx
```

Repeat for each disk. A VM with three virtual disks can have different leaves and different datastore locations.

Do not infer the leaf from the highest filename number. Backup applications can use their own numbering, gaps can remain after deletes, and abandoned branches can coexist with the active chain.

## Understand the Role of the VMSD File

The `.vmsd` file stores snapshot-manager metadata and hierarchy information. If it is missing, stale, or corrupted, the UI can lose the snapshot tree while the VMX continues to point to a valid delta chain. The disk descriptors themselves contain the parent links used to open disk data.

This explains the apparently contradictory state: Snapshot Manager is empty because its management metadata has no visible entries, but the VM still reads and writes through snapshot descriptors.

Do not rebuild `.vmsd` or edit the `.vmx` as the first fix. Supported consolidation can often merge a healthy residual chain without reconstructing a historical UI tree. Manual metadata reconstruction belongs to the specific Broadcom descriptor procedure or a Support case.

## Inventory Files as Evidence

For VMFS, a read-only listing can reveal descriptors and extents:

```bash
ls -lah /vmfs/volumes/Datastore1/AppVM
```

Common names include:

- `AppVM-000007.vmdk`, a small descriptor;
- `AppVM-000007-delta.vmdk` or `AppVM-000007-sesparse.vmdk`, its data extent;
- `AppVM.vmdk` and `AppVM-flat.vmdk`, the base descriptor and extent; and
- `AppVM.vmsd`, the snapshot-manager metadata file.

The presence of `-000000.vmdk` does not establish a special failure type. Broadcom documents that some backup applications use that numbering for API-managed deltas. vSAN and vVols do not have the same flat-file layout, so use their native object tools and vendor workflow.

## Verify the Chain Before Consolidating

On VMFS, Broadcom documents checking the active leaf from the ESXi host where the VM is running or, if it is powered off, registered:

```bash
vmkfstools -qv10 \
  '/vmfs/volumes/Datastore1/AppVM/AppVM-000007.vmdk'
```

A healthy result opens and closes each parent. A missing file, CID mismatch, or I/O error is a stop condition. Preserve descriptors and logs and engage Broadcom Support rather than repointing to an older disk.

A powered-on VM legitimately locks its active disks, so Broadcom directs running `vmkfstools -qv10` on its owning host to avoid lock errors. If the command still reports a lock error, distinguish it from a chain error and investigate unexpected ownership by another VM or backup proxy with `vmfsfilelockinfo`, or use the vSAN-specific lock procedure.

## Check Space and Storage Health

Undetected snapshots often follow insufficient capacity, an API failure, a network or storage event, or abrupt shutdown. Fix the initiating condition first.

Check every datastore holding a VM disk. The required working space depends on how many blocks changed, whether a thin base must grow, whether the VM remains powered on, and how much the online helper delta grows. There is no universal percentage that makes every consolidation safe.

Do not start a merge while paths are unstable, NFS connectivity is intermittent, vSAN objects are unhealthy, or the array is saturated. A consolidation warning across many VMs on one datastore is evidence of a shared storage or backup event.

## Use the Supported UI Path First

If the chain is healthy, storage is healthy, enough headroom exists, and no external lock remains, use **Snapshots > Consolidate** in the vSphere Client. This is designed for residual disks that the snapshot inventory no longer represents correctly.

Broadcom's consolidation article also documents a workflow that creates one new snapshot and then uses **Delete All** when a VM shows consolidation needed but Snapshot Manager is empty. Do this only when:

- the active chain has been verified healthy;
- a new snapshot can be created safely;
- the datastore has adequate space;
- no backup job or external lock is active; and
- the version-specific article applies.

Do not use that workflow to probe a missing-parent or full-datastore incident.

Once deletion or consolidation starts, do not interrupt it. Task percentages can be inaccurate, and files may remain until a disk's entire commit completes. Monitor timestamps, datastore latency, capacity, VM responsiveness, and logs.

## Clone a Healthy Leaf When Consolidation Is Not Appropriate

For an undetected but healthy chain on VMFS, Broadcom documents cloning the active leaf to a new virtual disk. Power off the VM first and provide a healthy destination with enough capacity:

```bash
vmkfstools -i \
  '/vmfs/volumes/SourceDS/AppVM/AppVM-000007.vmdk' \
  '/vmfs/volumes/RecoveryDS/AppVM-consolidated.vmdk' \
  -d thin
```

The source is the leaf from Edit Settings, not the base and not the highest number guessed from a listing. After the clone completes, use the vSphere UI to detach the old disk without deleting it and attach the clone, or attach the clone to an isolated validation VM. Ensure the clone uses the same virtual SCSI controller type as the source; Broadcom warns that a CLI clone can be tagged for LSI even when the source uses PVSCSI, which can prevent the VM from booting until the controller type matches. Confirm application data before any cleanup.

CLI cloning is a recovery path, not the default operational procedure. Prefer a vSphere Client clone when available and use Broadcom Support for complex multi-disk, vSAN, vVols, encryption, shared-disk, or missing-parent cases.

## Decide Whether Remaining Files Are Orphaned

After a successful supported consolidation or clone, files can still remain. Prove each candidate is unreferenced by:

1. inventorying all VM and template disk paths in vCenter;
2. checking every `.vmx` and template `.vmtx` that can reference it;
3. confirming it is not a parent of any active leaf;
4. checking backup proxies and replication products;
5. checking file locks on all hosts with datastore access; and
6. verifying a recoverable backup and service-owner approval.

A storage-only migration of the active VM can help isolate leftovers by moving the VM's configured storage to another datastore. It is still not a substitute for checking shared disks, templates, linked clones, and backup references.

Delete a proven orphan through Datastore Browser using an explicit filename. Never use a wildcard against delta or VMDK files.

## Validate and Prevent Recurrence

After recovery, confirm:

- each disk points to the intended base or recovered descriptor;
- the consolidation warning is gone;
- datastore use and delta growth are stable;
- the application contains the newest expected writes;
- no source disk remains on a backup proxy; and
- the next controlled backup removes its API snapshot.

Monitor for snapshots outside Snapshot Manager with vSphere-aware inventory or PowerCLI, and alert on consolidation-needed events and old deltas. Broadcom recommends keeping VMware snapshots under 72 hours and removing backup-created snapshots after successful jobs.

## Official Documentation

- [Undetected snapshots in Snapshot Manager and snapshot chain](https://knowledge.broadcom.com/external/article/316545/undetected-snapshots-in-snapshot-manager.html)
- [Troubleshooting virtual machine snapshot descriptor problems](https://knowledge.broadcom.com/external/article/341646/troubleshooting-virtual-machine-snapshot.html)
- [Consolidating and committing snapshots in ESXi](https://knowledge.broadcom.com/external/article/316575/consolidatingcommitting-snapshots-in-vmw.html)
- [Verifying a snapshot chain and cloning a virtual disk](https://knowledge.broadcom.com/external/article/309366/verifying-a-snapshot-chain-and-cloning-a.html)
- [Disk consolidation warnings after storage capacity saturation](https://knowledge.broadcom.com/external/article/434690/disk-consolidation-needed-warnings-appea.html)
- [Best practices for using VMware snapshots](https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html)

## Conclusion

An empty Snapshot Manager says the management tree is empty, not that every delta is disposable. Identify the active backing, validate its parents, restore storage health and capacity, and use vSphere consolidation first. Clone a verified leaf when recovery requires isolation, and delete files only after proving they are outside every active dependency.
