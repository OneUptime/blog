# Run Async Hudi Compaction with Spark Structured Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Spark Structured Streaming, Compaction, Merge-on-Read, Streaming

Description: Configure and operate asynchronous Hudi compaction inside Spark Structured Streaming while protecting ingestion latency.

---

Asynchronous compaction lets a Spark Structured Streaming job keep committing Merge-on-Read data while Hudi merges older log files into new base files in the background. It removes compaction from the micro-batch critical path, but it does not make compaction free: both activities still share executors, memory, storage bandwidth, and the Hudi timeline.

This guide targets Apache Hudi 1.2.x and the Spark Structured Streaming Hudi sink. Compaction applies only to Merge-on-Read tables.

## Use the single-process model first

Hudi's simplest async model runs ingestion and compaction in the same Spark application. Hudi coordinates its writer and table service through MVCC, so readers see committed snapshots and ingestion does not wait for each compaction to finish.

This is operationally different from launching a separate compactor application. A separate compactor plus an ingestion job is a multi-writer deployment and requires the appropriate external locking and concurrency configuration. Keep compaction in the streaming process unless isolation, scale, or scheduling requirements justify the extra coordination.

## Configure the stream

A Scala sink follows the official Hudi pattern:

```scala
import org.apache.spark.sql.streaming.Trigger

val options = Map(
  "hoodie.table.name" -> "orders_mor",
  "hoodie.datasource.write.table.type" -> "MERGE_ON_READ",
  "hoodie.datasource.write.operation" -> "upsert",
  "hoodie.datasource.write.recordkey.field" -> "order_id",
  "hoodie.datasource.write.partitionpath.field" -> "event_date",
  "hoodie.table.ordering.fields" -> "source_lsn",
  "hoodie.datasource.compaction.async.enable" -> "true",
  "hoodie.compact.inline.max.delta.commits" -> "10"
)

val query = input.writeStream
  .format("hudi")
  .options(options)
  .option("checkpointLocation", "s3://lake-checkpoints/orders-mor")
  .outputMode("append")
  .trigger(Trigger.ProcessingTime("30 seconds"))
  .option("path", "s3://lake/orders_mor")
  .start()
```

The Spark checkpoint directory and the Hudi table path serve different purposes. Spark stores streaming progress and state in `checkpointLocation`. Hudi stores table commits and service instants under the table's `.hoodie` directory. Give the checkpoint a durable, job-specific path and never share it between unrelated queries.

Async compaction is the documented default for streaming write models, but setting `hoodie.datasource.compaction.async.enable=true` makes the intended behavior visible and reviewable.

## Separate scheduling from execution

Compaction has two phases:

1. Scheduling creates a requested compaction plan on the timeline.
2. Execution processes that plan and publishes the completed result.

The setting `hoodie.compact.inline.max.delta.commits` controls the commit-count threshold used by commit-based trigger strategies. It does not mean every file group will be compacted. The selected compaction strategy still decides which file groups enter the plan, often prioritizing accumulated log-file size.

Inspecting only completed commits can hide a stuck service. Monitor requested and inflight compaction instants as well as completed compactions.

## Protect streaming latency

Async tasks compete for the same Spark resources. If compaction consumes every executor, ingestion is asynchronous in name but can still miss its latency target.

Start with enough capacity for one normal micro-batch plus a representative compaction wave. Then observe:

- Micro-batch processing time versus trigger interval.
- Input rows per second and processed rows per second.
- Pending compaction count and age.
- Delta commits since the last completed compaction.
- Base-file and log-file read/write throughput.
- Executor memory, garbage collection, and task failures.

If processing time approaches the trigger interval, first determine whether ingestion or compaction is consuming the resources. Increasing the number of delta commits between compactions reduces service frequency but permits larger log backlogs and slower snapshot reads. Increasing cluster capacity can preserve both freshness and ingestion latency.

Hudi's Spark tuning guide notes that merge and compaction tasks may need enough memory to read a single data file. Very large target files can therefore turn compaction into an executor-memory problem.

## Set a trigger from an SLA

With a commit-count trigger, estimate the maximum backlog:

```text
maximum scheduling delay ~= micro-batch interval * delta-commit threshold
```

A 30-second trigger and ten-delta-commit threshold schedules roughly every five minutes when every micro-batch produces a commit. Empty batches, failed writes, compaction duration, and workload skew change the observed interval.

Hudi also supports time-based and combined trigger strategies through `hoodie.compact.inline.trigger.strategy`. Use `TIME_ELAPSED` when wall-clock freshness matters even if commit frequency varies. Use `NUM_OR_TIME` to cap both high-volume and low-volume delays. Use `NUM_AND_TIME` only when both thresholds truly must be met.

Test these settings against the actual Hudi version. Defaults and available strategies have evolved, and table-level operating behavior should not depend on an unreviewed library upgrade.

## Verify that compaction is working

Use Spark SQL procedures where the Hudi catalog extension is configured:

```sql
CALL show_compaction(table => 'orders_mor');
```

You can also inspect the Hudi timeline with the CLI. Confirm that requested compactions move through inflight to completion and that the read-optimized view advances.

Compare query modes:

```python
snapshot = (
    spark.read.format("hudi")
    .option("hoodie.datasource.query.type", "snapshot")
    .load("s3://lake/orders_mor")
)

read_optimized = (
    spark.read.format("hudi")
    .option("hoodie.datasource.query.type", "read_optimized")
    .load("s3://lake/orders_mor")
)
```

Immediately after new delta commits, snapshot can contain newer results than read optimized. After the relevant compaction completes, they should converge at that boundary. A permanent or increasing gap indicates failed scheduling, failed execution, or more work arriving than the service can drain.

## Recover without corrupting the timeline

If the streaming driver fails, restart it with the same Spark checkpoint path and Hudi options. Do not delete requested or inflight timeline files manually. Hudi supplies CLI and procedure-based operations for inspecting, validating, scheduling, and executing compaction plans.

If compaction falls behind:

1. Stop changing configuration on every restart.
2. Record the oldest pending instant and current log backlog.
3. Confirm storage and executor failures from the Spark UI and logs.
4. Add resources or temporarily reduce ingestion pressure.
5. Use an official offline compaction workflow only after configuring multi-writer coordination.

Running a second compactor without locks can turn a capacity incident into a concurrency incident.

## Official Documentation

- [Apache Hudi compaction](https://hudi.apache.org/docs/compaction/)
- [Apache Hudi streaming writes](https://hudi.apache.org/docs/writing_tables_streaming_writes/)
- [Apache Hudi concurrency control](https://hudi.apache.org/docs/concurrency_control/)
- [Apache Hudi Spark tuning guide](https://hudi.apache.org/docs/tuning-guide/)
- [Apache Hudi SQL procedures](https://hudi.apache.org/docs/procedures/)

## Conclusion

Run async compaction inside the streaming writer for the simplest safe deployment, configure a trigger that matches read freshness, and reserve enough resources for ingestion and compaction together. Treat pending timeline instants, log backlog, and snapshot-versus-read-optimized lag as first-class production signals.
