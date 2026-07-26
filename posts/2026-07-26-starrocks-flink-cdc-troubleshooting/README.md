# Flink CDC to StarRocks Keeps Failing: A Connector and Stream Load Troubleshooting Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Apache Flink, Change Data Capture, Stream Load, Troubleshooting

Description: Isolate Flink CDC to StarRocks failures across connector versions, endpoints, schemas, Stream Load transactions, and checkpoints.

---

A Flink CDC pipeline crosses at least four independent boundaries: the source connector, Flink state and checkpoints, the StarRocks connector, and StarRocks Stream Load. An exception at the sink often contains an earlier failure from one of the other layers.

Diagnose one checkpoint attempt end to end. Preserve the first exception, transaction label, checkpoint ID, and StarRocks load response before increasing retries.

## Record the Exact Version Matrix

Capture:

- Flink version and Java runtime
- Flink CDC framework and source connector versions
- StarRocks connector JAR name and version
- StarRocks FE and BE/CN versions
- sink API version (`V1`, `V2`, or `AUTO`)
- delivery semantic (`at-least-once` or `exactly-once`)

The current StarRocks connector 1.2.15 matrix documents Flink 1.16 through 1.20, StarRocks 2.1 or later, and Java 8. Older connector artifacts have different Flink and Scala suffixes. Use the official matrix for the exact artifact rather than renaming a JAR built for another Flink line.

On every JobManager and TaskManager image, list connector copies:

```bash
find /opt/flink -type f \
  \( -name '*starrocks*.jar' -o -name '*flink*c*dc*.jar' \) \
  -print
```

Duplicate connector versions can produce class-loading and method errors. After changing JARs in a running Flink distribution, restart the Flink cluster so workers load the same artifacts.

Flink CDC 3.0 integration as the StarRocks Pipeline Connector begins with StarRocks connector 1.2.9. Do not combine a Flink CDC 3 pipeline definition with an older StarRocks sink and expect automatic database, table, or schema-change handling.

## Separate the Two StarRocks Endpoints

A typical sink needs both:

```sql
'jdbc-url' = 'jdbc:mysql://fe-query.example.net:9030',
'load-url' = 'fe-http.example.net:8030'
```

`jdbc-url` uses the FE MySQL-compatible query port for metadata. `load-url` uses the FE HTTP port for Stream Load. Pointing both at 9030, using an HTTPS-only proxy for plain HTTP, or publishing a load address unreachable from TaskManagers causes different failures.

Test from a TaskManager network namespace:

```bash
nc -vz fe-query.example.net 9030
nc -vz fe-http.example.net 8030
curl --fail --show-error http://fe-http.example.net:8030/api/health
```

An FE can redirect Stream Load to a BE/CN. Ensure TaskManagers can resolve and reach the returned data-plane addresses too. A successful connection from the JobManager alone is not sufficient because sink subtasks run on TaskManagers.

Also verify:

- DNS returns the intended environment.
- TLS certificates match hostnames when a secure proxy is used.
- load balancers preserve required HTTP methods, bodies, and `Expect: 100-continue`.
- connection and socket timeouts match normal network latency.

The connector exposes `sink.connect.timeout-ms`, `sink.socket.timeout-ms`, and `sink.wait-for-continue.timeout-ms`. Change them only after measuring which phase times out.

## Verify Identity and Destination Metadata

Use the connector's account through the JDBC endpoint:

```sql
SELECT CURRENT_USER(), VERSION();
SHOW CREATE TABLE analytics.orders;
```

The account needs the documented privileges to read metadata and load the destination. Confirm database and table name casing, especially when source and sink catalogs derive names automatically.

For CDC, the StarRocks destination is usually a Primary Key table:

```sql
CREATE TABLE analytics.orders (
  order_id BIGINT NOT NULL,
  status VARCHAR(32) NULL,
  amount DECIMAL(18, 2) NULL,
  updated_at DATETIME NULL
)
PRIMARY KEY (order_id)
DISTRIBUTED BY HASH(order_id);
```

The Flink table should declare the matching key:

```sql
PRIMARY KEY (order_id) NOT ENFORCED
```

Check every mapped type, precision, scale, nullability, and column name. A source `DECIMAL(38, 18)` cannot be treated as a small integer merely because sample values fit. Inspect the first rejected row, but enable `sink.sanitize-error-log = true` in production if logs may contain sensitive values.

## Locate the Stream Load Failure

In the Flink exception, preserve:

- load label
- transaction ID
- HTTP status
- StarRocks `Status` and `Message`
- `ErrorURL` or rejected-row sample
- current checkpoint ID

On StarRocks, inspect recent load activity:

```sql
SELECT
  label,
  state,
  type,
  create_time,
  load_start_time,
  load_finish_time,
  error_msg,
  tracking_url
FROM information_schema.loads
WHERE db_name = 'analytics'
ORDER BY create_time DESC
LIMIT 50;
```

Use the schema shown by `DESC information_schema.loads` on the deployed release because available columns evolve. Query Profile, FE audit logs, and BE logs should be correlated by label, query ID, or transaction ID.

