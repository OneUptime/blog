# How Long Should You Keep an ESXi Snapshot Before It Becomes a Risk?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, Snapshot Retention, VMDK, Datastore Capacity, Performance

Description: Set an ESXi snapshot expiry based on Broadcom guidance, workload write rate, datastore headroom, and the time required for safe consolidation.

---

Broadcom's general vSphere guidance is clear: do not retain a single VMware snapshot for more than 72 hours. That is a maximum operational guardrail, not a recommended default lifetime. A high-write database or nearly full datastore can turn a snapshot into a serious risk within hours.

The useful policy is therefore **as short as the rollback decision allows, never automatically the full 72 hours**. Every snapshot should have an owner, purpose, creation time, expiry time, and enough capacity and I/O headroom to remove it safely.

## Why Risk Increases with Time

On traditional VMFS, writes after snapshot creation go to a delta. As more unique blocks change, the delta grows and the chain serves reads from more than one layer. Long or deep chains can increase I/O work, power-on time, and consolidation complexity.

Time itself is not the byte generator. Workload writes are. A quiet appliance snapshot might remain small for a day, while a database rewriting hundreds of gigabytes can create a large delta in the first hour. Retention age remains a useful control because it bounds exposure when write behavior is uncertain.

Longer retention increases the chance that:

- the datastore runs out of capacity;
- a backup proxy or failed job leaves an external lock;
- consolidation collides with another backup or migration;
- on traditional redo-log storage, a thin base must grow substantially during commit;
- online redo-log consolidation can create a helper delta whose writes consume the remaining margin;
- operators forget why the snapshot exists; and
- the snapshot is mistaken for a backup even though it depends on the base disk.

## Apply the Official Limits Correctly

Broadcom's snapshot best-practices article states:

- do not use VMware snapshots as backups;
- do not retain one snapshot for more than 72 hours;
- use only two or three snapshots for better performance; and
- a maximum of 32 snapshots is supported in a chain.

The supported maximum is not the operational target. A chain of 30 snapshots can be supported in the narrow sense yet still be costly to inspect, commit, and recover. Preventive policy should normally block or alert well before that depth.

For database VMs, Broadcom's current guidance recommends snapshots only for short operational uses such as patching or configuration rollback, kept for minutes to hours and removed as soon as validation finishes. Database-native or certified application-aware backups remain the protection mechanism.

## Set Retention by Use Case

### Pre-Patch Rollback

Create immediately before the change, validate the service, and remove it in the same maintenance window whenever possible. If application validation continues into the next business cycle, define a named owner and expiry below 72 hours.

### Short Test or Troubleshooting Checkpoint

Retain only for the test duration. Automated lab workflows should remove snapshots in cleanup even when tests fail.

### Backup Transport Snapshot

The backup application should remove it at the end of the job, generally within the backup window. Its survival until the next day is a cleanup failure to investigate, not normal retention.

### Database or High-Write VM

Use minutes to hours, with storage and application monitoring throughout. Avoid VM snapshots as the database recovery design.

### Long-Term Recovery Point

Do not stretch a snapshot to meet this requirement. Create a backup with suitable retention and an independent repository, then test restore.

## Estimate the Safe Window Before Creation

Measure the VM's write workload and available capacity on every datastore involved in its disk chains, including any datastore used by a configured snapshot working directory. A basic planning estimate for one active delta is:

```text
potential active-delta growth ≈ unique disk regions changed while that delta is active + format overhead
```

Sustained write throughput multiplied by time provides a coarse planning signal, but delta allocation follows changed disk regions, not cumulative raw bytes written. Across a chain, the same logical region can appear in more than one delta. Use historical datastore and VM write metrics from a comparable busy period.

Include:

- current free datastore capacity;
- other snapshots and thin disks growing on the datastore;
- VM swap and planned power-on demand;
- memory-state (`.vmsn`) space if the snapshot includes VM memory;
- backup and migration activity;
- vSAN policy and operational-reserve requirements; and
- headroom needed to remove or clone the snapshot.

Broadcom's large-VM guidance recommends reserving additional free datastore capacity equal to 20 to 30 percent of the VM's total virtual-disk size for snapshot growth. That is creation-planning guidance, not a guarantee that every consolidation succeeds within that amount.

## Make Expiry Part of Creation

Use a naming convention such as:

```text
CHG-4821 | owner=platform | expires=2026-08-09T01:00Z | pre-patch
```

Store the same expiry in the change record or automation system. Do not rely on an operator remembering a generic name such as `before update`.

