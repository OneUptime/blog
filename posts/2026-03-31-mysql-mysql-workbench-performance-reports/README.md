# How to Use MySQL Workbench Performance Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Workbench, Performance, Report, Monitoring

Description: Learn how to use MySQL Workbench Performance Reports to identify slow queries, full table scans, and resource-intensive statements using performance_schema data.

---

## Introduction

MySQL Workbench includes a Performance Reports section that surfaces pre-built reports from `performance_schema`. These reports identify the top resource-consuming queries, statements with errors, full table scans, and more - without requiring you to write complex `performance_schema` queries manually. This makes Workbench an excellent starting point for query performance analysis.

## Accessing Performance Reports

Connect to a MySQL server in Workbench, then navigate to:

```text
Navigator > Performance > Performance Reports
```

The Performance Reports panel is listed under the **Performance** heading in the Navigator sidebar when connected to a server.

## Report Categories

Workbench organizes performance reports into groups:

### Statement Analysis

- **Top 10 Statements by Total Time** - queries consuming the most cumulative execution time
- **Top 10 Statements by Average Latency** - queries with highest average execution time per call
- **Top 10 Statements by Max Latency** - queries with worst-case execution time
- **Top 10 Statements by Number of Errors** - queries generating the most errors

### Schema Statistics

- **Top 10 Tables by Total I/O** - most I/O-intensive tables
- **Top 10 Tables by Average I/O Latency** - tables with slowest I/O
- **Top 10 Tables with Most Contention** - tables causing the most lock waits
- **Statements Causing Temporary Disk Tables** - queries that spill to disk

### InnoDB Reports

- **InnoDB Buffer Pool Usage** - hit rate, pages read, pages written
- **InnoDB I/O Summary** - read and write throughput

## Using Statement Analysis Reports

Click **Top 10 Statements by Total Time**. Workbench runs:

```sql
SELECT
  SCHEMA_NAME AS db,
  DIGEST_TEXT AS query,
  COUNT_STAR AS exec_count,
  SUM_TIMER_WAIT/1000000000000 AS total_latency_s,
  AVG_TIMER_WAIT/1000000000000 AS avg_latency_s,
  SUM_ROWS_EXAMINED AS rows_examined,
  SUM_ROWS_SENT AS rows_sent
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

Results show normalized query digests with execution counts and timing.

## Identifying Full Table Scans

The **Statements with Full Table Scans** report shows queries that never use an index:

```sql
SELECT
  SCHEMA_NAME,
  DIGEST_TEXT,
  COUNT_STAR AS exec_count,
  SUM_NO_INDEX_USED AS full_scans
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_NO_INDEX_USED > 0
ORDER BY SUM_NO_INDEX_USED DESC;
```

For each query found, run `EXPLAIN` to confirm and add an appropriate index:

```sql
EXPLAIN SELECT * FROM orders WHERE customer_email = 'test@example.com';

ALTER TABLE orders ADD INDEX idx_customer_email (customer_email);
```

## Exporting Reports

Click the **Export** button in any report to save results as CSV or JSON for sharing with the team or loading into monitoring tools.

## Resetting Performance Schema Data

After making optimizations, reset the statistics to measure fresh performance:

```sql
CALL sys.ps_truncate_all_tables(FALSE);
-- Or for a specific table:
TRUNCATE TABLE performance_schema.events_statements_summary_by_digest;
```

## Combining with Visual EXPLAIN

From a statement analysis report, copy a slow query digest, then paste it into the SQL editor. Click the **Execute (Explain)** button (lightning bolt with magnifying glass icon) in the toolbar, or run the query and switch to the **Execution Plan** tab in the results panel. For example, with a query like:

```sql
SELECT o.*, c.email
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending';
```

Workbench renders a graphical execution plan diagram with colored boxes indicating operation costs, making bottlenecks easy to spot.

## Summary

MySQL Workbench Performance Reports provide instant visibility into query performance without writing complex `performance_schema` queries. Use Statement Analysis reports to find the costliest queries, Schema Statistics reports to identify hot tables, and combine findings with Visual EXPLAIN to diagnose and fix performance bottlenecks efficiently.
