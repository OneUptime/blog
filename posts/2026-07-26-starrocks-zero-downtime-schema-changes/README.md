# How to Run Zero-Downtime Schema Changes on Large StarRocks Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Schema Change, Database Migration, High Availability, SQL

Description: Plan online StarRocks schema changes with fast evolution, monitored ALTER jobs, expand-contract rollout, or an atomic table swap.

---

Zero downtime is an operational outcome, not a property of every `ALTER TABLE`. StarRocks can apply some changes through metadata or linked schemas, while others create tablets and rewrite large amounts of data before an internal swap.

Choose the migration path from the actual execution mode, client compatibility, and change stream. For an asynchronous path, a successful DDL submission only means a job was accepted.

## Classify the Change Before Running It

StarRocks documentation describes three schema-change paths:

- Linked schema change reuses existing data without transformation, such as a compatible column addition.
- Direct schema change transforms values without re-sorting the whole dataset, such as some type changes.
- Sorted schema change reorders data and is the most expensive path.

The exact path depends on table model, keys, column position, type conversion, indexes, and version. Test the production `SHOW CREATE TABLE` and exact DDL on a representative staging copy. Do not infer cost from the word `ADD` or `DROP`.

Capture a baseline:

```sql
SHOW CREATE TABLE analytics.orders;
SHOW PARTITIONS FROM analytics.orders;
SHOW ALTER TABLE COLUMN FROM analytics
WHERE TableName = 'orders'
ORDER BY CreateTime DESC
LIMIT 10;
```

Also inventory synchronous and asynchronous materialized views, loading jobs, privileges, and applications that depend on the affected columns. Renaming a column causes materialized views built on the old name to stop taking effect and requires rebuilding them.

## Prefer an Expand-Contract Rollout

For an application-visible change, separate it into compatible releases:

1. Expand: add a nullable column or a column with a safe default.
2. Deploy writers that populate both old and new representations.
3. Backfill old rows if required.
4. Deploy readers that prefer the new representation.
5. Verify adoption and data quality.
6. Contract: remove the old column in a later maintenance window.

Example expansion:

```sql
ALTER TABLE analytics.orders
ADD COLUMN status_v2 VARCHAR(64) NULL
AFTER status;
```

Existing readers ignore the new column. Avoid positional `SELECT *` consumers and loaders whose column order is implicit; they make even additive changes incompatible.

Column position can affect whether StarRocks can use a lightweight path. If display order is not important, adding at the end is often easier than inserting into a key or sorted prefix. Validate this for the actual table.

## Use Fast Schema Evolution Where It Is Available

Fast Schema Evolution is designed to make adding and dropping columns faster and less resource intensive.

Version boundaries matter:

- Shared-nothing support begins in v3.2.0.
- Shared-data support begins in v3.3.0.
- The legacy table property is chosen when the table is created and cannot generally be enabled later with `ALTER TABLE`.
- StarRocks v4.1 adds Fast Schema Evolution v2 for cloud-native tables in shared-data clusters.

For a new table on a supported release:

```sql
CREATE TABLE analytics.orders (
  order_date DATE NOT NULL,
  order_id BIGINT NOT NULL,
  status VARCHAR(32) NULL
)
PRIMARY KEY (order_date, order_id)
PARTITION BY date_trunc('day', order_date)
DISTRIBUTED BY HASH(order_id)
PROPERTIES (
  'fast_schema_evolution' = 'true'
);
```

On v4.1 cloud-native tables, FSE v2 changes are normally synchronous and metadata-only at the FE. New v4.1 tables enable it by default, while tables inherited through an upgrade can retain legacy behavior until explicitly enabled.

Check `SHOW CREATE TABLE` and cluster configuration rather than assuming a default. Read the v4.1 downgrade requirements before enabling `cloud_native_fast_schema_evolution_v2`; older target versions may require disabling it and waiting for asynchronous jobs to finish before downgrade.

Fast evolution does not make every schema operation metadata-only. Sort-key changes, incompatible conversions, and structural redesign can still require a rewrite.

## Monitor a Standard In-Place ALTER

Outside synchronous paths such as Fast Schema Evolution v2, column, bucket, and rollup changes are asynchronous. Submit one controlled change:

```sql
ALTER TABLE analytics.orders
MODIFY COLUMN status VARCHAR(64) NULL;
```

Then watch the job:

```sql
SHOW ALTER TABLE COLUMN FROM analytics
WHERE TableName = 'orders'
ORDER BY CreateTime DESC
LIMIT 1;
```

