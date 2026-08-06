# Do OPTIMIZE and VACUUM Break Delta Streaming Checkpoints?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Delta Lake, Structured Streaming, OPTIMIZE, VACUUM, Checkpointing, Data Reliability

Description: A transaction-log walkthrough of how Delta maintenance affects streaming offsets, retained files, and checkpoint recovery.

---

`OPTIMIZE` and `VACUUM` both concern files that are no longer part of the current layout, but they act at different layers. `OPTIMIZE` writes replacement data files and commits logical tombstones for the superseded files without changing the rows in the current snapshot. `VACUUM` is the later physical garbage collection that deletes eligible unreferenced files after the retention threshold.

The short answer is:

- `OPTIMIZE` does not invalidate a current or future stream reading the Delta table.
- `VACUUM` does not edit the stream checkpoint, but it can make an old checkpoint unrecoverable when the stream still needs expired log history or data files.
- A checkpoint stored carelessly inside the table directory can itself be deleted by `VACUUM` unless its directory name begins with `_` or `.`.

Understanding why requires separating four pieces of state: the Delta transaction log, active table snapshots, data files, and the Structured Streaming checkpoint.

## What a Delta Stream Actually Checkpoints

A Structured Streaming checkpoint records source offsets, committed micro-batches, state-store data for stateful operators, configuration metadata, and a unique query identity. For a Delta source, the source offset identifies progress through Delta table versions and files. It is not merely a timestamp or the name of the latest Parquet file.

The Delta table independently records commits in `_delta_log`. A simplified history might look like this:

```text
version 101  WRITE      adds f1.parquet and f2.parquet
version 102  WRITE      adds f3.parquet
version 103  OPTIMIZE   removes f1, f2, f3 and adds compacted-f4.parquet
version 104  WRITE      adds f5.parquet
```

The `remove` actions at version 103 are logical tombstones. Snapshot 103 reads `compacted-f4.parquet`; snapshot 102 still refers to the earlier files until retention and physical cleanup make that history unavailable.

The stream checkpoint might say that it has completely processed version 101 and is partway through later work. Recovery uses both the checkpoint and retained table history to determine what remains. Keeping the checkpoint does not preserve source files by itself.

## Why OPTIMIZE Is Stream-Safe

`OPTIMIZE` compacts or reclusters files. Delta marks the rewrite as a data-layout operation with no logical data change. Readers use snapshot isolation, so an active read continues against its chosen snapshot while later readers see the newly compacted layout.

Databricks explicitly documents that running `OPTIMIZE` on a table used as a streaming source does not affect current or future streams from that source. You do not need to reset a checkpoint after ordinary bin-packing, `ZORDER`, or liquid-clustering optimization.

The stream can observe the transaction-log commit without emitting all compacted rows as new business records. This is distinct from upstream operations such as `UPDATE`, `DELETE`, `MERGE`, or `OVERWRITE`, which modify existing data and require an explicit downstream strategy such as change data feed, `skipChangeCommits`, or a full refresh.

For a native Delta streaming sink performing append-only writes to a table that supports concurrent transactions, concurrent `OPTIMIZE` is also safe under Delta concurrency rules. Databricks documents that append operations that do not read the target table cannot conflict with `OPTIMIZE`. Other write patterns can have different conflict behavior and might fail with a concurrency exception, but that does not by itself invalidate the writer's checkpoint.

There are two operational details worth recognizing:

- A streaming commit with `epochId = -1` can be an expected empty Delta commit, including on the first batch after a restart or after a schema change.
- A `foreachBatch` callback can receive an empty DataFrame when an `OPTIMIZE` operation has no files to process. File pruning can also produce an empty batch. Callback code should tolerate empty batches instead of interpreting them as corruption.

An explicit guard is cheap:

```python
def write_batch(batch_df, batch_id):
    if batch_df.isEmpty():
        return

    # The real idempotent sink operation follows.
    merge_events(batch_df, batch_id)
```

Do not infer a checkpoint problem merely because the source history includes an `OPTIMIZE` operation or because a no-data micro-batch appears near it.

## VACUUM Changes What Can Be Replayed

`VACUUM` deletes unreferenced data files older than its retention threshold. The default data-file retention threshold is seven days. Delta transaction-log files have a separate default retention of 30 days and are cleaned asynchronously after log checkpoint operations, not by `VACUUM` itself.

Those are two different clocks:

```text
data file availability:      controlled by VACUUM retention
transaction log availability: controlled by log retention and log cleanup
```

A Delta source stream must run at least once within the source table's retention window. Current Databricks documentation warns that a stream falling behind the available data-file or transaction-log history fails with `DELTA_FILE_NOT_FOUND_DETAILED` and requires a full refresh.

Consider a stopped stream whose checkpoint last processed version 101. While it is down:

1. Versions 102 through 150 are committed.
2. `OPTIMIZE` rewrites files from some of those versions.
3. Enough time passes for their tombstoned files to exceed the retention threshold.
4. `VACUUM` physically deletes those files.
5. The stream restarts and asks the source to resume from its checkpoint.

The checkpoint is structurally valid, but the source can no longer supply everything required to advance from it. The resulting failure is a retention breach, not checkpoint invalidation by the `OPTIMIZE` command.

Do not work around this by setting `spark.sql.files.ignoreMissingFiles=true`. Databricks explicitly warns that doing so for a lagging Delta source silently produces incorrect results. Restore the missing source history if possible or reset the pipeline with a verified full refresh.

