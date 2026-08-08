# ESXi Snapshots vs Backups: What Can Each One Actually Recover?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, Snapshots, Backups, Disaster Recovery, VADP, Data Protection

Description: Choose ESXi snapshots or backups by the failure they can recover, their dependency on source storage, and the consistency the application requires.

---

An ESXi snapshot and a backup can both expose a past point in time, but they solve different problems. A snapshot is a short-lived change mechanism tied to the VM's existing virtual disks and datastore. A backup is a data-protection copy created and retained by a backup system, ideally in a separate failure domain.

That distinction determines recovery. A snapshot can make a tested patch rollback fast. It cannot recover the VM after the base VMDK or datastore is lost. A backup can recover from source-storage loss only if its backup data, any metadata, credentials, or encryption keys required to use it, and the restore path remain available and usable. Prior validation provides evidence that those dependencies work.

## What an ESXi Snapshot Contains

On a traditional VMFS datastore, taking a snapshot preserves a point in the virtual disk chain and redirects subsequent writes to a delta. Reads can come from the active delta and its parents. The snapshot depends on the base disk and every required parent in that chain.

Snapshot options can also capture:

- VM memory, allowing a revert toward the captured execution state; and
- guest quiescing through VMware Tools, asking the guest to flush eligible filesystem or application state.

Neither option turns the snapshot into an independent backup. A memory snapshot adds a potentially large state file and can lengthen snapshot operations. Quiescing depends on guest and application support and can fail or produce only crash-consistent state. For databases, Broadcom recommends native database backup tools or certified application-aware backup solutions rather than VMware snapshots as the protection mechanism.

On vVols, snapshot implementation is offloaded to the array, and vSAN represents data as objects rather than conventional flat files. The implementation differs, but the operational role remains short-term point-in-time control, not durable independent retention.

## What Revert, Delete, and Consolidate Mean

**Revert** changes the VM to the selected snapshot state. Changes made after that point on the active path are no longer the VM's current state. It is a recovery action with intentional data loss after the snapshot time.

**Delete** does not roll the VM back. It commits the snapshot's changes into its parent while keeping the current VM state. **Delete All** commits the chain toward the base. **Consolidate** merges residual delta files when snapshot inventory and storage are inconsistent.

These terms matter during an incident. Selecting Delete when the intent was Revert preserves current state. Selecting Revert when the intent was cleanup can discard legitimate writes.

## What a Snapshot Can Recover

A healthy, recent snapshot is useful for:

- reverting a VM after a failed operating-system or application change;
- short test cycles where the complete VM state can return to a checkpoint;
- creating a stable point for a backup product to read through VADP; and
- limited forensic comparison while the underlying chain remains intact.

It can be fast because it does not copy the complete VM when created. That advantage is also its dependency: the delta does not contain all base data.

A VM snapshot alone normally cannot provide granular database point-in-time recovery, long retention, an off-site copy, immutable protection, or survival of source datastore destruction. Its exact guest consistency must be established from the selected snapshot options and application behavior.

## What a Backup Can Recover

Backup capability depends on the product and policy, so verify rather than infer. A vSphere image-level backup may support:

- full-VM restore to the same or alternate infrastructure;
- virtual-disk or file-level restore;
- application-item or transaction-aware recovery when the required integration is configured;
- longer retention and multiple restore points; and
- recovery after source host or datastore loss when backup data is independent.

A backup job often uses a temporary VMware snapshot to obtain a stable disk view. That does not make the resulting backup merely a snapshot. The backup product reads data into its repository and should then remove the temporary snapshot. A failed cleanup can leave deltas and a consolidation warning even when backup data was written successfully.

Do not assume a green job proves recoverability. Test a restore, validate the guest and application, and confirm that credentials, encryption keys, catalogs, and repository data needed for restore are protected.

## Compare Failure Scenarios