Require a terminal `FINISHED` state. Record `JobId`, progress, timestamps, and `Msg`. If the operation is under `OPTIMIZE` rather than `COLUMN`, query:

```sql
SHOW ALTER TABLE OPTIMIZE FROM analytics
WHERE TableName = 'orders'
ORDER BY CreateTime DESC
LIMIT 1;
```

StarRocks permits only one ongoing schema change on a table. Column, partition, and rollup operations also cannot be combined in one `ALTER` statement. Serialize migrations in deployment automation.

During a rewrite, monitor:

- `starrocks_be_schema_change_mem_bytes`
- BE CPU, memory, disk I/O, and free space
- new tablet creation and unhealthy replicas
- compaction score and tablet versions
- Routine Load, Stream Load, and Flink failures
- query latency and scan throughput

Most non-lightweight changes create new tablets and rewrite existing data. Ensure capacity for both old and new structures plus compaction. Raising schema-change memory or tablet-creation timeouts should follow evidence from `Msg` and BE logs, not be a preemptive default.

## Cancel Carefully

StarRocks provides `CANCEL ALTER TABLE` for an in-progress job. Before using it, confirm the exact syntax for the operation and version and capture the job record. Cancellation is not a rollback after a job has finished.

Do not submit a second DDL repeatedly because progress appears slow. The one-operation limit will reject it, and repeated automation can obscure the original failure.

## Use a Shadow Table for an Incompatible Redesign

A new table plus atomic swap is useful when changing table model, primary key, distribution, or sort layout would otherwise be an expensive or unsupported in-place migration.

The high-level flow is:

```text
create orders_next
       |
backfill a consistent baseline
       |
mirror or replay changes made during backfill
       |
validate and drain lag
       |
ALTER TABLE orders SWAP WITH orders_next
```

Create the new schema explicitly. If the table model, primary key, and other characteristics copied by `LIKE` already match the target, you can begin from:

```sql
CREATE TABLE analytics.orders_next LIKE analytics.orders;
```

Then apply any supported changes before loading it. Backfill:

```sql
INSERT INTO analytics.orders_next
SELECT
  order_date,
  order_id,
  CAST(status AS VARCHAR(64)) AS status
FROM analytics.orders;
```

The backfill alone is not enough while writes continue. Choose one:

- dual-write old and new tables from the ingestion pipeline
- record a Kafka or CDC boundary, backfill, then replay every change after that boundary
- briefly fence writes only for the final delta if the downtime objective permits it

For Primary Key data, preserve delete events and ordering as well as upserts. Validate counts by partition, key uniqueness, nulls, aggregates, checksums or sampled rows, and query plans.

The cutover is synchronous and atomic:

```sql
ALTER TABLE analytics.orders
SWAP WITH orders_next;
```

After the swap, the old data is under the other table name. Dependent materialized views are automatically set inactive, so review and reactivate or rebuild them. Do not drop the old table immediately. First verify new reads, writes, privileges, loaders, statistics, and dependent views.

An immediate swap back is not a complete rollback if new writes have landed only in the new table. Keep change capture or dual-writing active until the rollback window closes, or those writes must be replayed.

## Validate the Finished Migration

For either path:

```sql
SHOW CREATE TABLE analytics.orders;
DESC analytics.orders;
```

Then prove:

1. The schema matches the reviewed target.
2. All partitions and replicas are healthy.
3. New and old application versions can coexist for the planned rollout.
4. Load jobs continue without filtered rows or schema errors.
5. Materialized views are active and refresh successfully.
6. Query plans and latency remain within SLO.
7. Backfill and post-boundary changes are both present.
8. A tested rollback path remains available.

The lowest-risk large-table migration is usually additive and staged. Use fast evolution for supported simple changes, monitored in-place ALTER for known rewrite paths, and an atomic swap only after solving the harder problem: keeping the shadow table current while the source is changing.

## Official Documentation

- [ALTER TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/ALTER_TABLE/)
- [SHOW ALTER TABLE](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/SHOW_ALTER/)
- [CREATE TABLE and Fast Schema Evolution](https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/CREATE_TABLE/)
- [Schema tuning recipes](https://docs.starrocks.io/docs/best_practices/query_tuning/schema_tuning/)
- [Schema change alert guidance](https://docs.starrocks.io/docs/administration/management/monitoring/alert/)
- [StarRocks table swap FAQ](https://docs.starrocks.io/docs/faq/Others/)
