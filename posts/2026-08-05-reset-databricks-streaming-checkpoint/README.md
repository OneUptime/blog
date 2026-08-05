# Reset a Databricks Streaming Checkpoint Without Data Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Structured Streaming, Checkpointing, Delta Lake, Auto Loader, Apache Kafka, Data Reliability

Description: A source-to-sink runbook for replacing a Structured Streaming checkpoint without silently skipping, replaying, or duplicating production data.

---

Deleting a Structured Streaming checkpoint is not a cache clear. The checkpoint is the query's recovery contract. It records source offsets, committed micro-batches, state-store data, configuration metadata, and a unique query identity. Databricks documents the consequence plainly: deleting the checkpoint or choosing a new checkpoint path makes the next run begin fresh.

That can be the right recovery for a corrupted checkpoint or an intentionally incompatible query change. It is unsafe until you define where every source should resume and how every sink will handle the overlap. The reset boundary must be proved from durable source and sink state, not guessed from the last successful job timestamp.

## Prefer Recovery Over Reset

First determine whether the existing checkpoint is truly unusable. A restart from the same path is the normal recovery mechanism for driver failures and transient infrastructure errors. Rate-limit changes, trigger-interval changes, and many stateless filter changes can reuse an existing checkpoint.

A new checkpoint is generally required when you change the number or type of sources, a subscribed Kafka topic or Auto Loader input path, the output sink type, a stateful operator type, or the state schema. By default, Spark identifies sources by their positions in the query plan, so reordering sources also breaks checkpoint compatibility.

Databricks Runtime 18.2 and above can opt into source evolution. You must set `spark.sql.streaming.queryEvolution.enableSourceEvolution` before defining the query and give every streaming source a unique `.name()` containing only letters, digits, and underscores. Source evolution then supports reordering, adding, or removing named sources across restarts. Enabling it requires a fresh checkpoint, cannot later be disabled for that checkpoint, and permanently removes a source name if that source is removed. Renaming a source is therefore a remove-and-add operation, and the new name starts from the beginning.

Do not reset merely because a batch is slow, the backlog is high, or the query failed once. A reset discards the exact evidence needed to resume safely.

## Stop the Query and Freeze the Evidence

Stop the streaming job before collecting the boundary. Do not delete or rename anything yet. Record:

- the checkpoint URI and source path or topic configuration;
- the sink table or external destination;
- the last successful job run and query progress payload;
- the current source retention window;
- the sink's latest committed Delta version and business high-water mark;
- the query code, runtime version, access mode, and state-store provider;
- whether the query is stateless, stateful, or uses `foreachBatch`.

For a Delta sink, capture its history:

```sql
DESCRIBE HISTORY prod.bronze.events;

SELECT
  max(source_event_time) AS max_event_time,
  max(kafka_offset) AS max_recorded_offset,
  count(*) AS rows,
  count(DISTINCT event_id) AS distinct_event_ids
FROM prod.bronze.events;
```

The second query is useful only if those source coordinates were deliberately written into the sink. A timestamp alone is not an exact Kafka boundary because partitions advance independently and events can arrive out of order.

For Auto Loader, use the supported checkpoint inspection function:

```sql
SELECT path, source_id, discovery_time, commit_time, ingestion_state
FROM cloud_files_state('/Volumes/ops/checkpoints/events')
ORDER BY discovery_time DESC;
```

`source_id` is part of the documented result schema and is `0` for a query with one cloud-storage source. The discovery, commit, and ingestion-state fields require a sufficiently recent runtime, and some are populated only for streams processed on Databricks Runtime 18.2 and above or on 16.4 and above with `cloudFiles.cleanSource` enabled. Treat a null state according to the function's version-specific rules.

For Delta sources, record source table versions and retention settings:

```sql
DESCRIBE HISTORY prod.raw.source_events;
SHOW TBLPROPERTIES prod.raw.source_events;
```

Make a recoverable copy of the old checkpoint if organizational policy permits it. Keep it read-only. Do not edit individual offset, commit, or state files.

## Choose One Reset Strategy

There are three defensible patterns.

### Full Rebuild

Use a new checkpoint and a new or empty target, then replay all available input. This is the simplest correctness model because source and sink both start from the same logical beginning. It is appropriate when the data volume is manageable and all required source history remains available.