Require these fields:

- change or incident ID;
- accountable owner;
- reason and rollback decision;
- application validation deadline;
- absolute expiry time; and
- link to the separate backup or recovery plan.

If automation creates the snapshot, its failure path must still schedule cleanup or raise an alert.

## Monitor Age, Size, and State Together

Age alone misses fast growth, and size alone misses forgotten quiet snapshots. Alert on:

- age approaching the internal limit and the 72-hour maximum;
- delta size and growth rate;
- chain depth;
- consolidation-needed state;
- datastore time-to-full;
- failed snapshot remove tasks; and
- VMDKs still attached to backup proxies.

Review Snapshot Manager, but also detect API-created or undetected snapshots. Broadcom specifically notes that third-party snapshots might not appear in Snapshot Manager and recommends periodic checks through vSphere-aware tooling, PowerCLI, Aria Operations, or the ESXi shell.

## Remove Snapshots Before They Become Emergencies

Before deletion or consolidation:

1. Confirm the intended VM and snapshot.
2. Pause competing backup and snapshot work.
3. Verify healthy storage and adequate free space on every relevant datastore.
4. Check for backup-proxy attachments and unexpected locks.
5. Schedule low write load and acceptable stun risk.
6. Use **Delete**, **Delete All**, or **Consolidate** through the vSphere Client according to the actual state.

Deleting a snapshot preserves current VM state; it does not revert. On traditional redo-log storage, **Delete** commits the selected delta to its parent, while **Delete All** commits the chain to the base disks. On ESXi 8.x and earlier, do not cancel a running deletion or consolidation. For VMs registered to ESX 9 hosts, use only the supported cancel action; powered-off consolidation can be resumed, while other canceled work must be retried. On any version, do not restart services or the host to force the operation to stop. On releases without ESX 9 progress reporting, progress can appear stuck while I/O and timestamps continue to change.

For a very large or risky traditional redo-log chain, consider a powered-off maintenance window or a supported vCenter VM clone to a healthy datastore. If cloning active-leaf VMDKs at disk level, power off the VM first and clone every current disk needed by the VM. A clone needs destination capacity and validation, but it leaves the original chain intact while a consolidated recovery copy is tested.

## Respond to an Expired Snapshot

An expired snapshot is not permission for immediate deletion. First determine why it remains:

- application validation incomplete;
- backup job failed to remove it;
- file lock blocks consolidation;
- datastore lacks headroom;
- storage is unhealthy; or
- Snapshot Manager and disk state disagree.

Escalate ownership and stop additional snapshots. Measure the delta and workload. Add storage headroom or reduce writes before committing. If a parent is missing or the chain is inconsistent, preserve all files and contact Broadcom Support.

Avoid the opposite failure too: extending retention repeatedly because removal looks risky. For non-native snapshots, delta growth normally makes later removal harder. Convert the risk into a scheduled, resourced recovery change.

## Verify Removal

After the task completes:

- the selected snapshot no longer appears;
- the consolidation warning is absent;
- each VM disk points to the expected backing;
- datastore free space stabilizes;
- no backup-proxy attachment remains; and
- the application passes its health and data checks.

Do not delete old-looking delta files as cosmetic cleanup. Prove that each is outside every VM, template, snapshot parent chain, and backup workflow before considering it orphaned.

## Official Documentation

- [Best practices for using VMware snapshots](https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html)
- [Guidance on snapshots for database virtual machines](https://knowledge.broadcom.com/external/article/426571/guidance-on-using-snapshots-for-database.html)
- [Recommendations for creating a snapshot for a large VM](https://knowledge.broadcom.com/external/article/418600/recommendations-for-creating-a-snapshot.html)
- [FAQ: Delete All Snapshots and Consolidate Snapshots Feature](https://knowledge.broadcom.com/external/article/371714/faq-delete-all-snapshots-and-consolidate.html)
- [How to calculate snapshot size and consolidation factors](https://knowledge.broadcom.com/external/article/316414/how-to-calculate-snapshot-consolidation.html)
- [Undetected snapshots in Snapshot Manager](https://knowledge.broadcom.com/external/article/316545/undetected-snapshots-in-snapshot-manager.html)

## Conclusion

Keep an ESXi snapshot only for the rollback decision, with 72 hours as a maximum guardrail rather than a target. High-write workloads need much shorter windows. Expiry metadata, growth alerts, cleanup verification, and a separate tested backup turn snapshot retention from an informal habit into a controlled operational risk.
