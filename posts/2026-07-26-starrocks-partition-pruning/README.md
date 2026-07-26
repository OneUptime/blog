# Why Is StarRocks Scanning Every Partition? A Partition-Pruning Troubleshooting Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Partition Pruning, Query Tuning, Table Design, SQL

Description: Trace a StarRocks full-partition scan from the physical plan back to partition expressions, predicate types, boundaries, and table design.

---

StarRocks prunes partitions in the Frontend (FE) before scan tasks are scheduled. If `EXPLAIN` shows every partition, adding executor memory or more Backends will only make the unnecessary scan more expensive.

Start by distinguishing two layers:

- **partition pruning** skips catalog partitions based on the partition expression or key;
- **tablet pruning** skips hash buckets inside the selected partitions when an equality predicate constrains the bucketing key.

In a scan node, a result such as:

```text
partitionsRatio=1/365, tabletsRatio=4/64
```

means both layers worked. `365/365` is a partition problem. `1/365` with `64/64` may be entirely correct if the query has no equality condition on the hash bucketing column.

## Prove What the Planner Selected

Run the exact query with exact literals:

```sql
EXPLAIN COSTS
SELECT tenant_id, SUM(amount)
FROM analytics.orders
WHERE event_time >= '2026-07-25 00:00:00'
  AND event_time <  '2026-07-26 00:00:00'
GROUP BY tenant_id;
```

Find the scan node and record:

- `PREDICATES`;
- `partitions` or `partitionsRatio`;
- `tabletRatio`;
- estimated cardinality;
- the selected table/rollup.

Then inspect the real table definition and partitions:

```sql
SHOW CREATE TABLE analytics.orders;
SHOW PARTITIONS FROM analytics.orders;
```

Do not debug from a diagram or an old migration file. The live table may use a different partition expression, column type, granularity, or legacy range layout.

## Match the Predicate to the Partition Expression

A common time-series definition is expression partitioning:

```sql
CREATE TABLE analytics.orders (
  tenant_id BIGINT,
  event_time DATETIME,
  order_id BIGINT,
  amount DECIMAL(18,2)
)
ORDER BY (tenant_id, event_time)
PARTITION BY date_trunc('day', event_time)
DISTRIBUTED BY HASH(tenant_id);
```

Use a direct, typed half-open range on the source column:

```sql
WHERE event_time >= '2026-07-25 00:00:00'
  AND event_time <  '2026-07-26 00:00:00'
```

Half-open intervals avoid losing fractional-second values at `23:59:59` and map cleanly to adjacent partitions.

Avoid hiding the partition relationship in an application-specific expression:

```sql
-- Harder for the optimizer to reason about and easy to get semantically wrong.
WHERE DATE_FORMAT(event_time, '%Y-%m-%d') = '2026-07-25'
```

StarRocks supports pruning for documented expression-partition patterns, including several time transformations. Support is version-specific. If a transformed predicate does not prune, rewrite it as a range on the underlying column and compare `EXPLAIN`.

## Eliminate Implicit Type Conversions

The literal and column should have compatible types:

```sql
-- DATE column
WHERE event_date >= DATE '2026-07-01'
  AND event_date <  DATE '2026-08-01'

-- DATETIME column
WHERE event_time >= CAST('2026-07-01 00:00:00' AS DATETIME)
  AND event_time <  CAST('2026-08-01 00:00:00' AS DATETIME)
```

Watch for:

- a string partition column compared to a numeric literal;
- Unix epoch values compared to formatted dates;
- a cast applied to the partition column rather than the constant;
- application parameters bound with a different type;
- `DATETIME` and `DATE` boundary confusion.

Check how StarRocks normalized the condition in `PREDICATES`. If the scan predicate contains a cast around the partition column, try converting the constant or fixing the schema type instead.

## Check Boolean Logic and Constant Folding

An eligible range can be neutralized by another branch:

