# How to Optimize Slow Queries in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Query Optimization, Performance, SQL, Database Tuning

Description: A comprehensive guide to identifying and optimizing slow queries in PostgreSQL, covering common anti-patterns, index strategies, query rewrites, and performance tuning techniques.

---

Slow queries are the most common PostgreSQL performance issue. This guide provides practical techniques for identifying, analyzing, and optimizing slow queries to achieve dramatic performance improvements.

## Prerequisites

- PostgreSQL with pg_stat_statements enabled
- Understanding of EXPLAIN ANALYZE
- Access to query logs

## Identifying Slow Queries

### Enable Slow Query Logging

```sql
-- postgresql.conf
log_min_duration_statement = 1000  -- Log queries > 1 second
log_statement = 'none'             -- Don't log all statements
log_duration = off
```

### Using pg_stat_statements

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries by total time
SELECT
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage,
    query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Find queries with worst average time
SELECT
    calls,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    query
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Find Currently Running Slow Queries

```sql
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY duration DESC;
```

## Common Anti-Patterns

### 1. SELECT * Instead of Specific Columns

Bad:
```sql
SELECT * FROM orders WHERE customer_id = 123;
```

Good:
```sql
SELECT id, status, total, created_at
FROM orders
WHERE customer_id = 123;
```

### 2. Missing WHERE Clause Indexes

Bad:
```sql
-- No index on customer_id
SELECT * FROM orders WHERE customer_id = 123;
```

Good:
```sql
CREATE INDEX idx_orders_customer ON orders(customer_id);
```

### 3. Functions on Indexed Columns

Bad:
```sql
-- Cannot use index on email
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';
```

Good:
```sql
-- Create expression index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Or store lowercase
SELECT * FROM users WHERE email_lower = 'test@example.com';
```

### 4. LIKE with Leading Wildcard

Bad:
```sql
-- Full table scan
SELECT * FROM products WHERE name LIKE '%phone%';
```

Good:
```sql
-- Use full-text search
CREATE INDEX idx_products_name_gin ON products USING GIN(to_tsvector('english', name));

SELECT * FROM products
WHERE to_tsvector('english', name) @@ to_tsquery('phone');

-- Or use trigram index
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
```

### 5. OR Conditions

Bad:
```sql
SELECT * FROM orders
WHERE customer_id = 123 OR status = 'pending';
```

Better:
```sql
-- Use UNION for separate index scans
SELECT * FROM orders WHERE customer_id = 123
UNION
SELECT * FROM orders WHERE status = 'pending';
```

### 6. NOT IN with Subquery

Bad:
```sql
SELECT * FROM users
WHERE id NOT IN (SELECT user_id FROM orders);
```

Good:
```sql
SELECT u.*
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.user_id IS NULL;

-- Or use NOT EXISTS
SELECT * FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);
```

### 7. Correlated Subqueries

Bad:
```sql
SELECT *,
    (SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) AS order_count
FROM users;
```

Good:
```sql
SELECT u.*, COALESCE(o.order_count, 0) AS order_count
FROM users u
LEFT JOIN (
    SELECT user_id, COUNT(*) AS order_count
    FROM orders
    GROUP BY user_id
) o ON o.user_id = u.id;
```

### 8. OFFSET for Pagination

Bad:
```sql
-- Gets slower as offset increases
SELECT * FROM orders
ORDER BY created_at DESC
LIMIT 20 OFFSET 10000;
```

Good:
```sql
-- Keyset pagination
SELECT * FROM orders
WHERE created_at < '2026-01-20T10:00:00Z'
ORDER BY created_at DESC
LIMIT 20;

-- Or with id
SELECT * FROM orders
WHERE id < 12345
ORDER BY id DESC
LIMIT 20;
```

### 9. Implicit Type Conversion

Bad:
```sql
-- customer_id is integer, but comparing to string
SELECT * FROM orders WHERE customer_id = '123';
```

Good:
```sql
SELECT * FROM orders WHERE customer_id = 123;
```

### 10. COUNT(*) on Large Tables

Bad:
```sql
SELECT COUNT(*) FROM orders;  -- Scans entire table
```

Alternatives:
```sql
-- Approximate count (fast)
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'orders';

-- With filters, ensure proper indexing
SELECT COUNT(*) FROM orders WHERE status = 'pending';
-- Index: CREATE INDEX idx_orders_status ON orders(status);
```

## Query Optimization Techniques

### Use EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT o.*, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at > '2026-01-01'
ORDER BY o.created_at DESC
LIMIT 100;
```

### Add Missing Indexes

```sql
-- Identify missing indexes
SELECT
    relname AS table,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / NULLIF(seq_scan, 0) AS avg_seq_tup
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;
```

### Use Covering Indexes

```sql
-- Include frequently selected columns
CREATE INDEX idx_orders_customer_covering
ON orders(customer_id)
INCLUDE (status, total, created_at);

-- Enables index-only scan
SELECT customer_id, status, total, created_at
FROM orders
WHERE customer_id = 123;
```

### Optimize JOINs

```sql
-- Ensure join columns are indexed
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_customers_pkey ON customers(id);  -- Usually exists