## Sink-Only Streams Have a Different Risk

If the maintained table is only the stream's sink, `VACUUM` normally does not affect source offsets in the checkpoint. A native Delta streaming sink tracks committed epochs in the transaction log and checkpoint to provide exactly-once processing.

The risk appears when a custom recovery plan depends on old sink versions. For example, a team might use time travel to reconcile which Kafka offsets were represented before a reset. If `VACUUM` has removed the necessary data files, that historical comparison is no longer available even though the current sink remains correct.

Change data feed consumers have a related retention dependency. Change files live under Delta-managed paths, and their availability follows table history. A CDF reader that falls behind retained history must recover from a newer authoritative boundary or perform a full refresh.

## Protect Checkpoints Stored Near Table Data

Databricks allows checkpoints beside Delta data when the checkpoint directory begins with `_`, for example:

```text
s3://analytics/orders/
  _delta_log/
  _checkpoints/
    bronze_orders/
  part-00000-....snappy.parquet
```

`VACUUM` ignores directories whose names start with `_` or `.`. It can remove files in other unmanaged directories under the table path. Therefore this path is dangerous:

```text
s3://analytics/orders/checkpoints/bronze_orders/
```

Prefer a Unity Catalog volume or a dedicated external location for checkpoints. If policy keeps them under a table directory, use the documented `_checkpoints` convention and give every query a unique subdirectory. Never let two streams share a checkpoint path.

Do not assume that a retention policy on checkpoint storage is harmless. Deleting checkpoint files outside Delta's maintenance commands also destroys recovery state.

## A Maintenance Policy That Preserves Recovery

Treat the longest credible outage and replay requirement as inputs to retention policy:

```text
required retention >= maximum stream downtime
                    + maximum processing catch-up time
                    + operational investigation buffer
```

Then apply the following controls:

1. Monitor `numBytesOutstanding`, `numFilesOutstanding`, and `backlogEndOffset` for Delta sources.
2. Alert when the oldest unprocessed source work approaches the configured retention window.
3. Keep data-file and log-retention settings consistent with the recovery objective.
4. Run `VACUUM ... DRY RUN` when changing policy or investigating a lagging stream.
5. Avoid retention intervals below seven days unless all concurrent operations and recovery requirements have been proven safe.
6. Use predictive optimization for eligible Unity Catalog managed tables when it fits the platform policy.
7. Test full-refresh procedures before the only remaining recovery path is a production incident.

Inspect the maintenance history and retention properties as part of an incident:

```sql
DESCRIBE HISTORY prod.raw.orders;
SHOW TBLPROPERTIES prod.raw.orders;
VACUUM prod.raw.orders DRY RUN;
```

Do not disable the Delta retention safety check as a routine optimization. Databricks strongly recommends at least seven days because a very short interval can even delete uncommitted files belonging to a long-running job.

## Decide the Correct Response to a Failure

Use the evidence, not the maintenance command name:

| Observation | Likely meaning | Correct response |
| --- | --- | --- |
| `OPTIMIZE` appears in history and the stream continues | Expected layout rewrite | Keep the checkpoint |
| Empty `foreachBatch` input after a no-work `OPTIMIZE` or file pruning | Valid no-data batch | Make callback tolerate empty input |
| Schema change terminates the stream | Metadata incompatibility | Restart or migrate per schema-change guidance |
| `DELTA_FILE_NOT_FOUND_DETAILED` after long downtime | Source history expired | Full refresh from available truth |
| Checkpoint directory vanished after `VACUUM` | It was stored in an unprotected unmanaged directory | Restore if possible, then perform a controlled reset |
| Time travel no longer reaches an old version | Required files passed retention | Use another authoritative reconciliation source |

`OPTIMIZE` and `VACUUM` are often adjacent in a maintenance schedule, so incidents are easily misattributed. `DESCRIBE HISTORY` shows logical operations. Object-store audit logs and `VACUUM DRY RUN` help establish which physical files were eligible for removal. Checkpoint and streaming progress logs show how far the consumer had actually advanced.

## Official Documentation

- [Optimize data file layout](https://docs.databricks.com/aws/en/tables/operations/optimize)
- [Remove unused data files with `VACUUM`](https://docs.databricks.com/aws/en/tables/operations/vacuum)
- [Delta Lake table streaming reads and writes](https://docs.databricks.com/aws/en/structured-streaming/delta-lake)
- [Structured Streaming checkpoints](https://docs.databricks.com/aws/en/structured-streaming/checkpoints)
- [Use `foreachBatch` to write to arbitrary data sinks](https://docs.databricks.com/aws/en/structured-streaming/foreach)
- [Use change data feed on Databricks](https://docs.databricks.com/aws/en/tables/features/change-data-feed)
- [Predictive optimization for Unity Catalog managed tables](https://docs.databricks.com/aws/en/optimizations/predictive-optimization)

## Conclusion

`OPTIMIZE` preserves the logical snapshot and is explicitly safe for Delta streaming sources. `VACUUM` preserves the current snapshot but narrows the history a lagging stream can replay. Keep checkpoints in protected, unique locations, size retention for the worst credible outage, and monitor backlog before history expires. When recovery fails, determine whether source files, transaction-log history, or checkpoint files are missing before choosing a reset.
