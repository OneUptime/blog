# Hudi Incremental latest_state vs CDC Query Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Change Data Capture, Incremental Queries, Spark, Data Pipeline

Description: Choose Hudi latest_state or CDC incremental queries based on whether consumers need final rows or committed table changes.

---

Apache Hudi offers two incremental result formats with very different contracts. `latest_state` returns one final value for each record key changed in a time window. `cdc` returns insert, update, and delete changes materialized by Hudi commits, including before and after images when available.

Both reduce work compared with a full-table scan, but they are not interchangeable. A consumer maintaining another keyed table usually wants latest state. An audit log or event-driven application can use CDC for committed table changes. If every upstream source mutation must remain visible, retain the source log as well because same-key input records can be combined before a Hudi commit is written.

This guide targets Apache Hudi 1.2.x. Current Hudi quick-start documentation limits CDC queries to Copy-on-Write tables, while latest-state incremental queries work for both Copy-on-Write and Merge-on-Read.

For the broader table and writer configuration context, see the [Apache Hudi table configuration guide](../2026-01-24-apache-hudi-tables-configuration/README.md). This guide narrows in on the incremental result contract.

## Compare the semantics

Suppose key `order-7` changes in three separate Hudi commits within one query window:

```text
CREATED -> PAID -> CANCELLED
```

A `latest_state` result contains the final `CANCELLED` record once. The intermediate `CREATED` and `PAID` states are intentionally collapsed. Hudi describes this as returning the latest values of all records changed in the range as of the end time.

A CDC result contains three change rows, one for each committed transition. It represents inserts, updates, and deletes with operation metadata and before/after payloads. Spark does not guarantee the returned row order, so consumers that replay changes must sort by `ts_ms` and add an application-specific stable tie breaker when multiple changes share a commit time.

| Requirement | latest_state | CDC |
| --- | --- | --- |
| Upsert changed keys into a target | Best fit | Possible but more work |
| See every intermediate update | No | Yes, if it reached Hudi as a distinct committed change |
| Capture explicit delete events | Limited final-state contract | Yes |
| Minimize rows processed | Usually lower | Usually higher |
| Rebuild an event history | No | Committed table history |
| Supported table type in current quick start | COW and MOR | COW |

The number of Hudi commits is not necessarily the number of output rows. Latest state collapses repeated keys across the range. CDC preserves changes that reached the table as distinct commit-level changes, but it cannot recover same-key source mutations that write-time combining collapsed before commit.

## Read latest state

Spark DataSource options:

```python
options = {
    "hoodie.datasource.query.type": "incremental",
    "hoodie.datasource.query.incremental.format": "latest_state",
    "hoodie.datasource.read.begin.instanttime": begin_completion_time,
    "hoodie.datasource.read.end.instanttime": end_completion_time,
}

changed_rows = spark.read.format("hudi").options(**options).load(table_path)
```

Spark SQL also exposes the table-valued function:

```sql
SELECT *
FROM hudi_table_changes(
  'lake.orders',
  'latest_state',
  '20260823090000000',
  '20260823100000000'
);
```

Use the result as a keyed delta:

```sql
MERGE INTO silver_orders AS target
USING changed_orders AS source
ON target.order_id = source.order_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
```

The target operation must implement the desired delete behavior. Do not assume that a missing key in a latest-state batch means deletion; absence simply means no returned final row.

Latest state is efficient when ten million committed changes affect one million keys: the consumer handles the final one million records rather than every committed change. It is not appropriate when those commit-level transitions are the data product. If every original source event is the data product, retain the upstream event log because Hudi write-time combining can collapse records before CDC captures the commit.

## Enable CDC at table creation

CDC is a table-level capability:

```python
write_options = {
    "hoodie.table.name": "orders_cdc",
    "hoodie.datasource.write.table.type": "COPY_ON_WRITE",
    "hoodie.table.cdc.enabled": "true",
    "hoodie.table.cdc.supplemental.logging.mode": "DATA_BEFORE_AFTER",
    "hoodie.datasource.write.recordkey.field": "order_id",
    "hoodie.datasource.write.partitionpath.field": "event_date",
    "hoodie.table.ordering.fields": "source_lsn",
}
```

