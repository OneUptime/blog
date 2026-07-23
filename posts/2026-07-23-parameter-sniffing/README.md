# SQL Server Parameter Sniffing: How to Diagnose It and Choose the Right Fix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Parameter Sniffing, Query Store, Execution Plans, Performance Tuning

Description: Prove when parameter-sensitive plans cause unstable latency and select a targeted SQL Server remedy that fits the workload.

---

Parameter sniffing is normal SQL Server behavior: when a parameterized statement compiles, the optimizer can use the current parameter values to estimate cardinality and choose a plan. Reusing that plan avoids repeated compilation and is often beneficial.

The problem appears when different parameter ranges need materially different plans. A plan compiled for one selective customer may perform badly for a customer that owns millions of rows, or the reverse. Do not diagnose this merely because clearing the plan cache makes a query faster; that action changes every cached plan and proves only that recompilation changed something.

## Recognize the Pattern

Parameter sensitivity commonly produces:

- the same query text alternating between fast and slow executions;
- a performance change after restart, failover, statistics update, index maintenance, or recompilation;
- one cached plan with severe estimate errors for some parameter values;
- good performance for small result sets and poor performance for large ones, or vice versa;
- different plans when the call is faithfully reproduced with different compile-time values.

Similar symptoms can come from blocking, stale statistics, memory pressure, implicit conversions, or different client `SET` options. Exclude those before choosing a parameter-specific fix.

## Preserve History with Query Store

Query Store records query, plan, and runtime history at the database level. Check its state before relying on it:

```sql
SELECT
    actual_state_desc,
    desired_state_desc,
    current_storage_size_mb,
    max_storage_size_mb,
    readonly_reason
FROM sys.database_query_store_options;
```

Find a target query and compare runtime statistics by plan rather than looking only at an overall average:

```sql
SELECT
    q.query_id,
    p.plan_id,
    SUM(rs.count_executions) AS executions,
    CAST(SUM(rs.avg_duration * rs.count_executions)
         / NULLIF(SUM(rs.count_executions), 0) / 1000.0 AS decimal(18,2))
        AS weighted_avg_duration_ms,
    MAX(rs.max_duration) / 1000.0 AS max_duration_ms,
    LEFT(qt.query_sql_text, 4000) AS query_text
FROM sys.query_store_query_text AS qt
JOIN sys.query_store_query AS q
  ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan AS p
  ON p.query_id = q.query_id
JOIN sys.query_store_runtime_stats AS rs
  ON rs.plan_id = p.plan_id
WHERE qt.query_sql_text LIKE N'%usp_GetOrders%'
GROUP BY q.query_id, p.plan_id, qt.query_sql_text
ORDER BY max_duration_ms DESC;
```

Query Store aggregates values into intervals, so use it to identify patterns and then capture a controlled actual plan for representative values. On busy systems, capture plans and parameter data with narrowly scoped tooling and protect them as potentially sensitive.

## Compare Representative Executions

Test at least three values based on the real data distribution: selective, typical, and high-volume. Use the application's exact call form and parameter metadata. A literal query, a local variable, and an RPC call are not necessarily equivalent compilation scenarios.

In the actual execution plan, inspect:

1. the parameter list and compiled values in the statement properties;
2. estimated versus actual rows at the earliest large divergence;
3. join type, access method, key lookups, sorts, and memory grants;
4. spill and conversion warnings;
5. whether statistics represent the relevant skew and recent data.

If a selective compiled value produces nested loops and repeated lookups for a high-volume execution, or a high-volume value produces a scan for a highly selective execution, the evidence supports a parameter-sensitive plan problem. First verify that the query and indexes are reasonable; parameter sensitivity can expose an indexing problem rather than replace it.

## Prefer the Least Intrusive Durable Fix

### 1. Correct Query, Index, and Statistics Problems

Make predicates searchable, bind matching data types, and design indexes for the actual workload. Update statistics when they are stale or have an unrepresentative sample. Do not schedule indiscriminate full-scan updates as a parameter-sniffing fix; a new compilation can simply choose a plan optimized for the next unlucky value.