-- Check join order
EXPLAIN ANALYZE
SELECT o.*, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending';
```

### Use Partial Indexes

```sql
-- Index only relevant rows
CREATE INDEX idx_orders_pending
ON orders(customer_id, created_at)
WHERE status = 'pending';

-- Query must match condition
SELECT * FROM orders
WHERE status = 'pending'
  AND customer_id = 123;
```

### Materialize CTEs When Needed

```sql
-- PostgreSQL 12+ - CTE not materialized by default
WITH recent_orders AS (
    SELECT * FROM orders
    WHERE created_at > '2026-01-01'
)
SELECT * FROM recent_orders WHERE customer_id = 123;

-- Force materialization if beneficial
WITH recent_orders AS MATERIALIZED (
    SELECT * FROM orders
    WHERE created_at > '2026-01-01'
)
SELECT * FROM recent_orders WHERE customer_id = 123;
```

### Batch Operations

```sql
-- Bad: Many small queries
FOR each_id IN 1..1000 LOOP
    SELECT * FROM users WHERE id = each_id;
END LOOP;

-- Good: Single query with IN
SELECT * FROM users WHERE id = ANY(ARRAY[1, 2, 3, ..., 1000]);

-- Or batch processing
SELECT * FROM users WHERE id BETWEEN 1 AND 1000;
```

## Configuration Tuning

### Memory Settings

```sql
-- Increase work_mem for complex queries
SET work_mem = '256MB';

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
ORDER BY total DESC;

-- Reset
RESET work_mem;
```

### Parallel Queries

```sql
-- Enable parallel execution
SET max_parallel_workers_per_gather = 4;

-- Check if parallel used
EXPLAIN ANALYZE
SELECT COUNT(*) FROM orders WHERE total > 100;
```

### Statistics

```sql
-- Update statistics
ANALYZE orders;

-- Increase statistics target for skewed columns
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;
ANALYZE orders;

-- Check current statistics
SELECT attname, n_distinct, most_common_vals, most_common_freqs
FROM pg_stats
WHERE tablename = 'orders';
```

## Real-World Optimization Examples

### Example 1: Dashboard Query

Before (8 seconds):
```sql
SELECT
    DATE(created_at) AS date,
    COUNT(*) AS orders,
    SUM(total) AS revenue
FROM orders
WHERE created_at >= '2026-01-01'
GROUP BY DATE(created_at)
ORDER BY date;
```

After (50ms):
```sql
-- Add index for date range
CREATE INDEX idx_orders_created ON orders(created_at);

-- Use expression index for grouping
CREATE INDEX idx_orders_date ON orders(DATE(created_at));

-- Rewrite with date truncation
SELECT
    DATE(created_at) AS date,
    COUNT(*) AS orders,
    SUM(total) AS revenue
FROM orders
WHERE created_at >= '2026-01-01'
  AND created_at < '2026-02-01'  -- Bounded range
GROUP BY DATE(created_at)
ORDER BY date;
```

### Example 2: User Search

Before (5 seconds):
```sql
SELECT * FROM users
WHERE name ILIKE '%john%'
   OR email ILIKE '%john%';
```

After (20ms):
```sql
-- Add trigram index
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_users_name_trgm ON users USING GIN(name gin_trgm_ops);
CREATE INDEX idx_users_email_trgm ON users USING GIN(email gin_trgm_ops);

SELECT * FROM users
WHERE name ILIKE '%john%'
   OR email ILIKE '%john%';
```

### Example 3: Recent Activity

Before (10 seconds):
```sql
SELECT u.*,
    (SELECT MAX(created_at) FROM orders WHERE user_id = u.id) AS last_order,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u
WHERE u.status = 'active'
LIMIT 100;
```

After (100ms):
```sql
SELECT u.*,
    o.last_order,
    o.order_count
FROM users u
LEFT JOIN LATERAL (
    SELECT
        MAX(created_at) AS last_order,
        COUNT(*) AS order_count
    FROM orders
    WHERE user_id = u.id
) o ON true
WHERE u.status = 'active'
LIMIT 100;

-- With proper index
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
```

## Monitoring and Prevention

### Set Up Alerts

```sql
-- Queries exceeding threshold
SELECT * FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '30 seconds';
```

### Regular Review

```sql
-- Weekly slow query review
SELECT
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    query
FROM pg_stat_statements
WHERE calls > 10
ORDER BY mean_exec_time DESC
LIMIT 50;
```

### Automated Index Suggestions

```sql
-- Find potential missing indexes
SELECT
    schemaname || '.' || relname AS table,
    seq_scan,
    idx_scan,
    n_live_tup,
    round(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 2) AS seq_scan_pct
FROM pg_stat_user_tables
WHERE seq_scan > 1000
  AND n_live_tup > 10000
ORDER BY seq_scan DESC;
```

## Conclusion

Optimizing slow queries follows a systematic approach:

1. **Identify** - Use pg_stat_statements and slow query logs
2. **Analyze** - Run EXPLAIN ANALYZE with BUFFERS
3. **Fix** - Add indexes, rewrite queries, adjust config
4. **Verify** - Compare before/after execution plans
5. **Monitor** - Track query performance over time

Most slow queries can be fixed with proper indexing and avoiding common anti-patterns. Regular monitoring prevents small issues from becoming major problems.
