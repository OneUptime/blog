# Handle Late CDC Events in Hudi Without Stale Overwrites

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Change Data Capture, Event-Time Ordering, Record Merging, Spark

Description: Prevent late or retried CDC events from overwriting newer Hudi rows by using source sequence fields and event-time merge semantics.

---

Distributed CDC pipelines rarely deliver every change in source order. Kafka retries, partition rebalances, backfills, network delay, and multi-region replication can make an older database event arrive in a later Hudi commit. If merge behavior follows arrival or commit time, stale data can overwrite current business state.

Apache Hudi 1.2.x addresses this with `EVENT_TIME_ORDERING`. Despite its name, the ordering value does not have to be a wall-clock event timestamp. A database log sequence number or transaction position is usually safer.

## Choose an ordering value that reflects source truth

For each record key, the value should be:

- Monotonically increasing for every source mutation.
- Present on inserts, updates, and deletes.
- Comparable using a stable Spark type.
- Preserved through retries and replays.
- Unique or paired with a deterministic tie breaker.

Examples include PostgreSQL LSN converted into a consistently comparable representation, MySQL binlog file and position normalized into ordered fields, or an application entity version.

Ingestion time is not source order. A late event receives a newer ingestion timestamp and would incorrectly win. A business `updated_at` timestamp can also collide or move backward. Use it only when the source guarantees its ordering semantics.

If events for one key can come from independent shards, verify that their positions are comparable. A sequence local to shard A does not necessarily order an event from shard B.

## Configure the table merge contract

```python
hudi_options = {
    "hoodie.table.name": "orders",
    "hoodie.datasource.write.operation": "upsert",
    "hoodie.datasource.write.recordkey.field": "tenant_id,order_id",
    "hoodie.datasource.write.keygenerator.type": "COMPLEX",
    "hoodie.datasource.write.partitionpath.field": "event_date",
    "hoodie.table.ordering.fields": "source_lsn,event_seq",
    "hoodie.write.record.merge.mode": "EVENT_TIME_ORDERING",
}
```

When ordering fields are configured, Hudi infers event-time ordering by default, but setting the mode explicitly makes the table contract clear. Hudi compares multiple fields in order; if `source_lsn` ties, `event_seq` breaks the tie.

Use numeric types where possible. If positions are strings, make sure lexical order matches source order. For example, `"100"` sorts before `"99"` lexically, so a raw variable-width decimal string is unsafe.

Hudi persists the merge mode in `.hoodie/hoodie.properties`. The record-merger documentation warns against changing it after table creation, because writes, MOR snapshot reads, and compaction must all produce the same winner.

## Apply full CDC rows

Normalize upstream events into one schema:

```python
from pyspark.sql import functions as F

normalized = (
    raw
    .withColumn("source_lsn", F.col("source_lsn").cast("long"))
    .withColumn("event_seq", F.col("event_seq").cast("long"))
    .withColumn(
        "_hoodie_is_deleted",
        F.when(F.col("op") == "d", F.lit(True)).otherwise(F.lit(False))
    )
)
```

Reject null keys, partitions, and ordering values. Sending a null version into production and hoping Hudi applies a desired null ordering is not a deterministic data contract.

For partial-update CDC, a newer row containing only changed columns can null out untouched fields if it is treated as a full record. Either reconstruct full source state before Hudi, use a documented partial-update mode supported by the exact release, or implement a custom record merger. Do not conflate field-level merge with event ordering.

## Handle deletes and resurrection

A delete is another version of the same key. Give its tombstone the source sequence:

```json
{"order_id":"o-7","source_lsn":510,"_hoodie_is_deleted":true}
```

If an update at 509 and the delete at 510 coexist during a merge, the delete wins. After the hard delete is materialized and no stored row carries sequence 510, however, an update at 509 in a later commit can be treated as an insert and recreate the row. An update at 511 can also recreate it under ordinary latest-sequence semantics. If deleted keys must never be reused, retain a soft-delete row with sequence 510 or enforce the policy in the source or an external tombstone registry. `EVENT_TIME_ORDERING` alone is not a durable deleted-key registry.

For non-global indexes, tombstones also need the original partition path. If a record's partition can change, use a global index or enrich CDC events with stored location. Ordering does not help Hudi find a row in the wrong partition.

## Do not rely on input sorting

Sorting one micro-batch by sequence helps local processing but does not order it against previous or future batches. Similarly, Kafka partition order applies only within one partition.

Hudi merge semantics need to be correct in all paths:

- Combining duplicate keys within the incoming write.
- Merging against stored COW records.
- Reading base and log records in MOR snapshots.
- Running MOR compaction.

That is why table-level merge mode matters more than a Spark `orderBy`.

## Test adversarial arrival orders

Write versions 100, 102, and 101 in these sequences:

```text
100 -> 102 -> 101
102 -> 100 -> 101
101 and 102 in one batch, then retry 100
delete 103 and update 102 in one input batch
materialize hard delete 103, then submit update 102 in a later commit
```

After each of the first three sequences, the snapshot must show version 102. When delete 103 and update 102 coexist, the delete must win. After delete 103 has been materialized, a later update 102 can recreate the row unless an upstream or retained-tombstone guard rejects it. Test both outcomes explicitly, and run the merge cases on the initial write path and after compaction if the production table is MOR.

Query:

```sql
SELECT
  _hoodie_record_key,
  _hoodie_partition_path,
  _hoodie_commit_time,
  order_id,
  source_lsn,
  status
FROM orders
WHERE order_id = 'o-7';
```

The Hudi commit time may be newer for a late event, but the business row's `source_lsn` must not regress.

## Monitor stale-event behavior

Count events whose source ordering value is below the stored or batch maximum. A sudden rise can indicate a stuck CDC shard, a replay, or a source failover.

Track:

- Late-event rate and maximum lateness.
- Null or unparsable sequence values.
- Ties resolved by secondary fields.
- Rows rejected for missing partition location.
- Key regressions found by periodic snapshot checks.
- Merge and compaction errors.

Retain the original source coordinates with the row or commit metadata for diagnosis. A transformed event timestamp alone is not enough to trace a stale overwrite.

## Avoid deprecated payload assumptions

Older Hudi guides use custom `HoodieRecordPayload` classes and `hoodie.datasource.write.precombine.field`. Hudi 1.1 deprecated payload-based merging in favor of engine-native record mergers and merge modes. Existing payloads remain for compatibility, but new Hudi 1.2 designs should use `hoodie.table.ordering.fields` and a merge mode unless specialized field-level logic requires a custom merger.

## Official Documentation

- [Apache Hudi record merger](https://hudi.apache.org/docs/record_merger/)
- [Apache Hudi write operations](https://hudi.apache.org/docs/write_operations/)
- [Apache Hudi key generation](https://hudi.apache.org/docs/key_generation/)
- [Apache Hudi indexes](https://hudi.apache.org/docs/indexes/)
- [Apache Hudi technical specification](https://hudi.apache.org/learn/tech-specs/)

## Conclusion

Prevent stale overwrites by ordering each key with a monotonic source sequence and persisting `EVENT_TIME_ORDERING` as the table merge contract. Carry that sequence on deletes, keep partition lookup correct, and reject ambiguous values. When a hard-deleted key must never reappear, retain delete state or enforce an upstream guard, then test both merge-time ordering and post-delete arrival behavior.
