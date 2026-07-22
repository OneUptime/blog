# Differential vs. Incremental Backups: What Changes, and Which Restores Faster?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backup, Differential Backup, Incremental Backup, Disaster Recovery, RPO, RTO

Description: Compare differential and incremental backup chains, restore work, storage growth, and failure risk so you can choose from measured RPO and RTO requirements.

---

A differential backup contains changes since a fixed full backup. An incremental backup contains changes since the previous successful backup. That single difference determines how quickly each backup grows, how many dependencies a restore has, and how a missing recovery point affects recovery.

The terminology is not universal. Some products call a cumulative backup a differential, while others expose synthetic-full or forever-incremental recovery points that hide their internal chain. Confirm the definition in the product you operate. This guide uses the definitions in Microsoft Azure Backup's architecture documentation, then shows how they apply to native SQL Server backups.

## Compare the Two Chains

Assume a full backup on Sunday and daily backups afterward:

```text
Differential:
  Sun full <- Mon changes since Sun
           <- Tue changes since Sun
           <- Wed changes since Sun

Incremental:
  Sun full <- Mon changes since Sun <- Tue changes since Mon <- Wed changes since Tue
```

To restore Wednesday from a traditional differential sequence, restore Sunday's full and Wednesday's differential. Monday's and Tuesday's differentials are not required.

To restore Wednesday from a traditional incremental sequence, restore the full and every incremental through Wednesday in order. A managed backup service may synthesize a complete recovery point behind the scenes, but the service still has to preserve the referenced blocks or objects.

| Property | Differential | Incremental |
| --- | --- | --- |
| Change reference | Last qualifying full backup | Previous backup or recovery point |
| Typical backup size over a cycle | Grows toward the next full | Tracks only the latest interval |
| Traditional restore inputs | Full plus latest differential | Full plus every later incremental |
| Missing middle backup | Later differentials can still be usable | Later chain may be unusable |
| Network and write volume | Repeats earlier changed blocks | Usually lower |
| Restore orchestration | Simpler chain | More chain processing |

These are tendencies, not latency guarantees. Compression, deduplication, media throughput, parallel restore, database recovery, and whether the product synthesizes full recovery points can outweigh backup type.

## Why Differentials Grow

Suppose a 2 TiB data set changes by 100 GiB each day, with no overlap. The daily incremental is about 100 GiB. The differential is about 100 GiB Monday, 200 GiB Tuesday, and 300 GiB Wednesday. If the same 100 GiB is overwritten every day, a block-based differential may remain near 100 GiB because it records the current changed blocks, not every historical version.

The changed-data unit matters. SQL Server differential backups operate at extent granularity. An extent contains eight 8 KiB pages, so modifying a small value can mark a 64 KiB extent as changed. Azure VM incremental examples use 16 KiB blocks. File backup products may copy a whole file after one byte changes. Do not estimate capacity from logical application writes alone.

Measure these values from production backup history:

- bytes read from the source;
- bytes sent over the network;
- bytes written before and after compression or deduplication;
- backup duration and impact on the workload;
- restore duration, including recovery and validation.

## Which Restores Faster?

A traditional differential restore usually has fewer explicit steps: one full plus one differential. This reduces media mounts, commands, and opportunities to select the wrong member. It does not guarantee that the restore will finish sooner. A late-cycle differential can approach the size of a full backup, while an incremental platform may materialize a recovery point in parallel from deduplicated storage.

Test three cases instead of trusting the label:

1. Restore the newest recovery point during normal operations.
2. Restore the oldest retained point, which may have a different chain shape.
3. Restore after deliberately making one backup object unavailable.

Time from incident declaration until the application passes an integrity and business check. File copy completion is not the recovery time objective.

## Failure Domains and Retention

In a file-based incremental chain, losing Tuesday can make Wednesday and later incrementals unusable. A differential taken Wednesday still depends on Sunday, but not on Monday or Tuesday. The full backup is therefore a shared dependency for every differential in that cycle.

Managed services may preserve references even after the original full recovery point expires. AWS Backup, for example, documents that supported resources are stored incrementally while each retained recovery point remains capable of a full restore; it manages the underlying reference data. That is different from manually deleting a `.bak`, snapshot, or incremental file.

Apply retention through the backup product rather than deleting apparent chain members from object storage. Protect backup catalogs and encryption keys as carefully as backup payloads. Replicate or copy recovery data outside the workload's failure domain, and test restoring when the primary account, cluster, or region is unavailable.

## SQL Server Is a Special Case

Native SQL Server offers full, differential, and transaction log backups. A SQL Server differential contains changed extents since its differential base, normally the latest non-copy-only full database backup. Each differential in the series is cumulative from that base.

A transaction log backup is not simply a generic incremental data backup. Under the full or bulk-logged recovery model, log backups preserve an ordered log chain. The full recovery model enables point-in-time recovery. Under the bulk-logged recovery model, a log backup that contains bulk-logged changes can be restored only to the end of that backup, not to a point within it. A production SQL Server plan commonly combines:

```text
weekly full
daily differential
transaction log every few minutes
```

For a Thursday 14:37 recovery under the full recovery model, restore the weekly full with `NORECOVERY`, the latest valid differential before 14:37 with `NORECOVERY`, and every required log backup after that differential in log-sequence order. Specify the same `STOPAT` target on every `RESTORE LOG`, keep the database unrecovered through the log sequence, and recover it after applying the log backup that contains 14:37. The differential reduces the number of log backups that must be replayed; it does not replace them.

## Choose From RPO and RTO

Use differential backups when shorter, simpler restore chains are valuable and repeatedly copying changes since the full fits the backup window. Use incremental backups when network and storage efficiency dominate and the platform reliably manages, validates, and compacts the chain.

Make the decision with a restore experiment:

- Define the maximum acceptable data loss, or RPO.
- Define the maximum end-to-end recovery time, or RTO.
- Generate realistic daily change, including index maintenance and large-file rewrites.
- Test restores at the beginning and end of a backup cycle.
- Inject a missing or corrupt recovery point.
- Include catalog recovery, key retrieval, data validation, and application startup.
- Set the full or synthetic-full cadence from measured restore time and differential growth.

The best design may use both approaches at different layers. A storage service can maintain incremental blocks while a database creates native full, differential, and log backups. What matters is that operators know the actual dependency graph and have demonstrated that it meets the recovery objective.

## Official Documentation

- [Microsoft Azure Backup architecture and backup types](https://learn.microsoft.com/en-us/azure/backup/backup-architecture)
- [Microsoft Azure Backup recovery points and incremental storage](https://learn.microsoft.com/en-us/azure/backup/manage-recovery-points)
- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server backup overview](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-overview-sql-server?view=sql-server-ver17)
- [AWS Backup incremental backup behavior](https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-backup.html)