| Failure | Snapshot alone | Independent validated backup |
| --- | --- | --- |
| Bad patch discovered quickly | Fast VM-level revert | Restore works but is normally slower |
| Accidental guest file deletion | Only by reverting the whole VM state, unless another tool extracts it | File-level restore if product supports it |
| Database logical corruption | Revert may lose all later transactions and may lack application consistency | Application-aware or native database recovery can offer finer control |
| Base VMDK deleted | Cannot reconstruct the missing base | Can restore if the VMDK data is in the backup |
| Datastore destroyed | Snapshot chain is lost with it | Can restore when repository is outside that failure domain |
| Ransomware reaches vSphere storage | Snapshots on affected storage may be deleted or encrypted | Protected immutable or isolated backup may survive |
| Host boot device fails | VM snapshot is irrelevant if VM data survives | Host rebuild plus VM restore or re-registration, depending on data state |
| Region or site loss | Local snapshot is unavailable | Off-site copy can meet site-recovery design |

The backup column is conditional. A repository on the same failed array, an expired restore point, or an untested encrypted backup cannot deliver those outcomes.

## Choose by RPO and Failure Domain

Define the recovery-point objective and the failures in scope. A pre-change snapshot can offer an RPO of the change start for a narrow rollback window. It does not replace scheduled backups that retain multiple points across days or weeks.

Map dependencies explicitly:

```text
snapshot recovery depends on:
VM configuration + selected snapshot disk state + every required parent + datastore(s) + usable ESXi access

backup recovery depends on:
backup data + required metadata/catalog + required credentials/keys + restore compute/storage/network + workable restore procedure
```

For critical applications, add native database or application backups when VM-level crash consistency cannot meet the recovery objective. A whole-VM restore and a database transaction restore are different controls.

## Use Snapshots Safely for Change Rollback

Before a planned change:

1. Confirm a separate valid backup exists for failures beyond rollback.
2. Verify datastore capacity on every disk location.
3. Record whether memory and guest quiescing are needed and supported.
4. Name the snapshot with owner, purpose, and automatic expiry time.
5. Measure baseline application health.
6. Apply the change and validate promptly.
7. Delete the snapshot as soon as the rollback decision is complete.

Broadcom recommends retaining a single VMware snapshot for no more than 72 hours and using only two or three snapshots for better performance, even though up to 32 in a chain are supported. High-write database snapshots should normally live for minutes to hours, not for the entire maximum window.

Do not increase a virtual disk while snapshots exist. Do not cancel an active deletion or consolidation, and do not use snapshots as an archive.

## Build Backups Around Restore Outcomes

For each workload, document:

- protected disks and any exclusions;
- application-aware or crash-consistent mode;
- schedule and retention;
- repository failure domain and immutability controls;
- encryption-key ownership and recovery;
- alternate-host and alternate-datastore restore support;
- file, VM, and application restore procedures; and
- last successful restore test with measured RPO and RTO.

Include disks that VM snapshots cannot protect, such as configurations that use physical-mode RDMs or SCSI bus sharing. Broadcom documents snapshot restrictions for these devices; guest-based or application-native backup may be required.

## Validate After Every Backup Window

Check both backup and vSphere state:

- backup job and verification succeeded;
- no temporary snapshot remains unexpectedly;
- no consolidation-needed warning exists;
- no production VMDK remains attached to a proxy;
- datastore growth returned to baseline; and
- the required restore point appears in the catalog.

Periodically restore into an isolated network and validate application data. A test should exercise the same credentials and keys required during a real incident.

## Official Documentation

- [Best practices for using VMware snapshots](https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html)
- [Guidance on snapshots for database virtual machines](https://knowledge.broadcom.com/external/article/426571/guidance-on-using-snapshots-for-database.html)
- [Understanding virtual machine snapshots](https://knowledge.broadcom.com/external/article/342618/understanding-virtual-machine-snapshots.html)
- [FAQ: Delete All Snapshots and Consolidate Snapshots Feature](https://knowledge.broadcom.com/external/article/371714/faq-delete-all-snapshots-and-consolidate.html)
- [Unable to use snapshots with bus sharing](https://knowledge.broadcom.com/external/article/311074/unable-to-use-snapshots-or-perform-a-bac.html)
- [Third-party backup troubleshooting responsibility](https://knowledge.broadcom.com/external/article/372500/unable-to-backup-a-virtual-machine-using.html)

## Conclusion

Use an ESXi snapshot as a short-lived rollback mechanism that remains dependent on its source disk chain. Use backups for retained, testable recovery across larger failure domains, with application-aware protection where required. The resilient design uses both for their proper roles and verifies that every temporary backup snapshot is removed.
