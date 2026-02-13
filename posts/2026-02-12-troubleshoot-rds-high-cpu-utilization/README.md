# How to Troubleshoot RDS High CPU Utilization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Troubleshooting, Performance, Database

Description: A systematic guide to diagnosing and fixing high CPU utilization on Amazon RDS instances, covering common causes and practical solutions.

---

You get the alert: RDS CPU utilization is above 80% and climbing. Your application might be slowing down, queries are backing up, and you need to figure out what's happening. Fast.

High CPU on an RDS instance usually comes down to one of a handful of causes. The trick is systematically narrowing down which one it is and then applying the right fix. Let's walk through the troubleshooting process step by step.

## Step 1: Confirm the Problem

First, check the current state and trend of CPU usage:

```bash
# Get CPU utilization for the last 2 hours with 5-minute intervals
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --start-time $(date -u -v-2H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average Maximum \
  --output table
```

Look at the pattern:
- **Sudden spike**: Something changed - a new deployment, a batch job, or an unusual traffic pattern
- **Gradual increase over days/weeks**: Data growth causing queries to become less efficient
- **Periodic spikes**: Scheduled jobs like reports, ETL processes, or maintenance tasks

## Step 2: Check Enhanced Monitoring

If you have [Enhanced Monitoring](https://oneuptime.com/blog/post/2026-02-12-enable-rds-enhanced-monitoring/view) enabled, it gives you a much more detailed view of what's consuming CPU:

```bash
# Check the process list from Enhanced Monitoring logs
aws logs get-log-events \
  --log-group-name /aws/rds/enhanced-monitoring \
  --log-stream-name db-YOURDBIRESOURCEID \
  --limit 5 \
  --query 'events[*].message' \
  --output text
```

Look at the CPU breakdown:
- **High user CPU**: The database engine is doing heavy computation - likely query processing
- **High system CPU**: Kernel overhead, could be excessive context switching from too many connections
- **High I/O wait**: CPU is idle but waiting for disk - not really a CPU problem, it's an I/O problem
- **High steal**: The underlying host is overloaded (noisy neighbor situation)

Also check the process list. Is it the database engine consuming CPU, or something else like a backup process?

## Step 3: Identify the Problematic Queries

This is where [Performance Insights](https://oneuptime.com/blog/post/2026-02-12-monitor-rds-with-performance-insights/view) shines. Open it and look at the Top SQL tab during the high CPU period.

If you don't have Performance Insights, you can query the database directly.

For PostgreSQL:

```sql
-- Find currently running queries sorted by duration
SELECT pid, now() - pg_stat_activity.query_start AS duration,
  query, state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state != 'idle'
  AND pid != pg_backend_pid()
ORDER BY duration DESC;

-- Find the most time-consuming queries from pg_stat_statements
SELECT query,
  calls,
  total_exec_time / 1000 AS total_seconds,
  mean_exec_time / 1000 AS avg_seconds,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

For MySQL:

```sql
-- Find currently running queries
SELECT id, user, host, db, command, time, state, info
FROM information_schema.processlist
WHERE command != 'Sleep'
ORDER BY time DESC;

-- Find slow queries from performance_schema
SELECT digest_text,
  count_star AS calls,
  ROUND(sum_timer_wait / 1000000000000, 2) AS total_seconds,
  ROUND(avg_timer_wait / 1000000000000, 4) AS avg_seconds,
  sum_rows_examined,
  sum_rows_sent
FROM performance_schema.events_statements_summary_by_digest
ORDER BY sum_timer_wait DESC
LIMIT 20;
```

## Common Causes and Fixes

### Cause 1: Missing Indexes

This is the most common cause of high CPU on database servers. A query that should use an index is instead scanning the entire table, processing millions of rows.

**How to spot it**: The problematic query has a high rows-examined-to-rows-returned ratio. For example, examining 5 million rows to return 10 results.

**How to fix it**:

```sql
-- Check the execution plan of the suspect query (PostgreSQL)
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 12345;

-- If you see "Seq Scan" on a large table, you need an index
CREATE INDEX CONCURRENTLY idx_orders_customer_id ON orders(customer_id);
```

```sql
-- For MySQL, check the execution plan
EXPLAIN SELECT * FROM orders WHERE customer_id = 12345;

-- If you see "type: ALL" (full table scan), add an index
ALTER TABLE orders ADD INDEX idx_customer_id (customer_id);
```

The `CONCURRENTLY` option in PostgreSQL lets you create the index without locking the table - critical for production.

### Cause 2: Too Many Connections

Every database connection consumes memory and creates context-switching overhead. If you have hundreds of connections each running queries, the CPU spends a lot of time switching between them.

**How to spot it**: Check the connection count:

```sql
-- PostgreSQL: count active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- MySQL: count connections
SHOW STATUS LIKE 'Threads_connected';
```

**How to fix it**: Implement connection pooling. PgBouncer for PostgreSQL, ProxySQL for MySQL, or RDS Proxy for a managed solution:

```bash
# Create an RDS Proxy (managed connection pooling)
aws rds create-db-proxy \
  --db-proxy-name my-db-proxy \
  --engine-family POSTGRESQL \
  --auth '[{"AuthScheme":"SECRETS","SecretArn":"arn:aws:secretsmanager:...","IAMAuth":"DISABLED"}]' \
  --role-arn arn:aws:iam::123456789012:role/rds-proxy-role \
  --vpc-subnet-ids subnet-abc123 subnet-def456
```

### Cause 3: Expensive Sorting and Aggregations

Queries with ORDER BY, GROUP BY, DISTINCT, or complex aggregations on large datasets burn CPU.

**How to spot it**: Look for queries with high CPU time in Performance Insights, especially those involving sorting or aggregation on unindexed columns.

**How to fix it**:

```sql
-- Add a composite index that covers both filtering and sorting
CREATE INDEX idx_orders_status_date ON orders(status, created_at DESC);

-- For aggregation queries, consider materialized views (PostgreSQL)
CREATE MATERIALIZED VIEW daily_order_stats AS
SELECT date_trunc('day', created_at) AS day,
  status,
  count(*) AS order_count,
  sum(total_amount) AS revenue
FROM orders
GROUP BY 1, 2;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_order_stats;
```

### Cause 4: Autovacuum or Maintenance (PostgreSQL)

PostgreSQL's autovacuum process can consume significant CPU, especially on tables with heavy write activity.

**How to spot it**: Check if autovacuum is running:

```sql
-- Check for running autovacuum processes
SELECT relname, phase, heap_blks_total, heap_blks_scanned,
  ROUND(100.0 * heap_blks_scanned / NULLIF(heap_blks_total, 0), 1) AS pct_complete
FROM pg_stat_progress_vacuum;
```

**How to fix it**: Don't disable autovacuum - that makes things worse long-term. Instead, tune it:

```bash
# Adjust autovacuum parameters in the RDS parameter group
aws rds modify-db-parameter-group \
  --db-parameter-group-name my-param-group \
  --parameters \
    "ParameterName=autovacuum_vacuum_cost_delay,ParameterValue=2,ApplyMethod=immediate" \
    "ParameterName=autovacuum_vacuum_cost_limit,ParameterValue=1000,ApplyMethod=immediate"
```

### Cause 5: Poorly Written Application Code

N+1 query patterns, queries inside loops, and missing pagination are application-level issues that hammer the database.

**How to spot it**: A simple query appearing thousands of times per second in Performance Insights.

**How to fix it**: This requires application changes. Common fixes:

```python
# BAD: N+1 query pattern - one query per order
orders = db.query("SELECT * FROM orders WHERE user_id = 123")
for order in orders:
    items = db.query(f"SELECT * FROM order_items WHERE order_id = {order.id}")

# GOOD: Single query with JOIN or batch loading
orders_with_items = db.query("""
    SELECT o.*, oi.*
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = 123
""")
```

## Step 4: Quick Relief - If You Need It Now

If CPU is critical and you need immediate relief while working on the root cause:

```bash
# Kill the most expensive running queries (PostgreSQL)
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE state = 'active' AND pid != pg_backend_pid()
  AND now() - query_start > interval '5 minutes';"
```

Or scale up the instance temporarily:

```bash
# Scale up to a larger instance (causes brief downtime)
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --db-instance-class db.r6g.2xlarge \
  --apply-immediately
```

Scaling up buys you time but doesn't fix the underlying problem. Always follow up with proper query optimization.

## Step 5: Prevent Future Issues

Set up [CloudWatch alarms](https://oneuptime.com/blog/post/2026-02-12-set-up-cloudwatch-alarms-for-rds-metrics/view) at a lower threshold (70%) to catch CPU trends before they become critical. Enable Performance Insights if you haven't already - it makes future troubleshooting dramatically faster. And consider adding slow query logging so you can proactively identify queries that need optimization before they cause problems.

High CPU is almost always a symptom, not the disease. The disease is usually an unoptimized query or a missing index. Fix the root cause and the CPU issue goes away on its own.
