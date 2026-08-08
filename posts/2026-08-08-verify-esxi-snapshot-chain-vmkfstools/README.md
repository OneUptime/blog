# Verify a Broken ESXi Snapshot Chain with vmkfstools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, VMDK Tools, Snapshot Chain, VMDK, CID, Data Recovery

Description: Use vmkfstools to inspect the active ESXi snapshot chain, recognize missing parents and CID mismatches, and stop before an unsafe repair.

---

`vmkfstools` can prove whether ESXi can open a virtual disk from its active snapshot leaf through every parent to the base. That is diagnosis. It does not make an unknown chain safe to edit, and a message about a CID mismatch does not prove that changing one hexadecimal value will preserve data.

On VMFS, a snapshot child descriptor records the identity and path of its parent. If a parent was renamed or deleted, ESXi can no longer follow the recorded path. If it was replaced or written after the child was created, the chain might no longer represent one coherent sequence of disk changes. The correct first response is to stop writes, identify the active leaf through vSphere, preserve metadata, and run a read-only consistency check from the correct host.

## Recognize a Chain Failure

Common symptoms include:

- **The parent virtual disk has been modified since the child was created**;
- **The content ID of the parent virtual disk does not match**;
- **A required file was not found**;
- **Unable to enumerate all disks**;
- **Invalid snapshot configuration**;
- snapshot deletion or consolidation failure; and
- a VM that will not power on after manual file work or a failed storage operation.

Capture the complete Tasks and Events error and the corresponding lines from the VM's `vmware.log` and `/var/run/log/hostd.log`. Preserve the file paths and the first `DISKLIB` error, not only the final generic power-on message.

Pause backup, replication, snapshot, and migration work for the VM. If the VM is still running, avoid a power cycle until a recovery plan exists. A running VM may be the only process that still has the chain open.

## Identify the Active Leaf in vSphere

Do not assume the highest numbered descriptor is active. Snapshot branches, failed deletes, and backup tooling can leave gaps or unrelated files.

In the vSphere Client:

1. Select the VM and open **Edit Settings**.
2. Expand each hard disk.
3. Record its datastore, controller type and slot, capacity, and complete disk-file path.
4. Record the host on which the VM is registered.

A disk path such as `[Datastore1] AppVM/AppVM-000005.vmdk` identifies the descriptor from which ESXi should traverse the chain. Repeat the process for every virtual disk because one disk can be healthy while another is broken.

On VMFS, the VMX file can corroborate the configured leaves:

```bash
grep -i '\.vmdk' /vmfs/volumes/Datastore1/AppVM/AppVM.vmx
```

Do not use a generic `grep` result as permission to edit the VMX. The vSphere view remains the supported configuration interface.

## Preserve Metadata Before Inspection

When the VM is powered off and no task is running, copy the small descriptor and configuration files to a safe incident directory or support bundle. Do not attempt to copy multi-gigabyte extents casually, and do not place the only metadata copy on the affected datastore.

Relevant small files can include:

- the `.vmx` configuration;
- the `.vmsd` snapshot inventory file;
- base and snapshot `.vmdk` descriptor files; and
- `vmware.log` files that show the last successful open.

On VMFS, a descriptor is normally a small text file paired with a large `-flat.vmdk`, `-delta.vmdk`, or `-sesparse.vmdk` extent. Do not open a large extent in an editor. vSAN and vVols use different object semantics, so use their specific Broadcom recovery procedure instead of assuming a flat-file layout.

## Run the Read-Only Chain Check

Broadcom's current snapshot-chain article documents this query from the ESXi host on which the VM is registered:

```bash
vmkfstools -qv10 '/vmfs/volumes/Datastore1/AppVM/AppVM-000005.vmdk'
```

Run it against the active leaf descriptor recorded in Edit Settings. Successful output opens and closes each delta and base extent. Failure output normally identifies the first parent it cannot open and the reason, such as a missing file or content-ID mismatch.

Some Broadcom articles also use:

```bash
vmkfstools -e '/vmfs/volumes/Datastore1/AppVM/AppVM-000005.vmdk'
```

On applicable ESXi versions, a healthy result is `Disk chain is consistent`. Broadcom notes that `-e` should be run with the VM powered off; an active lock on a running VM can produce a lock failure that is not evidence of chain corruption. Use `vmkfstools -qv10` for the documented current inspection flow and interpret either result with the VM's power and lock state.

These commands do not validate guest application consistency, filesystem correctness, or whether a parent was previously written incorrectly. They validate whether DiskLib can traverse the metadata and extents.

## Understand CID and parentCID

In a conventional VMFS snapshot chain, each descriptor has a content ID, or `CID`. A snapshot child records the expected content ID of its immediate parent as `parentCID`, along with a `parentFileNameHint`. In a healthy link:

```text
parent descriptor CID = child descriptor parentCID
child parentFileNameHint = actual immediate parent descriptor
```

The base normally has no parent and uses `parentCID=ffffffff`. The child does not point to a parent merely because the filename number is one lower. Follow the `parentFileNameHint` link at every level.

A mismatch can represent two materially different states for recovery purposes:

1. Descriptor metadata is inconsistent while the parent data remains unchanged.
2. Data was actually written to the parent after the child was created.

Only the first can be repaired by correcting metadata without losing the coherent history. If the parent data changed, forcing the IDs to match merely hides the safety check and joins incompatible states.