### 2. Use Parameter Sensitive Plan Optimization Where Available

SQL Server 2022 introduced Parameter Sensitive Plan (PSP) optimization for eligible equality predicates at database compatibility level 160. PSP can maintain multiple query variants behind a dispatcher plan for different cardinality ranges.

```sql
SELECT name, compatibility_level
FROM sys.databases
WHERE name = DB_NAME();

SELECT name, value, value_for_secondary
FROM sys.database_scoped_configurations
WHERE name = 'PARAMETER_SENSITIVE_PLAN_OPTIMIZATION';
```

PSP is not a promise that every sensitive statement receives variants. Confirm eligibility and actual Query Store or Showplan evidence. Test compatibility-level changes across the whole workload before production rollout.

### 3. Recompile the Statement When Compilation Cost Is Acceptable

`OPTION (RECOMPILE)` lets a statement optimize for each execution and avoids caching that statement's plan:

```sql
SELECT OrderId, OrderDate, TotalAmount
FROM Sales.Orders
WHERE CustomerId = @CustomerId
OPTION (RECOMPILE);
```

This can work well for an infrequent statement whose optimal plan varies substantially. It adds compilation CPU and reduces plan reuse, so it is risky for a very high-frequency query. Prefer statement-level recompile over recompiling an entire stored procedure when only one statement is sensitive.

### 4. Optimize for a Deliberate Value or for an Unknown Value

```sql
OPTION (OPTIMIZE FOR (@CustomerId = 41792));
-- or
OPTION (OPTIMIZE FOR UNKNOWN);
```

An explicit representative value can stabilize a workload when one plan is acceptable for nearly all executions, but it becomes stale as data distribution changes. `OPTIMIZE FOR UNKNOWN` uses average-distribution estimates; it is a compromise, not automatically a good plan for skewed data.

### 5. Split Distinct Workload Shapes

When small and large cases genuinely require different logic, route them to separate statements or procedures with clear predicates. Parameterized dynamic SQL through `sys.sp_executesql` can also create separate statement shapes while preserving safe parameter binding. Never concatenate untrusted values to manufacture plan separation.

### 6. Apply a Temporary Query Store Hint or Plan Force

On supported platforms, Query Store hints can add hints such as `RECOMPILE` without changing application text:

```sql
EXEC sys.sp_query_store_set_hints
    @query_id = 123,
    @query_hints = N'OPTION(RECOMPILE)';

-- Roll back after the application change or if monitoring regresses:
EXEC sys.sp_query_store_clear_hints @query_id = 123;
```

Forcing a known plan can be a useful incident mitigation when it is safe across parameter ranges. It is not a complete fix if no single plan serves the whole distribution. Record an owner, expiry condition, and rollback command for every force or hint.

## Avoid Broad, Unmeasured Remedies

Instance-wide or database-wide disabling of parameter sniffing changes many queries, including those that benefit from it. Assigning parameters to local variables often replaces sniffed values with generic estimates and hides intent. Clearing the procedure cache causes widespread recompilation and a temporary CPU spike. Use none of these as a first diagnostic step.

Validate the chosen remedy with a parameter matrix and realistic concurrency. Measure compilation CPU, duration, logical reads, memory grants, spills, and tail latency. Then monitor Query Store after data growth and statistics changes—the correct fix today can become tomorrow's regression if its assumptions are not recorded.

## Official Documentation

- [Parameter Sensitive Plan optimization](https://learn.microsoft.com/en-us/sql/relational-databases/performance/parameter-sensitive-plan-optimization?view=sql-server-ver17)
- [Query hints](https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-query?view=sql-server-ver17)
- [Query Store hints](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-hints?view=sql-server-ver17)
- [Tune performance with Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/tune-performance-with-the-query-store?view=sql-server-ver17)
- [Statistics](https://learn.microsoft.com/en-us/sql/relational-databases/statistics/statistics?view=sql-server-ver17)
