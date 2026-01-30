# How to Implement PostgreSQL Query Parallelization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PostgreSQL, Performance, Parallelization, Database

Description: Learn how to configure and optimize parallel query execution in PostgreSQL for improved performance on large datasets.

---

PostgreSQL introduced parallel query execution in version 9.6, revolutionizing how the database handles large datasets. By distributing work across multiple CPU cores, parallel queries can dramatically reduce execution time for complex operations. This guide walks you through configuring and optimizing parallel query execution in PostgreSQL.

## Understanding Parallel Query Execution

Parallel query execution allows PostgreSQL to split a single query into multiple parts, process them simultaneously across different CPU cores, and combine the results. This is particularly beneficial for sequential scans, hash joins, and aggregate operations on large tables.

## Key Configuration Parameters

PostgreSQL provides several parameters to control parallel query behavior. These settings can be configured in `postgresql.conf` or set per-session.

### max_parallel_workers

This parameter sets the maximum number of workers that can be used for parallel operations system-wide:

```sql
-- Set maximum parallel workers for the entire system
ALTER SYSTEM SET max_parallel_workers = 8;

-- Apply changes (requires reload)
SELECT pg_reload_conf();
```

### max_parallel_workers_per_gather

Controls how many workers can be assigned to a single parallel operation:

```sql
-- Set maximum workers per query
SET max_parallel_workers_per_gather = 4;

-- Or permanently in postgresql.conf
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
```

### parallel_tuple_cost and parallel_setup_cost

These cost parameters influence when the query planner chooses parallel execution:

```sql
-- Default is 0.1, lower values encourage parallelization
SET parallel_tuple_cost = 0.01;

-- Default is 1000, lower values make parallel plans more likely
SET parallel_setup_cost = 100;
```

### min_parallel_table_scan_size

Determines the minimum table size before parallelization is considered:

```sql
-- Default is 8MB, adjust based on your workload
SET min_parallel_table_scan_size = '8MB';
```

## When Parallelization Kicks In

PostgreSQL automatically considers parallel execution when:

1. The table size exceeds `min_parallel_table_scan_size`
2. The estimated cost of the parallel plan is lower than the sequential plan
3. The query involves operations that support parallelization (seq scans, hash joins, aggregates)
4. Sufficient workers are available based on `max_parallel_workers`

To force parallel execution for testing, you can temporarily adjust the cost parameters:

```sql
-- Encourage parallelization for testing
SET parallel_setup_cost = 0;
SET parallel_tuple_cost = 0;
SET min_parallel_table_scan_size = 0;
```

## Analyzing Parallel Plans with EXPLAIN ANALYZE

Use `EXPLAIN ANALYZE` to verify that your queries are using parallel execution:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT COUNT(*), AVG(amount)
FROM large_transactions
WHERE transaction_date > '2024-01-01';
```

A parallel plan will show output similar to:

```
Finalize Aggregate  (cost=154895.76..154895.77 rows=1 width=40) (actual time=1523.456..1525.789 rows=1 loops=1)
  ->  Gather  (cost=154895.54..154895.75 rows=2 width=40) (actual time=1520.123..1525.654 rows=3 loops=1)
        Workers Planned: 2
        Workers Launched: 2
        ->  Partial Aggregate  (cost=153895.54..153895.55 rows=1 width=40) (actual time=1512.345..1512.346 rows=1 loops=3)
              ->  Parallel Seq Scan on large_transactions  (cost=0.00..145678.00 rows=4166667 width=8) (actual time=0.024..892.456 rows=3333333 loops=3)
                    Filter: (transaction_date > '2024-01-01'::date)
Planning Time: 0.234 ms
Execution Time: 1526.012 ms
```

Key indicators of parallel execution:
- `Gather` node collecting results from workers
- `Workers Planned` and `Workers Launched` showing parallel workers
- `Parallel Seq Scan` instead of regular `Seq Scan`
- `loops=3` indicating work distributed across leader and 2 workers

## Practical Configuration Example

Here is a balanced configuration for a server with 8 CPU cores:

```sql
-- postgresql.conf settings
max_worker_processes = 8
max_parallel_workers = 8
max_parallel_workers_per_gather = 4
max_parallel_maintenance_workers = 4
parallel_tuple_cost = 0.1
parallel_setup_cost = 1000
min_parallel_table_scan_size = 8MB
min_parallel_index_scan_size = 512kB
```

## Limitations and Considerations

While powerful, parallel queries have limitations:

1. **Not all operations support parallelization**: Certain functions marked as `PARALLEL UNSAFE` prevent parallel execution
2. **Overhead costs**: Small tables may perform worse with parallel queries due to coordination overhead
3. **Resource contention**: Excessive parallelization can overwhelm CPU and memory resources
4. **Transaction isolation**: Queries in serializable isolation level cannot use parallel workers
5. **Cursor operations**: Queries using cursors run without parallel workers

Check if a function is parallel-safe:

```sql
SELECT proname, proparallel
FROM pg_proc
WHERE proname = 'your_function_name';
-- 's' = safe, 'r' = restricted, 'u' = unsafe
```

## Monitoring Parallel Query Performance

Track parallel query effectiveness with:

```sql
SELECT query, calls, mean_exec_time, rows
FROM pg_stat_statements
WHERE query LIKE '%your_table%'
ORDER BY mean_exec_time DESC;
```

## Conclusion

PostgreSQL query parallelization is a powerful feature that can significantly improve performance on large datasets. By properly configuring `max_parallel_workers`, tuning cost parameters, and understanding when parallelization activates, you can achieve substantial performance gains. Always test with `EXPLAIN ANALYZE` to verify your queries are benefiting from parallel execution and monitor for resource contention in production environments.
