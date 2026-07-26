# Does StarRocks Kafka Routine Load Really Provide Exactly-Once Ingestion?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Kafka, Routine Load, Exactly-Once, Data Ingestion

Description: Understand the transaction and Kafka-offset boundary behind Routine Load exactly-once semantics and the duplicates it cannot prevent.

---

Yes, StarRocks documents exactly-once semantics for Routine Load from Kafka. The guarantee has a precise boundary: a Routine Load task commits its StarRocks writes as a transaction, and the frontend advances the saved Kafka partition progress only when that transaction succeeds.

That protects a job against duplicating or losing a committed offset range when a task fails and is retried. It does not mean that every business event appears once across producers, topics, replacement jobs, or downstream side effects.

## How the Commit Boundary Works

Each Routine Load task:

1. Starts from the job's saved offset for its assigned Kafka partitions.
2. Consumes a bounded batch.
3. Parses and writes that batch in one StarRocks transaction.
4. Commits the transaction.
5. Advances the saved partition progress.

If the transaction fails, StarRocks aborts it and does not update the saved progress. A later task consumes again from the last saved position.

The critical relationship is:

```text
StarRocks data transaction commit
             and
Routine Load partition progress update
```

They move together from the job's point of view. A failure before commit produces neither visible rows nor an advanced offset. A failure after a successful commit does not cause the committed range to be blindly appended again when the job is rescheduled.

Inspect the boundary:

```sql
SHOW ROUTINE LOAD FOR ingestion.kafka_orders\G

SHOW ROUTINE LOAD TASK FROM ingestion
WHERE JobName = 'kafka_orders'\G
```

`Progress` is the job's persisted position for each partition. `LatestSourcePosition` helps calculate lag. Task records expose the transaction ID and transaction status.

## What the Guarantee Does Cover

Within one continuously managed Routine Load job, it covers task failures such as:

- a coordinator BE failing during a load task
- a task timing out and aborting
- FE rescheduling after a failed transaction
- temporary Kafka or storage errors before commit
- pausing and resuming the same recoverable job

The batch may contain records from several partitions, but each partition is assigned to only one task at a time. StarRocks retries from the last saved positions when the transaction does not commit.

## What It Does Not Cover

### Duplicate records already present in Kafka

A `(topic, partition, offset)` coordinate identifies a Kafka record, not a business event. If a producer writes the same `event_id` twice at offsets 100 and 101 in one partition, Routine Load correctly processes two distinct Kafka records. A Duplicate Key table retains both rows.

Use a Primary Key table keyed by a stable business identifier when the desired state is one row per entity, or land raw events first and deduplicate with an explicit rule. Be clear that Primary Key loading is UPSERT behavior, not proof that the producer emitted only once.

### Two independent Routine Load jobs

Two jobs can consume the same topic and load the same table. Each has its own progress and exactly-once boundary, so both can legitimately write the record.

Inventory jobs before creating another:

```sql
SHOW ALL ROUTINE LOAD FROM ingestion;
```

Use meaningful unique job names and alert on overlapping topic-to-table assignments.

### Recreating a stopped or cancelled job

A stopped job cannot be resumed. If an operator creates a replacement from `OFFSET_BEGINNING` or an old explicit offset, previously committed records can be replayed. If the replacement starts at `OFFSET_END`, retained but unconsumed records can be skipped.

Before replacement, record:

- the old job's partition progress
- Kafka earliest and latest offsets
- the destination's loaded event boundary
- the exact new `kafka_partitions` and `kafka_offsets`

Treat the handoff as a data migration, not routine restart.

### Filtered or malformed records

Exactly-once does not mean every Kafka record becomes a destination row. A `WHERE` clause deliberately excludes records. Parsing and conversion failures can be filtered within configured `max_error_number` and `max_filter_ratio` limits.

Monitor error rows. Before expecting a rejected-record log, configure `log_rejected_record_num` to a positive value or `-1` for all rejected rows; its default value `0` logs none. A job can provide exact transaction semantics while intentionally dropping bad input under its configured quality policy.