Never full-replay into an existing append-only sink unless it deduplicates by a stable business key. Exactly-once guarantees from the old query do not extend to a new query identity.

### Resume at a Proven Fence

Keep the existing target, start the new query at the first source record not represented in that target, and make the sink idempotent across any conservative overlap. This requires exact source coordinates per partition, table version, or file.

This pattern is common for Kafka and change data feed. It is unsafe when the sink does not retain enough lineage to derive a source fence.

### Blue-Green Rebuild

Run a new query with a new checkpoint into a shadow target. Reconcile old and new outputs over a fixed interval, then switch readers or rename views. This costs more but gives the cleanest rollback and is usually the safest approach for a stateful query whose state cannot be reconstructed in place.

## Source Rules Are Different

### Kafka

`startingOffsets`, `startingTimestamp`, and related Kafka options apply only when a new query starts. A resumed query ignores them and uses checkpointed offsets. A reset therefore activates these options again.

For a complete rebuild:

```python
kafka_source = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", kafka_servers)
    .option("subscribe", "orders")
    .option("startingOffsets", "earliest")
    .option("failOnDataLoss", "true")
    .load()
)
```

For a fenced restart, supply a JSON offset for every known partition:

```python
starting_offsets = '''{
  "orders": {"0": 918224, "1": 901117, "2": 933508}
}'''

kafka_source = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", kafka_servers)
    .option("subscribe", "orders")
    .option("startingOffsets", starting_offsets)
    .option("failOnDataLoss", "true")
    .load()
)
```

Offsets must still exist in Kafka. If retention has removed them, the checkpoint cannot recreate those records. Do not set `failOnDataLoss=false` merely to force startup; that converts a visible gap into silent loss. Restore from an archive, select a later explicitly accepted fence, or rebuild from another durable source.

### Auto Loader

Auto Loader stores file-level state in the checkpoint. A new checkpoint forgets which paths the old stream processed. Depending on first-run options and source contents, it can discover historical files again.

Use one of these approaches:

- Full rebuild into a fresh table from all retained source files.
- Start a fresh stream only for files after an explicit source boundary, then deduplicate overlap by immutable file path and record key.
- Query `cloud_files_state` from the old checkpoint and reconcile its committed paths with file metadata stored in Bronze.

Do not rely only on `includeExistingFiles=false` as a recovery fence. It is evaluated when the stream first starts, and file creation, notification, and discovery behavior must still match the intended cutover. Auto Loader also does not guarantee file processing order.

### Delta Table Source

A fresh Delta stream can use `startingVersion` or `startingTimestamp`. If neither is supplied, a new stream initially processes the current table snapshot as inserts and then follows later changes.

For a change data feed source whose target includes changes through version 75, start at 76:

```python
changes = (
    spark.readStream
    .option("readChangeFeed", "true")
    .option("startingVersion", 76)
    .table("prod.raw.orders")
)
```

The starting version must still be available. Delta source streams must run within the source table's retention window. Databricks documents default windows of seven days for data files removed by `VACUUM` and 30 days for transaction-log history. If the required files or versions are gone, perform a full refresh from available truth instead of ignoring missing files.

## Sink Semantics Decide Whether Replay Is Safe

### Native Delta Streaming Sink

A Delta streaming sink uses the transaction log with the query checkpoint to provide exactly-once processing. Once the checkpoint is replaced, treat the new stream as a new writer. A replayed input range can create business duplicates even though each new micro-batch commits atomically.

Prefer a new target for a full rebuild. If writing into an existing table, use deterministic keys and an idempotent merge, or prove that the new source fence begins after the old sink's last record.

### `foreachBatch`

Databricks specifies at-least-once guarantees for `foreachBatch`. The callback must implement idempotency. A Delta write can use `txnAppId` and monotonically increasing `txnVersion` values to ignore a repeated batch:

```python
reset_epoch = "orders-ingest-reset-2026-08-05"

def write_batch(batch_df, batch_id):
    (
        batch_df.write
        .format("delta")
        .mode("append")
        .option("txnAppId", reset_epoch)
        .option("txnVersion", batch_id)
        .saveAsTable("prod.bronze.orders")
    )
```