## Classify the First Broken Link

### Missing Descriptor

The small `.vmdk` descriptor is absent, but its extent might remain. Descriptor reconstruction depends on disk type, geometry, extent name, parent relationship, and datastore type. Do not generate a template from memory. Preserve the directory and use the exact Broadcom descriptor-recovery article or Support.

### Missing Extent or vSAN Object

This is a data-loss condition until proven otherwise. Do not create an empty extent with the expected name. Restore from backup or engage Broadcom and the storage team.

### Wrong parentFileNameHint

Establish whether a parent was renamed, moved, or deleted. A nearby descriptor with a plausible name is not sufficient proof. Compare sizes, UUIDs, backup history, and earlier logs.

### CID Mismatch

Determine whether anyone edited descriptors, attached an older base, reverted storage, expanded a disk, or powered a VM from a parent. Broadcom's current repair guidance limits repair to controlled cases where metadata was manually modified and data was not written to the wrong disk. When uncertain, stop.

### Failed to Lock the File

This can mean the VM is running, another host owns it, or a backup proxy holds a read-only attachment. Resolve ownership with `vmfsfilelockinfo` or the vSAN-specific lock workflow. It is not a chain-consistency conclusion.

## Prefer Recovery Over In-Place Guessing

Choose the safest available outcome:

1. **Known-good backup:** restore to a separate location and validate application data.
2. **Healthy chain with broken snapshot inventory:** use supported consolidation or clone the active leaf.
3. **Healthy powered-off chain but risky in-place commit:** clone the active leaf to a new virtual disk on a healthy datastore.
4. **Proven metadata-only CID mismatch:** use the version-specific Broadcom repair workflow with backups and a rollback copy.
5. **Missing data or uncertain parent writes:** preserve evidence and engage Broadcom Support.

Broadcom documents this clone syntax for a verified, powered-off VMFS chain:

```bash
vmkfstools -i \
  '/vmfs/volumes/SourceDS/AppVM/AppVM-000005.vmdk' \
  '/vmfs/volumes/RecoveryDS/AppVM-recovery.vmdk' \
  -d thin
```

The source must be the active leaf, not the base. The destination must have enough capacity, the filename must be unique, and the clone must be allowed to finish. This creates a new consolidated disk while leaving the original chain available for recovery. Prefer a supported vSphere whole-VM clone when that UI workflow is available.

Afterward, attach the clone through **Edit Settings > Add New Device > Existing Hard Disk** to a powered-off test or recovery VM while the original VM remains powered off. If the cloned disk must boot, match the source VM's controller type. Validate partition tables, filesystems, applications, and transaction consistency before declaring success.

## Treat Repair Commands as Last Resort

Broadcom's VCF 9.1 guidance documents `vmkfstools -x repairChain` for a narrow, controlled metadata-repair scenario. It is not a universal fix for any CID mismatch:

```bash
vmkfstools -x repairChain '/vmfs/volumes/Datastore1/AppVM/AppVM-000005.vmdk'
```

Do not run it unless the VM is powered off, the VCF 9.1 article applies, all related descriptor metadata has been backed up, and evidence shows data was not written to the wrong parent. For ESXi 7.x and 8.x, Broadcom's separate `snapshot_chain_script.sh` workflow recommends a dry run that reports discrepancies without repairing them. If Changed Block Tracking (CBT) was enabled, reset it after a supported repair as the VCF 9.1 article requires.

Avoid manual `CID` edits copied from an old forum answer. Avoid repointing the VMX to an earlier delta. Avoid creating a missing extent. Each can turn a diagnosable chain into irreversible data loss.

## Validate the Recovered Disk

Repeat `vmkfstools -qv10` on the recovered or repaired leaf. Then use vSphere to attach the disk and validate it without deleting the source chain. Check:

- guest partition and filesystem integrity;
- database or application recovery checks;
- the newest expected records and timestamps;
- absence of read-only or stale backup attachments;
- clean snapshot creation and removal on a disposable validation VM; and
- stable datastore capacity and I/O.

Retain the original chain until the service owner signs off and the backup team has produced a new verified backup. Cleanup is a separate change with an exact file list.

## Official Documentation

- [Verifying a snapshot chain and cloning a virtual disk](https://knowledge.broadcom.com/external/article/309366/verifying-a-snapshot-chain-and-cloning-a.html)
- [Locate and remediate CID and parentCID mismatches](https://knowledge.broadcom.com/external/article/368913/locate-and-remediate-cidparentcid-mismat.html)
- [Repairing broken disk chains when CID mismatch is reported](https://knowledge.broadcom.com/external/article/404894/repairing-broken-disk-chains-of-a-virtua.html)
- [Troubleshooting virtual machine snapshot descriptor problems](https://knowledge.broadcom.com/external/article/341646/troubleshooting-virtual-machine-snapshot.html)
- [Consolidating and committing snapshots in ESXi](https://knowledge.broadcom.com/external/article/316575/consolidatingcommitting-snapshots-in-vmw.html)

## Conclusion

Use `vmkfstools` to answer one precise question: can DiskLib traverse the active leaf through every parent? A missing file, CID mismatch, or lock then determines the next investigation. Clone or restore a verified chain when possible; reserve metadata repair for proven, documented cases where the parent data was never changed.
