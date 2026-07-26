# How Do You Choose Bucketing Columns and Bucket Counts in StarRocks?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Bucketing, Data Distribution, Table Design, Query Performance

Description: Choose StarRocks hash or random bucketing, distribution columns, and bucket counts from data balance, query locality, tablet size, and cluster parallelism.

---

Partitioning and bucketing solve different problems in StarRocks:

- partitioning skips coarse data ranges and supports lifecycle operations;
- bucketing divides each partition into tablets for placement and parallel execution.

A table can prune the right day and still perform badly because that partition has one hot tablet. It can also be perfectly balanced yet scan every tablet for a point lookup because its bucketing key does not match the filter.

StarRocks supports random bucketing and hash bucketing in current releases. Range-based distribution is available from v4.1 behind `enable_range_distribution`, but it is disabled by default and changes distribution semantics. Most existing operational decisions are still between hash and random.

## Choose Hash Bucketing for Locality

Hash bucketing maps rows with the same key values to the same bucket:

```sql
CREATE TABLE orders (
  order_id BIGINT NOT NULL,
  tenant_id BIGINT NOT NULL,
  order_time DATETIME NOT NULL,
  amount DECIMAL(18,2)
)
PRIMARY KEY (order_id, tenant_id, order_time)
PARTITION BY date_trunc('day', order_time)
DISTRIBUTED BY HASH(tenant_id)
BUCKETS 32;
```

Hash bucketing is useful when:

- equality predicates frequently constrain the distribution column;
- large tables join on the same key;
- local or bucket-shuffle aggregation/join is important;
- the key has enough distinct values to distribute rows evenly;
- the table type does not support random bucketing.

For Primary Key tables, the partitioning and bucketing columns must be included in the primary key. Aggregate and Unique Key tables have corresponding key-column constraints. Validate the complete schema, not only distribution balance.

## Choose the Bucketing Column

StarRocks' data-distribution documentation recommends a column that is both high-cardinality and frequently used as a query filter. When no column satisfies both:

- favor high cardinality for complex, large scans so all nodes can work evenly;
- favor a common equality filter for short selective queries where tablet pruning matters.

For example:

```sql
DISTRIBUTED BY HASH(tenant_id)
```

is good for tenant-scoped queries only if tenant sizes are not extremely skewed. A few "whale" tenants can make one bucket much larger and busier.

A composite key can spread data:

```sql
DISTRIBUTED BY HASH(tenant_id, order_id)
```

but changes locality. A predicate on `tenant_id` alone can no longer identify one hash result, and tenant-to-tenant joins may require more movement. StarRocks recommends no more than three bucketing columns; every added column should solve a measured distribution problem.

Profile real keys:

```sql
SELECT tenant_id, COUNT(*) AS rows_per_tenant
FROM orders
GROUP BY tenant_id
ORDER BY rows_per_tenant DESC
LIMIT 20;
```

Also test `NULL`, empty, default, and synthetic "unknown" values. One default key can dominate an otherwise high-cardinality column.

## Choose Random Bucketing for Simplicity and Skew Resistance

Random bucketing spreads incoming rows without a distribution key:

```sql
CREATE TABLE raw_events (
  event_time DATETIME,
  event_id BIGINT,
  payload JSON
)
DUPLICATE KEY(event_time, event_id)
DISTRIBUTED BY RANDOM;
```

It is appropriate for append-only Duplicate Key tables when balanced ingestion and scans matter more than bucket pruning or colocated joins.

Limits:

- random bucketing is supported from v3.1;
- it is supported only for Duplicate Key tables;
- randomly bucketed tables cannot join a colocation group;
- equality filters cannot calculate one target hash bucket, so all selected tablets may be scanned.

If no distribution clause is specified in current releases, a Duplicate Key table can use random bucketing by default. State the clause explicitly in long-lived production DDL when the choice matters to reviewers.

## Let StarRocks Pick the Count First

From v2.5.7, StarRocks can automatically set the bucket count when `BUCKETS` is omitted:

```sql
DISTRIBUTED BY HASH(tenant_id);
```

This is the recommended starting point for many tables. Automatic selection reduces guesswork and considers cluster resources and data volume. It is not a promise that the number will adapt forever for every distribution type; inspect the created partitions and revisit the design as data grows.