Use a new `txnAppId` after deleting a checkpoint because a new checkpoint starts batch IDs again at zero. Reusing the old application ID can make Delta interpret new batches as transactions it has already seen and skip them.

Transaction IDs prevent duplicate re-execution of the same new-query batch. They do not deduplicate source records that overlap with the old query. For that, merge on stable event keys or retain a source-coordinate ledger.

For external sinks, define the corresponding idempotency key and commit protocol. If the API, database, or message sink cannot make writes idempotent, use a shadow destination and controlled cutover.

## Stateful Queries Need More Than Offsets

Aggregations, stream-stream joins, deduplication, and custom stateful operators store state in the checkpoint. Resetting removes that state. Starting at the old latest offset produces a numerically incomplete result because future records are processed without the historical groups, timers, join rows, or deduplication keys.

Choose one of the following:

- replay enough retained history to rebuild the state into a shadow target;
- initialize supported stateful logic from an authoritative snapshot when the API explicitly supports initial state;
- rebuild the complete result in batch and start the stream from the corresponding source fence;
- accept and document a new semantic epoch if historical continuity is not required.

Changing grouping keys, aggregate types, join keys, state schema, or timeout type is not compatible with an existing checkpoint. A new checkpoint is technically necessary, but it does not make the new semantics historically correct by itself.

## Execute the Reset as a Controlled Cutover

Use this sequence:

1. Stop the old query and prevent overlapping writers.
2. Capture source positions, sink history, checkpoint evidence, code version, and row-count baselines.
3. Verify source retention covers the selected replay or resume boundary.
4. Make the new query's checkpoint path unique. Do not reuse a partially deleted directory.
5. Configure explicit new-query starting options for every source.
6. Configure a fresh target, deterministic merge, or other idempotent sink behavior.
7. Run with a bounded trigger such as `AvailableNow` when the source supports it, so the recovery interval can be reviewed.
8. Reconcile counts, keys, offsets, null rates, and business totals over the overlap.
9. Start the normal schedule only after the fence is proved.
10. Retain the old checkpoint until the rollback window closes.

A representative new path makes the recovery epoch visible:

```python
new_checkpoint = "/Volumes/ops/checkpoints/orders/reset_2026_08_05_v1"

(
    transformed.writeStream
    .option("checkpointLocation", new_checkpoint)
    .trigger(availableNow=True)
    .toTable("recovery.bronze.orders_shadow")
)
```

## Validate for Both Gaps and Duplicates

At minimum, compare:

- source records by partition and offset or Delta version;
- target distinct keys and total rows;
- minimum and maximum event time, with late-arrival allowances;
- sums or counts for stable business dimensions;
- duplicate keys across the old/new boundary;
- stateful output for windows spanning the reset;
- rejected, rescued, and dead-letter records.

Do not declare success because the job is green. A fresh query can run successfully while starting from Kafka `latest`, skipping all retained backlog. It can also run successfully while replaying every Auto Loader file into an append sink.

## Official Documentation

- [Structured Streaming checkpoints](https://docs.databricks.com/aws/en/structured-streaming/checkpoints)
- [Recovering Structured Streaming queries with checkpointing](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#recovering-from-failures-with-checkpointing)
- [Structured Streaming and Kafka integration](https://spark.apache.org/docs/latest/streaming/structured-streaming-kafka-integration.html)
- [Delta Lake table streaming reads and writes](https://docs.databricks.com/aws/en/structured-streaming/delta-lake)
- [Use change data feed on Databricks](https://docs.databricks.com/aws/en/tables/features/change-data-feed)
- [What is Auto Loader?](https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/)
- [`cloud_files_state` table-valued function](https://docs.databricks.com/aws/en/sql/language-manual/functions/cloud_files_state)
- [Use `foreachBatch` to write to arbitrary data sinks](https://docs.databricks.com/aws/en/structured-streaming/foreach)

## Conclusion

A safe checkpoint reset aligns three boundaries: what the source can still replay, what the sink has durably committed, and what state the query needs for correct future results. Preserve the old evidence, choose a full rebuild, proven fence, or blue-green path, and validate both omissions and duplicates. The new checkpoint path is the last step in that reasoning, not the first.
