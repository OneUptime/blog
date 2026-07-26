# StarRocks Routine Load Is PAUSED: Fix Kafka and Parsing Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Kafka, Routine Load, Data Ingestion, Troubleshooting

Description: Diagnose a paused StarRocks Routine Load job without skipping Kafka data or hiding malformed rows behind unsafe error thresholds.

---

`PAUSED` is a recoverable Routine Load state. For a job that StarRocks paused automatically, it stopped scheduling consumption because a task crossed an error threshold or encountered a source problem, but the job definition and committed progress still exist.

Do not stop and recreate the job immediately. `STOPPED` cannot be resumed, and a new job with the wrong starting offset can skip or replay data.

## Capture the Job Record

Use the database-qualified job name:

```sql
SHOW ROUTINE LOAD FOR ingestion.kafka_orders\G
```

Preserve these fields:

- `State` and `PauseTime`
- `ReasonOfStateChanged`
- `ErrorLogUrls` and `TrackingSQL`
- `OtherMsg`
- `Progress` and `LatestSourcePosition`
- `Statistic`
- `JobProperties`, `DataSourceProperties`, and `CustomProperties`

If `TrackingSQL` is present, run that SQL to read the server-side load tracking log. The URLs in `ErrorLogUrls` can also expose rejected-row details:

```bash
curl --fail --show-error '<error-log-url>'
```

Treat rejected records as potentially sensitive. Store them in a restricted incident location and remove credentials or personal data before sharing.

## Branch on the Pause Reason

### Kafka offset is out of range

The official Routine Load FAQ calls out:

```text
Broker: Offset out of range
```

Compare each partition's `Progress` offset with Kafka's current earliest and latest offsets. For example:

```bash
bin/kafka-get-offsets.sh \
  --bootstrap-server kafka-0.example.net:9092,kafka-1.example.net:9092 \
  --topic orders \
  --time earliest

bin/kafka-get-offsets.sh \
  --bootstrap-server kafka-0.example.net:9092,kafka-1.example.net:9092 \
  --topic orders \
  --time latest
```

Use the Kafka tooling that matches your distribution and security settings. If StarRocks progress is older than Kafka's earliest retained offset, the missing messages have already been deleted from Kafka. Resuming cannot reconstruct them.

At that point choose explicitly:

1. Restore or replay the missing range from an upstream archive, then continue.
2. Accept a documented data gap and reset to an available offset.
3. Build a replacement job from a known boundary and deduplicate at the destination.

If the stored offset is ahead of Kafka's latest offset, verify that the job points to the intended cluster, topic, and partitions. A copied job definition often targets a same-named topic in the wrong environment.

Prevent recurrence by keeping Kafka retention comfortably longer than worst-case ingestion lag and incident-recovery time.

### Error rows exceeded the threshold

Routine Load examines bad records inside an error-detection window. By default, `max_error_number` is `0`, so an error row can pause the job. `max_filter_ratio` defaults to `1`, which means it does not normally constrain the job unless set.

Inspect the rejected row and identify the exact mapping failure:

- invalid JSON or Avro record
- wrong CSV delimiter or quoting
- source field mapped to the wrong destination column
- out-of-range numeric value
- invalid date or timestamp
- `NULL` supplied to a non-nullable column
- schema changed upstream
- strict-mode conversion failure

Do not immediately increase both thresholds. The last task may already have committed its valid rows while filtering bad rows, depending on which threshold was crossed.

If business policy permits a bounded number of rejected rows, increase the alterable row-count threshold while the job remains paused:

```sql
ALTER ROUTINE LOAD FOR ingestion.kafka_orders
PROPERTIES (
  'max_error_number' = '10'
);
```

Current `ALTER ROUTINE LOAD` does not support changing `max_filter_ratio`; that ratio must be chosen when the job is created. If it was configured at creation time, the job pauses when either the row-count or ratio boundary is reached. Send rejected events to an upstream dead-letter path if possible; Routine Load filtering alone is not a complete quarantine workflow.

### JSON parsing or mapping is wrong

Each JSON object representing a row must be contained in one Kafka message. For an outer JSON array, configure `strip_outer_array` only when the message really has that shape.

Review the deployed properties:

```sql
SHOW ROUTINE LOAD FOR ingestion.kafka_orders\G
```

Compare `format`, `jsonpaths`, `json_root`, `strip_outer_array`, `COLUMNS`, and the destination schema against a raw Kafka message captured at the failing partition and offset. Test the exact bytes, not a re-formatted example from an application log.

For CSV, confirm the actual delimiter and representation of null. StarRocks uses `\N` for a CSV null; an empty field is an empty string, not automatically a null.

### Connectivity, authentication, or DNS failed

Kafka clients first receive broker addresses from cluster metadata. Every BE that can coordinate a Routine Load task must resolve and reach those advertised broker addresses and have access to the required TLS or SASL material.

Check task records and their coordinator BE IDs:

```sql
SHOW ROUTINE LOAD TASK FROM ingestion WHERE JobName = 'kafka_orders';
```

Then test DNS, port reachability, certificate validity, and Kafka ACLs from the relevant StarRocks nodes. A successful connection from an FE or an operator laptop does not prove a coordinator BE can connect.

## Resume Only After the Cause Is Fixed

Resume the existing job:

```sql
RESUME ROUTINE LOAD FOR ingestion.kafka_orders;
```

The state temporarily becomes `NEED_SCHEDULE`, then should become `RUNNING`. Watch it:

```sql
SHOW ROUTINE LOAD FOR ingestion.kafka_orders\G
SHOW ROUTINE LOAD TASK FROM ingestion WHERE JobName = 'kafka_orders';
```

Verify that:

1. `Progress` advances for every intended partition.
2. `LatestSourcePosition - Progress` trends down.
3. Error-row count does not immediately cross the threshold again.
4. Loaded rows appear at expected business keys and event times.
5. No partition was silently omitted from the job.

If you must replace the job, record the final committed offsets first. Use explicit `kafka_partitions` and `kafka_offsets` for the handoff, and validate destination idempotency before replaying.

## Avoid the Destructive Shortcut

`STOP ROUTINE LOAD` is final for that job. Use `PAUSE`, `ALTER`, and `RESUME` for a recoverable repair:

```sql
PAUSE ROUTINE LOAD FOR ingestion.kafka_orders;

ALTER ROUTINE LOAD FOR ingestion.kafka_orders
PROPERTIES (
  'desired_concurrent_number' = '3'
);

RESUME ROUTINE LOAD FOR ingestion.kafka_orders;
```

The correct recovery preserves a known Kafka offset boundary and makes malformed records observable. A green `RUNNING` state is not enough if it was achieved by skipping retained data or accepting every bad row.

## Official Documentation

- [Load data using Routine Load](https://docs.starrocks.io/docs/loading/RoutineLoad/)
- [Routine Load FAQ](https://docs.starrocks.io/docs/faq/loading/Routine_load_faq/)
- [CREATE ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/CREATE_ROUTINE_LOAD/)
- [SHOW ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD/)
- [RESUME ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/RESUME_ROUTINE_LOAD/)
