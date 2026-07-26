# Duplicate, Aggregate, Unique, or Primary Key: Which StarRocks Table Type Fits Your Workload?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Table Design, Primary Key, Aggregate Key, Data Modeling

Description: Select a StarRocks table type by deciding whether duplicate history, pre-aggregation, last-value replacement, or high-frequency upserts define the workload.

---

StarRocks has four internal table types:

| Type | Rows with the same key | Best fit |
| --- | --- | --- |
| Duplicate Key | All rows remain | Raw events, logs, append-only facts |
| Aggregate | Value columns merge with declared aggregate functions | Pre-aggregated metrics |
| Unique Key | Latest row replaces older rows at read time | Legacy last-value update workloads |
| Primary Key | Latest row replaces older rows using a primary-key index and delete vectors | CDC, frequent upserts/deletes, real-time state |

The choice is permanent for that table. StarRocks does not support changing a Duplicate Key table into a Primary Key table in place. Correcting a wrong type means creating a new table and migrating data, so start from row semantics rather than query syntax.

## Use Duplicate Key for Immutable Facts

A Duplicate Key table keeps every loaded record, even when key values match:

```sql
CREATE TABLE raw_events (
  event_time DATETIME NOT NULL,
  event_id BIGINT NOT NULL,
  tenant_id BIGINT,
  event_type VARCHAR(64),
  payload JSON
)
DUPLICATE KEY(event_time, event_id)
PARTITION BY date_trunc('day', event_time)
DISTRIBUTED BY HASH(tenant_id);
```

Choose it when:

- data is append-only;
- duplicate source records must remain observable;
- analysts need arbitrary detail rather than one predefined aggregate;
- log or time-series ingestion dominates.

The `DUPLICATE KEY` columns historically also define physical order; since v3.3, Duplicate Key tables can define a separate sort key with `ORDER BY`. If both clauses are present, current documentation says `DUPLICATE KEY` does not control sorting. Confirm `SHOW CREATE TABLE` on the target version.

Duplicate Key is the only table type that supports random bucketing, available from v3.1. It does not update an old row simply because an `event_id` repeats.

## Use Aggregate for Stable Pre-Aggregation

An Aggregate table combines rows that share the aggregate key:

```sql
CREATE TABLE daily_page_views (
  event_date DATE NOT NULL,
  site_id BIGINT NOT NULL,
  city VARCHAR(64) NOT NULL,
  views BIGINT SUM DEFAULT '0',
  max_latency_ms BIGINT MAX DEFAULT '0'
)
AGGREGATE KEY(event_date, site_id, city)
PARTITION BY date_trunc('month', event_date)
DISTRIBUTED BY HASH(site_id);
```

Two rows for the same date, site, and city are merged: `views` is summed and the maximum latency is retained. This reduces storage scanned by repeated aggregate queries.

Choose it when:

- the grouping dimensions are stable;
- consumers need aggregate state, not every input record;
- supported functions such as `SUM`, `MIN`, `MAX`, `REPLACE`, `HLL_UNION`, `BITMAP_UNION`, or percentile states match the business logic;
- loads are naturally incremental.

Do not use it when analysts may later need a dimension that was discarded. Aggregation is semantic data loss by design. Generic aggregate-function states are available from v3.4 as a beta capability, with function limitations; verify support before treating them as a durable schema contract.

## Treat Unique Key as a Compatibility Choice

A Unique Key table retains the latest loaded row for each unique key:

```sql
CREATE TABLE customer_state_legacy (
  customer_id BIGINT NOT NULL,
  region VARCHAR(32),
  status VARCHAR(32),
  updated_at DATETIME
)
UNIQUE KEY(customer_id)
DISTRIBUTED BY HASH(customer_id);
```

Internally, Unique Key tables use merge-on-read semantics: multiple physical versions can exist and are reconciled during query. That keeps writes simple but can prevent predicate/index pushdown from being as effective as it is for a Primary Key table.

StarRocks documentation says Primary Key tables are more powerful and are replacing Unique Key tables. Choose Unique Key mainly for an existing schema, version constraint, or compatibility requirement that has been benchmarked. For a new high-frequency update workload, evaluate Primary Key first.

Since v3.3, Unique Key tables can specify `ORDER BY`, but the sort-key columns and unique-key columns must be the same set, although order may differ.

## Use Primary Key for Mutable Real-Time State

Primary Key tables are designed for upserts and deletes:

```sql
CREATE TABLE orders_current (
  order_id BIGINT NOT NULL,
  order_date DATE NOT NULL,
  tenant_id BIGINT NOT NULL,
  updated_at DATETIME,
  status VARCHAR(32),
  amount DECIMAL(18,2)
)
PRIMARY KEY(order_id, order_date, tenant_id)
PARTITION BY date_trunc('month', order_date)
DISTRIBUTED BY HASH(tenant_id)
ORDER BY (tenant_id, updated_at)
PROPERTIES (
  "enable_persistent_index" = "true"
);
```

The primary key has uniqueness and `NOT NULL` semantics. By default, a later committed upsert with the same key replaces the old logical row; the `updated_at` sort column does not determine update order. StarRocks uses a primary-key index to find previous locations and delete vectors to mark old versions, allowing queries to read the latest state without Unique Key's merge-on-read.

Choose it when:

- CDC from MySQL or another transactional system sends inserts, updates, and deletes;
- current state matters more than complete change history;
- frequent partial column updates are required;
- low-latency analytical reads must coexist with updates.

Schema constraints matter:

- partition and hash-bucketing columns must be included in the primary key;
- key columns must be declared before value columns;
- key columns are `NOT NULL`;
- encoded primary keys have a documented default maximum length of 128 bytes;
- Primary Key tables do not support random bucketing. They require hash bucketing under the default distribution semantics; from v4.1, range-based bucketing is also available when the FE configuration `enable_range_distribution` is enabled.

Since v3.0, the Primary Key sort key is decoupled from the primary key. Use `ORDER BY` for common filters while keeping the primary key focused on row identity plus required distribution columns.

## Separate Current State from History

A common mistake is asking one table to provide both last-value state and immutable change history.

Use two tables when both are required:

```text
CDC stream
├── Duplicate Key history table: every change event
└── Primary Key current table: latest row per business key
```

The history table supports audits and temporal reconstruction. The current table supports low-latency operational analytics. This is clearer than embedding an ever-changing version field into a "primary key" and accidentally preventing replacement.

## Account for Load Semantics

Ask how source records arrive:

- **Retries can duplicate rows:** Duplicate Key preserves retries; deduplicate upstream or choose a state model.
- **Out-of-order updates occur:** define ordering/version behavior in the load path and test stale updates.
- **Deletes must propagate:** use a Primary Key-compatible delete mechanism such as the load operation column documented for the connector.
- **Partial updates arrive:** Primary Key supports them, but update mode and column behavior are connector/load-specific.
- **Only aggregate deltas arrive:** Aggregate may be ideal if functions are associative and match the business measure.

Do not infer update semantics from SQL `INSERT` alone. StarRocks considers loads into Primary/Unique models as upsert-style changes based on keys.

## Make Sort, Partition, and Bucket Decisions Separately

Table type answers "what happens when keys collide." It does not fully answer:

- which partitions can be pruned;
- where rows are placed across nodes;
- which leading columns make prefix and zone-map pruning effective.

For example, `order_id` can identify a row, `order_date` can partition retention, `tenant_id` can distribute work, and `(tenant_id, updated_at)` can be the sort key. Primary Key rules require the partition and distribution columns to appear in the key, but each design dimension still has a different operational purpose.

## Validate with Production-Shaped Tests

Before committing:

1. load duplicate keys and prove the expected resulting rows;
2. replay out-of-order updates and deletes;
3. test partial updates and default/null handling;
4. measure ingestion, compaction, and query latency together;
5. inspect `SHOW CREATE TABLE` and `information_schema.tables_config`;
6. restore or rebuild the table through the actual recovery process.

Use Duplicate Key for facts, Aggregate for irreversible pre-aggregation, Primary Key for new mutable-state workloads, and Unique Key when a tested compatibility reason calls for its merge-on-read behavior.

## Official Documentation

- [StarRocks overview of table types](https://docs.starrocks.io/docs/table_design/table_types/)
- [Duplicate Key table](https://docs.starrocks.io/docs/table_design/table_types/duplicate_key_table/)
- [Aggregate table](https://docs.starrocks.io/docs/table_design/table_types/aggregate_table/)
- [Unique Key table](https://docs.starrocks.io/docs/table_design/table_types/unique_key_table/)
- [Primary Key table](https://docs.starrocks.io/docs/table_design/table_types/primary_key_table)
- [Capabilities of different table types](https://docs.starrocks.io/docs/table_design/table_types/table_capabilities/)
