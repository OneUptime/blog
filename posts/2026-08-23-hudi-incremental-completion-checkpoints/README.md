# Checkpoint Hudi Incremental Queries by Completion Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Incremental Queries, Checkpointing, Spark, Data Pipeline

Description: Build bounded Hudi incremental reads with completion-time checkpoints that avoid timeline gaps and ambiguous restart boundaries.

---

Apache Hudi 1.x orders incremental and CDC query ranges by commit completion time. That change matters with concurrent writers: a commit requested first can finish after a later request, so requested instant order alone can skip work that was still inflight when a consumer advanced.

A reliable consumer must bind each run to a stable completion-time window, publish its output, and advance the checkpoint only after that output succeeds. It must also honor the current Spark DataSource boundary semantics: the begin completion time is inclusive and the end completion time is inclusive.

This guide targets Hudi 1.2.x. Hudi 0.x tables and older clients used requested-instant semantics; do not mix their checkpoints with 1.x values without the documented translation.

## Know which time you are storing

Every Hudi 1.x timeline action has:

- A requested instant time, assigned when the action begins.
- A completion time, assigned when it becomes completed and visible.

The options retain historical names:

```text
hoodie.datasource.read.begin.instanttime
hoodie.datasource.read.end.instanttime
```

For current Hudi incremental reads, the values represent completion times. The official configuration states that records from actions with `completion_time >= begin` and `completion_time <= end` are fetched. The begin value does not need to equal an actual timeline instant.

Store a typed checkpoint such as:

```json
{
  "table": "s3://lake/orders",
  "tableVersion": 9,
  "timeKind": "completion",
  "nextBegin": "20260823091530124"
}
```

The type fields prevent a requested instant from being accidentally reused as a completion time during an upgrade.

## Capture a stable upper bound

At the beginning of a run, choose the latest completed data commit you intend to consume and record its completion time as `end`. Do not leave the end open while a long transformation runs; otherwise the read may include commits that finish during execution and the output checkpoint may not describe a reproducible window.

Hudi's SQL procedures can expose the timeline and completed state for operations:

```sql
CALL show_timeline(
  table => 'orders',
  limit => 100,
  filter => "state = 'COMPLETED' AND action IN ('commit', 'deltacommit')"
);
```

Use the programmatic Hudi timeline APIs when building a production orchestrator, because display-formatted procedure timestamps are intended for inspection. The chosen bound must come from Hudi's timeline, not the Spark driver clock.

## Read a closed window

Given `begin` and `end`:

```python
options = {
    "hoodie.datasource.query.type": "incremental",
    "hoodie.datasource.query.incremental.format": "latest_state",
    "hoodie.datasource.read.begin.instanttime": begin,
    "hoodie.datasource.read.end.instanttime": end,
}

changes = spark.read.format("hudi").options(**options).load(table_path)
```

An initial backfill can use `earliest` as the begin value. A normal run uses the persisted `nextBegin`.

Because both ends are inclusive in Hudi 1.x, the next lower bound must be strictly greater than the completed upper bound to avoid reading that boundary again. With standard 17-digit millisecond completion timestamps, compute the next millisecond:

```python
from datetime import datetime, timedelta

def next_hudi_time(value: str) -> str:
    parsed = datetime.strptime(value, "%Y%m%d%H%M%S%f")
    return (parsed + timedelta(milliseconds=1)).strftime("%Y%m%d%H%M%S%f")[:-3]
```

Persist `next_hudi_time(end)` only after the downstream write commits. Hudi accepts a begin completion time that does not correspond to an instant, so this creates a half-open logical progression without skipping the next completed action.

Use one fixed timestamp precision across the pipeline. If the runtime emits or accepts a different completion-time representation, parse it with Hudi's supported format rather than truncating strings.

## Make output and checkpoint advancement atomic

The failure window is:

1. Source window read succeeds.
2. Output write succeeds.
3. Checkpoint persistence fails.

If output is append-only, a retry can duplicate results. Prefer an idempotent keyed sink, such as a Hudi upsert target, and attach the source window to commit metadata or an external transaction record. Then a retried source window converges to the same target state.

Only advance the external checkpoint after confirming the target commit. Use compare-and-set or a lease so two scheduler attempts cannot advance the same consumer independently. Include the source table path, chosen end, target commit, row count, and job run ID in an audit record.

If strict atomicity between a Hudi target and an external checkpoint store is impractical, use the target Hudi commit metadata as the source of truth and reconstruct the last successful checkpoint from it.

## Prefer Hudi Streamer when it fits

Hudi Streamer's `HoodieIncrSource` manages incremental checkpoints. For table version 8 or higher it stores completion-time progress in target commit metadata under `streamer.checkpoint.key.v2`. Its reset syntax distinguishes:

```text
resumeFromInstantRequestTime:20250110120000000
resumeFromInstantCompletionTime:20250110120005000
```

Hudi translates a requested instant to the corresponding completion position and resumes after it. From Hudi 1.0.1 onward, a bare timestamp reset is rejected for this source because its meaning would be ambiguous.

Use the Streamer implementation rather than reproducing its checkpoint translation when your pipeline can be expressed as a Hudi incremental source and Hudi target.

## Handle upgrades and retention

Before upgrading from a 0.x reader to 1.x:

1. Stop the consumer at a known completed checkpoint.
2. Record the source table version and checkpoint type.
3. Upgrade readers before writers when the table version changes.
4. Let Hudi's supported translation path map requested time to completion time.
5. Test a range around concurrent or hollow commits.

Incremental reading also depends on retained commit and file history. Configure cleaning retention for the maximum consumer outage, and alert before a checkpoint falls behind the earliest incrementally readable point. A savepoint protects a chosen snapshot's files but is not a substitute for sizing ordinary incremental retention.

## Verify every window

Log the begin, end, next begin, selected completed instants, output row count, and target commit. Test:

- No new commits: an empty successful window does not move beyond an unobserved commit.
- A commit finishes during processing: it appears in the next bounded run.
- Failure before output: the checkpoint stays unchanged.
- Failure after output: a retry is idempotent.
- Two writers finish out of request order: both are consumed in completion order.

These tests catch more checkpoint bugs than a happy-path count comparison.

## Official Documentation

- [Apache Hudi Spark DataSource configurations](https://hudi.apache.org/docs/basic_configurations/)
- [Apache Hudi SQL queries](https://hudi.apache.org/docs/sql_queries/)
- [Apache Hudi Streamer checkpointing](https://hudi.apache.org/docs/hoodie_streaming_ingestion/)
- [Apache Hudi SQL procedures](https://hudi.apache.org/docs/procedures/)
- [Apache Hudi technical specification](https://hudi.apache.org/learn/tech-specs/)

## Conclusion

Use completion time as an explicit, typed checkpoint for Hudi 1.x. Freeze an inclusive upper bound, process that reproducible window, advance to the first possible time after it only when output commits, and keep the sink idempotent. When possible, let Hudi Streamer manage the translation and checkpoint lifecycle.