Specify a count manually when:

- a partition's raw data is expected to exceed roughly 100 GB;
- predictable parallelism or colocation requires an exact count;
- observed tablet sizes are too large or too small;
- a benchmark shows the automatic value is inadequate.

## Size Buckets from Data and Parallelism

Estimate:

```text
uncompressed or stored bytes per partition / target tablet bytes
```

Then check whether the count exposes enough parallel work across BEs/CNs without creating excessive tablet metadata and compaction overhead.

StarRocks' current best-practice guidance commonly targets tablets around 1–10 GB for established hash-bucket designs. Treat that as a starting range, not a strict limit. Compression, row width, update frequency, storage architecture, and StarRocks version all matter; v4.1 distribution feature documentation raises some maximum tablet-size behavior to 100 GB.

Example:

```text
240 GB/day ÷ 8 GB/tablet ≈ 30 buckets
```

Round to a value that distributes well across the executor fleet—perhaps 32—then measure. Replica count multiplies physical storage in shared-nothing mode but does not change logical rows per tablet.

Too few buckets cause:

- oversized tablets;
- limited scan and ingestion parallelism;
- hot compaction or update paths;
- poor distribution after adding nodes.

Too many cause:

- many tiny files/tablets;
- FE/BE metadata overhead;
- more compaction and scheduling work;
- small tasks that cannot amortize startup cost.

## Align Large Join Tables Only When It Pays

Colocate Join eliminates network movement when tables share a colocation group, compatible distribution-key types/order, bucket count, replica count, and replica placement:

```sql
PROPERTIES ("colocate_with" = "tenant_group")
```

This can be powerful for stable fact-to-fact joins on the bucket key. It also couples table layout. Do not force a poor distribution key solely to get colocation, and do not colocate a large table with a tiny dimension that is cheaper to broadcast.

Use `EXPLAIN` to confirm the optimizer selected colocate or bucket-shuffle execution. A matching column name is not proof; type, key order, table state, and placement matter.

## Inspect the Result After Loading

```sql
SHOW CREATE TABLE orders;
SHOW PARTITIONS FROM orders;

SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_MODEL,
       DISTRIBUTE_TYPE, DISTRIBUTE_KEY, DISTRIBUTE_BUCKET
FROM information_schema.tables_config
WHERE TABLE_SCHEMA = 'analytics'
  AND TABLE_NAME = 'orders';
```

Use Query Profiles to compare scan rows and time by instance. Distribution skew is visible when one scan or join driver processes far more rows than its peers.

Since v3.2, StarRocks can modify some distribution properties with `ALTER TABLE`, for example:

```sql
ALTER TABLE orders
DISTRIBUTED BY HASH(tenant_id, order_id) BUCKETS 64;
```

This is asynchronous and rewrites layout. StarRocks' documentation notes that shared-data mode does not currently support this post-creation distribution optimization. Check `SHOW ALTER TABLE` and plan capacity before relying on it.

## Use a Repeatable Decision Sequence

1. Choose partitioning from time/tenant lifecycle and range filters.
2. Decide whether bucket pruning/colocation is worth hash-key management.
3. Profile candidate key cardinality and heavy hitters.
4. Prefer auto bucket count unless size or colocation requires an explicit value.
5. Load production-shaped data.
6. Inspect tablet sizes and row distribution.
7. Profile selective filters, full scans, ingestion, compaction, and joins.
8. Revisit the layout when partitions, node count, or query patterns materially change.

The best bucketing design is a balance: enough distinct key values for even work, enough alignment for common queries, and enough—but not excessive—tablets for the cluster to execute in parallel.

## Official Documentation

- [StarRocks data distribution](https://docs.starrocks.io/docs/table_design/data_distribution/)
- [StarRocks bucketing best practices](https://docs.starrocks.io/docs/best_practices/bucketing/)
- [Data distribution feature support](https://docs.starrocks.io/docs/table_design/data_distribution/feature-support-data-distribution/)
- [Colocate Join](https://docs.starrocks.io/docs/using_starrocks/Colocate_join/)
- [Information Schema `tables_config`](https://docs.starrocks.io/docs/sql-reference/information_schema/tables_config/)
