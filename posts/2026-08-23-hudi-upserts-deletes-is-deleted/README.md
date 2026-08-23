# Apply Hudi Upserts and Deletes with _hoodie_is_deleted

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Deletes, Upserts, Change Data Capture, Spark

Description: Apply mixed CDC upserts and hard deletes in one Hudi batch with a typed _hoodie_is_deleted control column and deterministic ordering.

---

Hudi can apply inserts, updates, and deletes through one `upsert` write when each incoming row contains a Boolean `_hoodie_is_deleted` field. Rows where it is `true` are treated as deletes. Rows where it is `false` or null are normal upserts.

This is especially useful for CDC micro-batches that already mix operation types. It avoids splitting one source checkpoint into separate upsert and delete commits, while preserving one ordering and retry boundary.

This guide targets Apache Hudi 1.2.x.

## Build one stable CDC schema

Use the same fields for all operations, including:

- Record-key columns.
- Partition-path columns.
- Ordering fields.
- `_hoodie_is_deleted` as Boolean.
- Business columns, nullable for tombstones if the source does not carry them.

Example source events:

```json
{"order_id":"o-1","event_date":"2026-08-23","source_lsn":101,"status":"PAID","_hoodie_is_deleted":false}
{"order_id":"o-2","event_date":"2026-08-23","source_lsn":102,"status":null,"_hoodie_is_deleted":true}
```

Do not encode the flag as the string `"true"` and rely on implicit casting. A null Boolean means upsert according to the official write documentation, so reject malformed or missing operation mappings before they reach Hudi.

In PySpark:

```python
from pyspark.sql import functions as F

prepared = (
    cdc_events
    .withColumn(
        "_hoodie_is_deleted",
        F.when(F.col("op") == "d", F.lit(True))
         .when(F.col("op").isin("c", "u", "r"), F.lit(False))
         .otherwise(F.lit(None).cast("boolean"))
    )
)

invalid = prepared.where(F.col("_hoodie_is_deleted").isNull())
if invalid.limit(1).count():
    raise ValueError("Unsupported CDC operation")
```

Map the source's create, update, snapshot-read, and delete codes explicitly.

## Keep keys and partitions on tombstones

A delete must locate the existing Hudi record. Include its record key and, for a non-global index, the same partition path used by the stored row.

If the source delete event contains only a key, use one of these designs:

- Use a global index that can find the key across partitions.
- Enrich tombstones from a key-to-partition state store.
- Carry the original partition value in the upstream CDC envelope.
- Use a non-partitioned table when the workload justifies it.

Guessing a partition from delete arrival time can leave the old row in place and create misleading results in another partition.

Composite keys must be generated identically for upserts and tombstones. Preserve normalization, field order, and null handling.

## Configure deterministic ordering

Late deletes and retries need the same source ordering as updates:

```python
hudi_options = {
    "hoodie.table.name": "orders",
    "hoodie.datasource.write.operation": "upsert",
    "hoodie.datasource.write.recordkey.field": "order_id",
    "hoodie.datasource.write.partitionpath.field": "event_date",
    "hoodie.table.ordering.fields": "source_lsn",
    "hoodie.write.record.merge.mode": "EVENT_TIME_ORDERING",
}

prepared.write.format("hudi").options(**hudi_options).mode("append").save(table_path)
```

With event-time ordering, an old tombstone should not delete a newer stored row. An old update also loses to a newer delete while both versions coexist during the same merge. However, `_hoodie_is_deleted` performs a hard delete. After that delete is materialized and no stored row carries its source sequence, a stale upsert in a later commit can be treated as a new insert and recreate the key. Use a monotonic source position such as LSN or transaction sequence, not ingestion time, but do not treat the Hudi table as a durable deleted-key registry.

The ordering field must be present on tombstones. Giving every delete zero or null ordering can make its relation to existing records ambiguous.

Hudi persists merge mode as table configuration. Do not change it between batches or use different settings in compaction and readers.

## Understand batch behavior

Within one input batch, the same key can appear several times. For example, an update at sequence 200 followed by a delete at 201 should reduce to the delete winner. Hudi's ordering fields determine the winner during pre-combination and record merging.

Test all combinations:

| Existing state | Incoming operations | Expected snapshot |
| --- | --- | --- |
| Missing | Upsert 100 | Row at 100 |
| Row 100 | Delete 101 | Missing |
| Missing | Delete 101 | Missing |
| Row 105 | Delete 101 | Row at 105 |
| Missing after hard delete 105 | Upsert 101 in a later commit | Row at 101 unless the pipeline rejects it |
| Missing after hard delete 105 | Upsert 106 in a later commit | Row at 106 |

The resurrection rule is a business choice, but ordering fields can apply it only while Hudi has both versions to compare. If a key should never return after deletion, retain a soft-delete row with its source sequence or reject stale events through an upstream tombstone registry. A custom merger can enforce the policy only if its design also retains or retrieves durable delete state.

## Verify the committed snapshot

Before the write, save affected key counts. After it:

```python
snapshot = spark.read.format("hudi").load(table_path)

snapshot.where("order_id IN ('o-1', 'o-2')").select(
    "_hoodie_record_key",
    "_hoodie_partition_path",
    "_hoodie_commit_time",
    "order_id",
    "source_lsn",
    "status",
).show(truncate=False)
```

Deleted keys should not appear in the current snapshot. Re-run the same batch and confirm the result remains unchanged.

For audit requirements, use Hudi CDC queries on a supported COW table or retain the upstream CDC log. A snapshot hides deleted rows and does not by itself provide every deletion event.

## Know what hard delete means physically

Hudi documents `_hoodie_is_deleted` as a hard-delete mechanism. The row disappears from the logical snapshot, and later compaction applies deletes for MOR file slices.

Because Hudi uses MVCC, older file versions can remain until cleaning, and savepoints or backups can retain them longer. Do not claim immediate byte erasure from S3 solely because a snapshot query no longer returns the row. Align cleaner, savepoint, backup, and replication retention with privacy requirements.

## Troubleshoot missing deletes

If a row remains:

1. Confirm the flag is Boolean true.
2. Compare the materialized record key.
3. Compare the stored and incoming partition paths.
4. Check the chosen global or non-global index.
5. Confirm the tombstone ordering value is newer.
6. Read through a Hudi snapshot reader, not raw Parquet.
7. Inspect write statuses and the completed timeline commit.

If an older update recreates a key after a hard delete was materialized, that is not necessarily a merge-mode failure because the stored delete version may no longer exist. Enforce durable non-resurrection with a retained soft-delete row or an upstream tombstone registry. Compaction cannot reconstruct a hard-delete ordering value that is no longer present.

## Official Documentation

- [Apache Hudi batch writes and deletes](https://hudi.apache.org/docs/writing_data/)
- [Apache Hudi write operations](https://hudi.apache.org/docs/write_operations/)
- [Apache Hudi record merger](https://hudi.apache.org/docs/record_merger/)
- [Apache Hudi key generation](https://hudi.apache.org/docs/key_generation/)
- [Apache Hudi cleaning](https://hudi.apache.org/docs/cleaning/)

## Conclusion

Use a Boolean `_hoodie_is_deleted` field to keep mixed CDC changes in one upsert commit. Tombstones still need the exact key, correct partition scope, and a monotonic ordering value. Validate retries and late events, add durable delete state outside hard-delete snapshots when stale events must never resurrect a key, and treat logical deletion separately from physical retention.