Common Stream Load causes include:

- filtered rows exceeding `sink.properties.max_filter_ratio` (default `0`)
- malformed CSV or JSON after connector serialization
- a missing required column
- destination schema changing during a checkpoint
- too many running transactions
- publish timeout or compaction backlog
- request body or memory limits

Do not raise `max_filter_ratio` simply to make checkpoints complete. That converts a pipeline outage into silent data loss unless rejected records are quarantined and replayed.

## Diagnose Exactly-Once Checkpoint Failures

With:

```sql
'sink.semantic' = 'exactly-once'
```

the connector flushes when Flink triggers a checkpoint. The ordinary byte, row, and interval flush controls do not drive exactly-once flushes.

Require:

1. Flink checkpointing is enabled and completing.
2. The checkpoint interval creates a tolerable batch size and latency.
3. Connector 1.2.4 or later and StarRocks 2.5 or later are used for the recommended transaction-interface implementation.
4. Connector 1.2.8 or later sets a unique `sink.label-prefix`.

Example:

```sql
'sink.semantic' = 'exactly-once',
'sink.label-prefix' = 'prod-orders-cdc'
```

The prefix must be unique across Flink jobs and other StarRocks loading workflows. It allows recovery to identify lingering `PREPARED` transactions left by an interrupted checkpoint.

The prepared-transaction timeout must exceed the maximum planned Flink downtime. For connector 1.2.12+ with StarRocks 3.5.4+, V2 supports:

```sql
'sink.version' = 'V2',
'sink.properties.prepared_timeout' = '86400'
```

Also keep StarRocks label history longer than the recovery window. If a prepared transaction or its label expires before Flink restores its checkpoint, recovery may be unable to determine whether data committed.

Do not enable Merge Commit with exactly-once. StarRocks' current connector documentation states that Merge Commit provides at-least-once semantics only.

## Check CDC and Schema Evolution Separately

Determine whether failure occurs during:

- initial snapshot
- transition from snapshot to binlog or change log
- ordinary row changes
- a source DDL event
- recovery from a savepoint

Flink CDC 3.0 with StarRocks connector 1.2.9+ supports schema-change synchronization, but not every source DDL and type transformation is necessarily safe for every version pair. Capture the exact source DDL event and compare the resulting StarRocks DDL.

StarRocks recommends v3.2.1 or later with Fast Schema Evolution for this pipeline. Adding and dropping columns is much cheaper when the destination table was created with the supported fast-schema behavior. Older existing tables may still require an asynchronous rewrite.

Pause source DDL automation if a failed schema change is blocking the stream. Do not manually alter the target to a merely similar schema and resume without reconciling the CDC pipeline's schema state.

## Tune Throughput Without Creating Transaction Pressure

For at-least-once mode, flush occurs on byte, row, interval, or checkpoint boundaries. Very small batches and high `sink.parallelism` create many transactions and tablet versions.

For connector 1.2.14+, Merge Commit can combine subtasks into fewer transactions:

```sql
'sink.semantic' = 'at-least-once',
'sink.properties.enable_merge_commit' = 'true',
'sink.properties.merge_commit_interval_ms' = '10000'
```

It adds latency and does not help when sink parallelism is one. For Primary Key tables, concurrent requests can arrive out of order. Set `sink.merge-commit.max-concurrent-requests = 0` for in-order requests, or use a documented conditional-update column so an older change cannot overwrite a newer one.

Scale only after measuring:

- source lag
- checkpoint duration and failure rate
- sink backpressure
- Stream Load rows and bytes per transaction
- running and prepared transactions
- publish latency
- compaction score and tablet versions
- BE/CN CPU and memory

## A Short Isolation Checklist

1. Reproduce one failure with its first exception and checkpoint ID.
2. Verify connector/Flink/CDC/StarRocks compatibility.
3. Remove duplicate JARs and restart all Flink processes.
4. Test JDBC, FE HTTP, and redirected BE/CN reachability from TaskManagers.
5. Compare source, Flink, and StarRocks keys and types.
6. Correlate the sink label with StarRocks load and transaction state.
7. Validate checkpoint, label-prefix, and timeout settings for exactly-once.
8. Reproduce source schema changes separately from row ingestion.
9. Reduce parallelism or enlarge useful batches if transaction pressure is high.
10. Restore from a known checkpoint and prove row counts, deletes, and key state.

Retries are appropriate after a transient failure. They are not a fix for an incompatible JAR, unreachable load endpoint, deterministic bad row, or expired transaction boundary.

## Official Documentation

- [StarRocks connector for Apache Flink](https://docs.starrocks.io/docs/integrations/streaming/flink/)
- [Flink connector release notes](https://docs.starrocks.io/releasenotes/flink_connector/)
- [Realtime synchronization from MySQL](https://docs.starrocks.io/docs/loading/Flink_cdc_load/)
- [Stream Load transaction interface](https://docs.starrocks.io/docs/loading/Stream_Load_transaction_interface/)
- [Troubleshooting data loading](https://docs.starrocks.io/docs/loading/loading_introduction/troubleshooting_loading/)