Hudi's CDC supplemental logging modes trade storage against read computation:

- `DATA_BEFORE_AFTER` stores before and after images and has the highest logging cost.
- `DATA_BEFORE` stores the before image; the reader derives the after image.
- `OP_KEY_ONLY` stores operation and key; the reader derives both images.

The technical specification lists these values in uppercase. Hudi's original CDC release notes warn that, once persisted, CDC enablement and the supplemental logging mode cannot be changed for that table. Treat the choice as durable table design and verify behavior on the exact writer version.

## Read CDC changes

Spark DataSource:

```python
cdc_options = {
    "hoodie.datasource.query.type": "incremental",
    "hoodie.datasource.query.incremental.format": "cdc",
    "hoodie.datasource.read.begin.instanttime": begin_completion_time,
    "hoodie.datasource.read.end.instanttime": end_completion_time,
}

events = spark.read.format("hudi").options(**cdc_options).load(table_path)
events.select("op", "ts_ms", "before", "after").orderBy("ts_ms").show(truncate=False)
```

Or Spark SQL:

```sql
SELECT *
FROM hudi_table_changes(
  'lake.orders_cdc',
  'cdc',
  '20260823090000000',
  '20260823100000000'
);
```

The CDC schema follows a Debezium-like shape with operation, change time, before image, and after image. For an insert, before is null. For a delete, after is null. For an update, both are populated in the logical result. Ordering by `ts_ms` sequences commits, but it does not define an order among rows with the same value. Use a stable source sequence carried in the record images when within-commit ordering matters.

Do not parse before and after with an assumed application schema forever. Schema evolution can change their content, so version the consumer and test range reads across schema changes.

## Checkpoint both formats correctly

Hudi 1.x incremental and CDC ranges use completion time. Current DataSource documentation defines inclusive begin and end boundaries. Freeze a stable end completion time for a batch and advance the next lower bound only after the consumer output commits.

CDC consumers should make event identity idempotent. A practical identity combines table, commit completion or CDC timestamp, operation, and record key as exposed by the result. Latest-state consumers should upsert by the Hudi business key and use the same ordering rule as the source.

Hudi Streamer manages completion-time checkpoints for Hudi incremental sources and stores them in target commit metadata. Use it when its transformation model fits instead of inventing checkpoint translation.

## Validate the chosen contract

Create one key with insert, two updates, and delete as four separate Hudi commits across a bounded window. Confirm:

- Latest state contains the expected final representation for changed records.
- CDC contains each committed operation with correct null before/after sides, and explicit sorting produces the required replay order.
- Splitting the window at a commit boundary and unioning results matches one full-window read.
- A retry does not duplicate downstream effects.
- Cleaning retention exceeds the maximum consumer outage.

If the business asks later for an intermediate transition that latest state discarded, it cannot be reconstructed from that result. Keep CDC for committed table history and retain the upstream source log when every original mutation has value.

## Official Documentation

- [Apache Hudi Spark quick start](https://hudi.apache.org/docs/quick-start-guide/)
- [Apache Hudi SQL queries](https://hudi.apache.org/docs/sql_queries/)
- [Apache Hudi technical specification](https://hudi.apache.org/learn/tech-specs/)
- [Apache Hudi Spark DataSource configurations](https://hudi.apache.org/docs/basic_configurations/)
- [Apache Hudi 0.13 CDC release notes](https://hudi.apache.org/releases/release-0.13.0/)

## Conclusion

Use `latest_state` when the consumer needs the final row for every key changed in a window. Use CDC when every committed transition, delete, or before image is meaningful, and keep the upstream log when every source mutation must survive write-time combining. Decide at table design time, account for current COW-only CDC support, explicitly order replay results, and checkpoint both formats by completion time.
