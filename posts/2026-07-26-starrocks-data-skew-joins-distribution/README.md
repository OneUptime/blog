# How to Fix Data Skew in StarRocks Hash Joins and Distributed Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Data Skew, Hash Join, Bucketing, Query Tuning

Description: Find whether StarRocks skew originates in stored tablets or runtime join shuffles, then repair keys, distribution, join strategy, or explicitly identified heavy values.

---

Data skew means one worker receives much more data or work than its peers. In StarRocks it usually appears in one of two places:

1. **storage skew:** a hash bucket/tablet is much larger or hotter because the table's distribution key is uneven;
2. **execution skew:** a shuffle sends a frequent join or group key to one runtime partition, even when the base tables are stored evenly.

These are related but not identical. Randomly distributed input can still become skewed when a hash join shuffles on `customer_id`. Adding more table buckets does not split one heavy join-key value, because identical values still hash to the same destination.

## Confirm Skew in the Query Profile

Start with:

```sql
EXPLAIN VERBOSE
SELECT ...
FROM fact_orders o
JOIN customer_dim c
  ON o.customer_id = c.customer_id;
```

Record the join strategy:

- `BROADCAST`;
- `SHUFFLE`;
- `BUCKET_SHUFFLE`;
- colocate.

Then capture runtime evidence:

```sql
SET enable_profile = true;
SELECT ...;
SELECT get_query_profile(last_query_id())\G
```

Or run a safe reproduction:

```sql
EXPLAIN ANALYZE
SELECT ...;
```

Look for large max/min differences between instances in:

- scan input/output rows;
- exchange rows and bytes;
- join build/probe rows;
- operator total time;
- peak memory;
- spill bytes;
- hash-table size.

If merged profile metrics hide the outlier, use detailed profile structure for a focused session:

```sql
SET pipeline_profile_level = 2;
```

Level 2 produces much larger profiles and disables some visualization tooling; return to the default after diagnosis.

A classic shuffle-skew profile has one join probe instance processing far more rows and running much longer while other instances finish early.

## Find the Heavy Values

Measure the exact join key after the same filters as the slow query:

```sql
SELECT customer_id, COUNT(*) AS row_count
FROM fact_orders
WHERE order_date >= '2026-07-01'
  AND order_date <  '2026-08-01'
GROUP BY customer_id
ORDER BY row_count DESC
LIMIT 20;
```

Measure `NULL` and default sentinels separately:

```sql
SELECT
  SUM(IF(customer_id IS NULL, 1, 0)) AS null_rows,
  SUM(IF(customer_id = 0, 1, 0)) AS zero_rows,
  COUNT(*) AS total_rows
FROM fact_orders
WHERE order_date >= '2026-07-01'
  AND order_date <  '2026-08-01';
```

One `"unknown"`, empty string, `0`, or `NULL` population is often the heavy hitter. Determine whether those rows can join at all. For a normal equality join, `NULL = NULL` is not true; filtering non-matching null keys before shuffle can eliminate a large amount of pointless movement without changing results for an inner join. Outer joins require more careful branch semantics.

Refresh table and column statistics if estimated and actual cardinalities differ sharply. Incorrect estimates can cause an accidental broadcast or poor join order in addition to skew.

## Determine Whether the Base Table Is Skewed

Inspect distribution:

```sql
SHOW CREATE TABLE fact_orders;
SHOW PARTITIONS FROM fact_orders;

SELECT DISTRIBUTE_TYPE, DISTRIBUTE_KEY, DISTRIBUTE_BUCKET
FROM information_schema.tables_config
WHERE TABLE_SCHEMA = 'analytics'
  AND TABLE_NAME = 'fact_orders';
```

Use tablet/BE metrics and scan profiles to compare stored bytes and rows. If one tablet is consistently larger before any exchange, the distribution key is the likely cause.

Good hash-bucketing keys have:

- high cardinality;
- stable values;
- reasonably even frequency;
- usefulness in common equality filters or large joins.

A low-cardinality `country_code` or highly uneven `tenant_id` is often poor by itself. More buckets cannot spread a single country's or tenant's rows.

## Repair Storage Distribution

Options include:

### Use a higher-cardinality key

```sql
DISTRIBUTED BY HASH(order_id)
```

This balances orders well, but tenant-scoped filters and joins may lose bucket locality. Table distribution is a workload trade-off, not a pure cardinality contest.

### Use a composite key

```sql
DISTRIBUTED BY HASH(tenant_id, order_id)
```

This splits large tenants while retaining tenant information in the hash. It also means a predicate on `tenant_id` alone cannot calculate one exact bucket, and colocated joins need the compatible composite layout.

### Use random bucketing

For append-only Duplicate Key tables:

```sql
DISTRIBUTED BY RANDOM
```

Random bucketing resists key skew but gives up hash-bucket pruning, bucket-shuffle locality, and colocation. It is supported only for Duplicate Key tables.

### Isolate exceptional values

If one tenant is larger than all others, a separate table or partitioning strategy may make capacity, retention, and queries more predictable. Do this only when query logic can route and union the data safely.

Since v3.2, shared-nothing StarRocks can modify some distribution properties:

```sql
ALTER TABLE fact_orders
DISTRIBUTED BY HASH(tenant_id, order_id) BUCKETS 64;
```

The operation is asynchronous and rewrites data. Current documentation says this post-creation distribution optimization is not supported in shared-data mode. Capacity-test and monitor `SHOW ALTER TABLE`; for unsupported cases, build a replacement table and migrate.

## Choose the Right Join Strategy

### Broadcast a genuinely small build side

If the dimension remains small after filters, broadcast can avoid shuffling the large fact side:

```sql
SELECT ...
FROM fact_orders o
JOIN [BROADCAST] customer_dim c
  ON o.customer_id = c.customer_id;
```

But broadcast duplicates the build table on every participating node. A stale low row-count estimate can create memory pressure. Check actual build bytes and `HashTableMemoryUsage`.

### Shuffle two large sides

Shuffle is the general large-large strategy:

```sql
SELECT ...
FROM fact_a a
JOIN [SHUFFLE] fact_b b
  ON a.customer_id = b.customer_id;
```

It balances only if the join-key values are balanced. It cannot fix a dominant value by itself.

### Use bucket shuffle or colocation

Bucket Shuffle moves one table into the other table's existing bucket layout. Colocate Join keeps compatible buckets and replicas together so matching rows join locally.

They reduce network cost when:

- join expressions contain the bucket keys;
- bucket key types/order are compatible;
- bucket counts and, for colocation, replica placement align;
- the colocation group is stable.

Locality does not remove key skew. One colocated bucket can still dominate CPU and memory.

Join hints are diagnostic tools. StarRocks disables join reordering for a hinted join, so the SQL's left/right order becomes more important. Verify with `EXPLAIN`.

## Handle Runtime Heavy Hitters

### Filter impossible keys early

For an inner join where sentinel `0` has no matching dimension row:

```sql
... FROM (
  SELECT *
  FROM fact_orders
  WHERE customer_id IS NOT NULL
    AND customer_id <> 0
) o
JOIN customer_dim c
  ON o.customer_id = c.customer_id
```

Prove the business invariant before deploying.

### Salt both sides correctly

Salting appends a deterministic shard to the heavy join key, such as:

```text
salt = MOD(order_id, 16)
salted key = (customer_id, salt)
```

For a join, the other side must contain a matching copy for every required salt value, or rows will be lost. This is practical when the other side is small enough to expand. For aggregation, aggregate by `(key, salt)` first and then re-aggregate by `key`.

Choose the number of salts from the heavy value's size and available parallelism. Salting every value adds unnecessary data movement; isolate only confirmed heavy hitters where possible.

### Use Skew Join V2 for explicit heavy values

Current StarRocks provides Skew Join V2, which combines shuffle for normal values with broadcast handling for explicitly named skew values.

Enable it for the session:

```sql
SET enable_optimize_skew_join_v1 = false;
SET enable_optimize_skew_join_v2 = true;
```

Then identify values in the hint:

```sql
SELECT ...
FROM fact_orders o
JOIN [skew|o.customer_id(0, 42)] customer_dim c
  ON o.customer_id = c.customer_id;
```

Use `EXPLAIN VERBOSE` and look for the split, broadcast, shuffle, and union branches.

Guardrails from the official documentation:

- V2 does not automatically discover values from statistics; values are manual;
- only INNER, LEFT, LEFT SEMI, and LEFT ANTI joins are supported currently;
- the skewed large table must be on the left;
- supported value types and complex-expression support are limited;
- the hint prevents join reordering;
- too many skew values make the broadcast branch expensive.

Benchmark V2 against a corrected schema, filtered query, and normal optimizer plan. A hint tied to today's heavy values needs monitoring as data changes.

## Verify the Fix End to End

Compare before and after:

- query wall time and cumulative CPU;
- max/min rows and time per instance;
- peak memory per node;
- exchange bytes;
- spill bytes;
- table tablet-size distribution;
- ingestion and compaction impact;
- result checksum and row count.

Test with current and expected future heavy keys. A rewrite that balances July's tenant mix may fail when a different tenant grows.

Use this order:

1. prove skew in per-instance profile metrics;
2. identify exact heavy values;
3. separate stored-tablet skew from runtime shuffle skew;
4. correct filters, statistics, and join side/strategy;
5. repair table distribution if storage is skewed;
6. use salting or Skew Join only for residual heavy hitters;
7. validate query results and cluster-wide resource effects.

## Official Documentation

- [StarRocks Skew Join V2](https://docs.starrocks.io/docs/using_starrocks/skew_join_v2/)
- [StarRocks Query Profile tuning recipes](https://docs.starrocks.io/docs/best_practices/query_tuning/query_profile_tuning_recipes/)
- [StarRocks query hints and join strategies](https://docs.starrocks.io/docs/best_practices/query_tuning/query_hint/)
- [StarRocks bucketing best practices](https://docs.starrocks.io/docs/best_practices/bucketing/)
- [StarRocks data distribution](https://docs.starrocks.io/docs/table_design/data_distribution/)
- [StarRocks Colocate Join](https://docs.starrocks.io/docs/using_starrocks/Colocate_join/)