### External side effects

Routine Load does not atomically commit a Kafka producer transaction, an external API call, and a StarRocks transaction together. Nor does it make a later export or application callback exactly once. Those systems need their own idempotency boundary.

### Retention gaps

If Kafka deletes an offset before StarRocks consumes it, Routine Load reports an out-of-range error. Transaction semantics cannot recover data that no longer exists in the source log.

## Store Source Coordinates for Audit and Replay

The current Latest-4.1 documentation describes loading Kafka metadata for JSON and Avro Routine Load jobs. However, support was merged to `main` in July 2026 in [#73840](https://github.com/StarRocks/starrocks/pull/73840), after v4.1.1, and as of July 26, 2026 it is not in a published StarRocks release. Run the following example only on a later release or build that contains that change. A raw landing table can use source coordinates as a Primary Key:

```sql
CREATE TABLE ingestion.orders_raw (
  source_stream VARCHAR(64) NOT NULL,
  src_partition INT NOT NULL,
  src_offset BIGINT NOT NULL,
  event_id VARCHAR(128) NOT NULL,
  amount DECIMAL(18, 2) NULL,
  kafka_time DATETIME NULL
)
PRIMARY KEY (source_stream, src_partition, src_offset)
DISTRIBUTED BY HASH(source_stream, src_partition);
```

Load metadata aliases:

```sql
CREATE ROUTINE LOAD ingestion.kafka_orders ON orders_raw
INCLUDE METADATA (
  PARTITION AS m_partition,
  OFFSET AS m_offset,
  TIMESTAMP_MS AS m_timestamp
),
COLUMNS (
  event_id,
  amount,
  source_stream = 'prod-orders-v1',
  src_partition = m_partition,
  src_offset = m_offset,
  kafka_time = from_unixtime(m_timestamp / 1000)
)
PROPERTIES (
  'format' = 'json',
  'jsonpaths' = '["$.event_id","$.amount"]'
)
FROM KAFKA (
  'kafka_broker_list' = 'kafka-0:9092,kafka-1:9092',
  'kafka_topic' = 'orders',
  'property.kafka_default_offsets' = 'OFFSET_BEGINNING'
);
```

`source_stream` must distinguish Kafka clusters, environments, and topic lifecycles. Kafka offsets can be reused if a topic is deleted and recreated, so `(topic, partition, offset)` alone is not a globally permanent event ID.

This landing design gives operators evidence for gap and duplicate checks. It also makes an accidental replay from a replacement job idempotent at the raw source-coordinate key, assuming the same record maps deterministically.

## Validate the Guarantee Operationally

Run controlled failure tests in staging:

1. Produce records with known event IDs and capture their partition/offset coordinates.
2. Interrupt a coordinator during an active task.
3. Let the same job recover.
4. Compare StarRocks source coordinates with the Kafka interval.
5. Assert no missing offsets and no duplicate coordinate keys.
6. Repeat across pause/resume and FE failover.
7. Separately test the documented procedure for job replacement.

In production, alert on:

- `PAUSED`, `CANCELLED`, and `UNSTABLE` states
- offset lag and retention headroom
- aborted task growth
- rejected rows
- overlapping jobs
- gaps in source coordinates

Routine Load's exactly-once claim is meaningful and useful, but it belongs to the transactional consumption of offsets by one job. Business-level idempotency still requires stable identifiers, controlled job handoffs, data-quality monitoring, and an explicit table model.

## Official Documentation

- [Load data using Routine Load](https://docs.starrocks.io/docs/loading/RoutineLoad/)
- [Routine Load consistency FAQ](https://docs.starrocks.io/docs/faq/loading/Routine_load_faq/)
- [CREATE ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/CREATE_ROUTINE_LOAD/)
- [SHOW ROUTINE LOAD TASK](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD_TASK/)
- [Change data through loading](https://docs.starrocks.io/docs/loading/Load_to_Primary_Key_tables/)
