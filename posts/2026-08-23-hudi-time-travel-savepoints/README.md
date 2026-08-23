# Preserve Hudi Time Travel with Savepoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Time Travel, Savepoint, Data Retention, Disaster Recovery

Description: Protect selected Hudi snapshots from cleaner retention with savepoints and operate their creation, validation, rollback, and deletion safely.

---

Hudi time travel depends on older file slices remaining available. The cleaner deliberately removes obsolete versions according to commit, hour, or file-version retention, so an old timeline instant alone does not guarantee that its data files can still be read.

A savepoint is a special timeline marker that protects the files needed for one chosen commit from automatic cleaning. It lets you preserve important snapshots without setting ordinary cleaner retention high enough to keep every intermediate version.

This guide targets Apache Hudi 1.2.x and Spark SQL procedures. A savepoint is useful retention, but it is not a substitute for an independent backup or cross-region copy.

## Separate timeline history from data history

Hudi's timeline records table actions. Timeline archival keeps old action metadata manageable. Cleaning reclaims older data-file versions. These services solve different problems:

- An archived commit can remain visible as historical metadata after its old files have been cleaned.
- A file version can remain protected by a savepoint even as normal retention moves forward.
- Increasing archived timeline history does not automatically preserve time-travel data.

When a time-travel query fails for an old instant, first ask whether the required file slices still exist. Do not assume the commit disappeared simply because it moved out of the active timeline.

## Size ordinary retention first

Savepoints should protect business-significant snapshots: a month-end close, a model-training cut, the state before a risky migration, or an audited release.

Use normal cleaner policies for routine operational lookback:

- `KEEP_LATEST_COMMITS` retains file slices for a number of commits.
- `KEEP_LATEST_FILE_VERSIONS` retains a minimum number of versions per file group.
- `KEEP_LATEST_BY_HOURS` retains versions for a configured number of hours.

Set ordinary retention longer than the longest query and the maximum normal incremental-consumer delay. Savepoints then cover exceptional, longer-lived milestones rather than hundreds of arbitrary commits.

## Choose and verify the commit

List completed commits:

```sql
CALL show_commits(table => 'orders');
```

Choose a completed data commit whose snapshot has already passed business validation. Record its instant, row count, key checksum, schema, table version, and the reason for retention.

Run a time-travel query before creating the savepoint:

```sql
SELECT count(*)
FROM orders TIMESTAMP AS OF '20260823090000000';
```

The `AS OF` value can use supported Hudi instant or timestamp forms. Use the exact completed commit selected from Hudi rather than a guessed wall-clock boundary.

For a Merge-on-Read table, ensure the chosen snapshot and its log/base-file dependencies are readable with the engine and Hudi version used for recovery.

## Create the savepoint

With the Hudi Spark SQL extension:

```sql
CALL create_savepoint(
  table => 'orders',
  commit_time => '20260823090000000',
  user => 'data-platform',
  comments => 'Snapshot before customer-key migration'
);
```

Verify it:

```sql
CALL show_savepoints(table => 'orders');
```

The procedure returning `true` and the instant appearing in `show_savepoints` confirms the timeline action. Run the cleaner in a staging table, then repeat the time-travel query to prove that the selected snapshot survives beyond normal retention.

The Hudi CLI exposes equivalent savepoint creation, listing, and rollback workflows when SQL procedures are not available.

## Understand the storage cost

A savepoint prevents cleaning of file slices needed to reconstruct the protected snapshot. As the table changes, those retained files become additional storage that ordinary cleanup cannot reclaim. The cost depends on how many file groups are updated after the savepoint, not only the table's row count at creation.

Track:

- Total bytes protected by each savepoint.
- Age and business owner.
- Last successful time-travel validation.
- Hudi and table version needed to read it.
- Whether a newer savepoint supersedes it.

Do not create daily permanent savepoints without a deletion policy. For long-term archives, exporting or copying a snapshot to separately managed immutable storage may be more predictable.

## Use rollback deliberately

To restore the table timeline to a savepoint:

```sql
CALL rollback_to_savepoint(
  table => 'orders',
  instant_time => '20260823090000000'
);
```

Rollback changes the live table state and removes the effect of later commits. It is not a read-only query. Stop writers and downstream jobs, capture a fresh backup, communicate the recovery point, and verify permissions and locks before running it.

Often the safer recovery is to read the savepointed snapshot and write selected records into a new table:

```python
historical = (
    spark.read.format("hudi")
    .option("as.of.instant", "20260823090000000")
    .load(table_path)
)
```

That preserves post-savepoint commits for investigation and lets you compare or repair only affected keys. Use rollback when the requirement is genuinely to revert the whole table.

## Delete obsolete savepoints

After retention approval:

```sql
CALL delete_savepoint(
  table => 'orders',
  instant_time => '20260823090000000'
);
```

Deleting the marker does not necessarily delete every protected object immediately. It makes those versions eligible for a later cleaner run under the active policy. Confirm no legal, audit, model-reproducibility, or recovery dependency remains first.

Keep deletion auditable. Record who approved it, which newer recovery point replaces it, and the cleaner run that reclaimed data.

## Troubleshoot common failures

If savepoint creation fails:

1. Confirm the instant is a completed commit and belongs to the table.
2. Confirm its required file slices have not already been cleaned.
3. Check for pending or failed timeline operations.
4. Verify the Spark bundle matches the table version.
5. Confirm the job can write the `.hoodie` timeline and read all table partitions.

A savepoint cannot resurrect files already removed. If the desired point is already beyond cleaner retention, restore it from a separate backup or reproduce the table in a new location.

If a saved snapshot becomes unreadable after a library upgrade, treat it as a compatibility issue rather than deleting the savepoint. Hudi recommends upgrading readers before writers when table versions change. Retain a tested recovery runtime or perform a supported table upgrade.

## Official Documentation

- [Apache Hudi disaster recovery](https://hudi.apache.org/docs/disaster_recovery/)
- [Apache Hudi SQL procedures](https://hudi.apache.org/docs/procedures/)
- [Apache Hudi cleaning](https://hudi.apache.org/docs/cleaning/)
- [Apache Hudi CLI](https://hudi.apache.org/docs/cli/)
- [Apache Hudi technical specification](https://hudi.apache.org/learn/tech-specs/)

## Conclusion

Use cleaner retention for ordinary lookback and savepoints for selected durable milestones. Create them only after validating a completed commit, monitor their storage and compatibility cost, prefer read-and-repair over full rollback when possible, and delete markers through Hudi only after their recovery obligation ends.
