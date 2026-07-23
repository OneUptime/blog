# Missing Index or Index Sprawl? A Safer SQL Server Tuning Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Index Tuning, Query Store, Performance, Database Administration

Description: Turn SQL Server missing-index signals into measured, consolidated index changes without accumulating redundant write overhead.

---

SQL Server missing-index suggestions are optimizer estimates for individual compilation scenarios. They are useful clues, not ready-to-run prescriptions. Creating every green-text recommendation can produce overlapping indexes, slower writes, longer maintenance, more storage, and a plan cache full of new alternatives.

A safer workflow begins with workload evidence, compares suggestions with the existing index set, designs the smallest useful change, and measures both reads and writes before keeping it.

## Understand What the Suggestion Does Not Know

The missing-index feature has important limits:

- it estimates benefit before execution and does not test the proposed index;
- it suggests disk-based nonclustered rowstore indexes, not every useful index type;
- it does not suggest unique or filtered indexes;
- it does not specify the best order of suggested key columns;
- it does not perform a size-versus-benefit analysis for included columns;
- separate queries can generate many similar variations;
- the missing-index DMVs retain at most 600 groups and are cleared by events such as restart, failover, database offline, and relevant table metadata changes.

The percentage displayed in a plan is estimated improvement for that optimization, not an observed reduction in duration. A recommendation on a rare query can be less valuable than a modest improvement to a high-frequency query.

## Start with the Workload

Use Query Store to rank statements by total resource contribution, tail latency, and business importance. Confirm a target execution with an actual plan and `SET STATISTICS IO, TIME` in a safe test. Record:

- execution frequency and parameter ranges;
- logical reads, CPU, duration, and returned rows;
- current plan ID and estimate errors;
- write volume on the target table;
- the operational window in which an index could be built.

Persisting plans in Query Store is important because missing-index DMV and plan-cache evidence is transient.

## Inventory Existing Indexes Before Designing Another

Inspect key and included columns in their defined order:

```sql
DECLARE @object_id int = OBJECT_ID(N'Sales.Orders');

SELECT
    i.index_id,
    i.name AS index_name,
    i.type_desc,
    i.is_unique,
    i.is_primary_key,
    i.is_disabled,
    i.has_filter,
    i.filter_definition,
    ic.key_ordinal,
    ic.is_included_column,
    c.name AS column_name
FROM sys.indexes AS i
JOIN sys.index_columns AS ic
  ON ic.object_id = i.object_id
 AND ic.index_id = i.index_id
JOIN sys.columns AS c
  ON c.object_id = ic.object_id
 AND c.column_id = ic.column_id
WHERE i.object_id = @object_id
ORDER BY i.index_id, ic.is_included_column, ic.key_ordinal, ic.index_column_id;
```

Then review usage over a known observation window:

```sql
SELECT
    i.name,
    us.user_seeks,
    us.user_scans,
    us.user_lookups,
    us.user_updates,
    us.last_user_seek,
    us.last_user_scan,
    us.last_user_update
FROM sys.indexes AS i
LEFT JOIN sys.dm_db_index_usage_stats AS us
  ON us.database_id = DB_ID()
 AND us.object_id = i.object_id
 AND us.index_id = i.index_id
WHERE i.object_id = OBJECT_ID(N'Sales.Orders')
ORDER BY i.index_id;
```

Usage counters are cumulative since the engine last started or counters were cleared, and they do not capture every business or constraint value. Never drop an index solely because its current seek count is zero. Check uptime, seasonal jobs, disaster-recovery operations, constraints, plan history, and replicas.

## Collect and Consolidate Missing-Index Signals

This query provides a prioritization signal, not a `CREATE INDEX` script:

```sql
SELECT TOP (25)
    DB_NAME(mid.database_id) AS database_name,
    OBJECT_SCHEMA_NAME(mid.object_id, mid.database_id) AS schema_name,
    OBJECT_NAME(mid.object_id, mid.database_id) AS table_name,
    migs.user_seeks,
    migs.user_scans,
    migs.avg_total_user_cost,
    migs.avg_user_impact,
    mid.equality_columns,
    mid.inequality_columns,
    mid.included_columns
FROM sys.dm_db_missing_index_group_stats AS migs
JOIN sys.dm_db_missing_index_groups AS mig
  ON mig.index_group_handle = migs.group_handle
JOIN sys.dm_db_missing_index_details AS mid
  ON mid.index_handle = mig.index_handle
WHERE mid.database_id = DB_ID()
ORDER BY
    (migs.user_seeks + migs.user_scans)
    * migs.avg_total_user_cost
    * (migs.avg_user_impact / 100.0) DESC;
```

Group suggestions by table and compare their equality columns, inequality columns, and includes. Look for a single index that can support several important queries without becoming excessively wide. A proposed `(CustomerId, Status)` index may subsume a recommendation on `(CustomerId)` for some access patterns, but `(Status, CustomerId)` is not interchangeable: leading-key order affects which predicates can seek efficiently.

## Design the Smallest Useful Index

Suppose the important query is:

```sql
SELECT OrderId, OrderDate, TotalAmount
FROM Sales.Orders
WHERE CustomerId = @CustomerId
  AND OrderDate >= @FromDate
ORDER BY OrderDate DESC;
```

A candidate might be:

```sql
CREATE INDEX IX_Orders_CustomerId_OrderDate
ON Sales.Orders (CustomerId, OrderDate DESC)
INCLUDE (TotalAmount);
```

`OrderId` need not be included if it is already present as the clustered key in every nonclustered index; verify the table design instead of assuming that. Keep output-only columns out of the key where possible, and include only columns whose lookup avoidance is worth the additional size and write cost.

Consider a filtered index when a stable predicate targets a small subset, even though the missing-index feature will not suggest it. Consider uniqueness when the data model guarantees it; uniqueness is a correctness property and can also help optimization. Both choices require independent design and testing.

## Test Read Benefit and Write Cost

On a representative restored copy or staging workload:

1. capture the baseline plan, reads, CPU, duration, and returned rows;
2. create one candidate index;
3. test common, selective, and high-volume parameter values;
4. replay representative inserts, updates, deletes, and maintenance;
5. measure index size, log generation, build duration, blocking, and TempDB use;
6. verify that other important queries did not regress.

Do not force the old or new plan during the comparison unless plan forcing is itself the hypothesis. Clear only the target test environment when a clean compilation is necessary; never flush a production-wide cache for convenience.

## Deploy with an Exit Plan

Script the exact `DROP INDEX` rollback, estimate free space, and choose supported online or resumable options only after checking the SQL Server version, edition, and operation restrictions. Monitor blocking and log growth during the build.

After deployment, compare Query Store intervals and index usage over a full business cycle. If the new index overlaps an old one, do not immediately drop the old index. First prove that its workload is covered, account for unique and constraint semantics, then disable or remove it through the normal change process with a recreation script retained.

The desired outcome is not “no missing-index warnings.” It is a smaller, intentional index portfolio that meets read targets while preserving acceptable write, storage, backup, and maintenance costs.

## Official Documentation

- [Tune nonclustered indexes with missing-index suggestions](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/tune-nonclustered-missing-index-suggestions?view=sql-server-ver17)
- [SQL Server and Azure SQL index architecture and design guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-index-design-guide?view=sql-server-ver17)
- [Nonclustered indexes with included columns](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/create-indexes-with-included-columns?view=sql-server-ver17)
- [sys.dm_db_index_usage_stats](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-index-usage-stats-transact-sql?view=sql-server-ver17)
- [CREATE INDEX](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-index-transact-sql?view=sql-server-ver17)