```sql
WHERE event_time >= '2026-07-25'
   OR tenant_id = 42
```

The second branch can match any date, so scanning all date partitions is correct.

Other traps include:

- an `OR` branch without a partition constraint;
- `COALESCE(partition_col, ...)`;
- a non-deterministic or unsupported function;
- a subquery whose value is not available during partition selection;
- a join-derived filter that arrives only at runtime;
- a prepared value that is `NULL` or wider than expected.

Reduce the query:

```sql
EXPLAIN
SELECT COUNT(*)
FROM analytics.orders
WHERE event_time >= '2026-07-25 00:00:00'
  AND event_time <  '2026-07-26 00:00:00';
```

If the minimal query prunes, add joins and predicate branches back one at a time. This separates a partition-definition problem from optimizer visibility introduced by the larger statement.

## Verify Range and List Boundaries

For legacy range partitioning, inspect each partition's upper bound. `VALUES LESS THAN` is exclusive; a monthly partition ending at `2026-08-01` contains July values but not August 1.

For list partitioning, confirm that the query literal exactly matches the stored partition value and type. A multi-column list or expression partition requires all relevant constraints for the narrowest pruning.

Also check for a default or future partition that spans far more data than expected. Dynamic/expression partition creation does not fix historical rows loaded into an incorrectly defined partition.

## Understand Time Zones

StarRocks `DATETIME` does not itself carry a time-zone offset. If applications convert UTC to a local day in SQL while partitions were defined from unconverted UTC values, the business-day range may legitimately touch two partitions—or the expression may not be invertible for pruning.

Make the contract explicit:

- storage time zone;
- session `time_zone`;
- partition day definition;
- application parameter time zone;
- daylight-saving behavior.

Generate UTC boundaries in the application or use one standardized, documented SQL conversion. Test days around a daylight-saving transition.

## Check Partition Count and Layout Health

Even successful pruning can be expensive if one selected partition contains huge data or thousands of tiny tablets. StarRocks' current partitioning guidance warns that very large partition counts increase FE metadata overhead; its best-practice guide uses roughly 100,000 total partitions as a red flag, not a target.

Choose partition granularity from:

- the most common filter window;
- retention and drop cadence;
- data volume per period;
- late-arriving data;
- FE metadata and tablet counts.

Daily partitions fit many event tables. Hourly partitions help only when queries and lifecycle operations are usually hourly and the resulting object count remains manageable.

## Validate Runtime Elimination Too

Once `EXPLAIN` shows a narrow partition ratio, use `EXPLAIN ANALYZE` or a captured Query Profile:

```sql
EXPLAIN ANALYZE
SELECT ...
```

Confirm actual scan rows and bytes fell. Partition pruning can work while segment/page pruning remains weak because the sort key does not match filters. Likewise, a low partition ratio with a high tablet ratio is not necessarily wrong: hash bucket pruning generally needs equality on the bucketing key.

Use this order:

1. Live `SHOW CREATE TABLE`.
2. Minimal typed predicate.
3. `EXPLAIN` partition and tablet ratios.
4. Add functions, OR branches, joins, and parameters back.
5. Confirm actual scan bytes in the profile.
6. Redesign partitioning only if normal query predicates cannot express the needed elimination.

Do not force named partitions as a permanent substitute for a broken business predicate. Explicit partition selection can be a diagnostic, but application correctness should come from a predicate whose semantics and pruning both match the table.

## Official Documentation

- [StarRocks data distribution](https://docs.starrocks.io/docs/table_design/data_distribution/)
- [Expression partitioning](https://docs.starrocks.io/docs/table_design/data_distribution/expression_partitioning/)
- [StarRocks partitioning best practices](https://docs.starrocks.io/docs/best_practices/partitioning/)
- [StarRocks EXPLAIN](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/plan_profile/EXPLAIN/)
- [StarRocks table clustering and read-time pruning](https://docs.starrocks.io/docs/best_practices/table_clustering/)
