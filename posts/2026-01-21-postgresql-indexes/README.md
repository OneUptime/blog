# How to Create Effective Indexes in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Indexes, Performance, B-tree, GIN, GiST, Database Optimization

Description: A comprehensive guide to creating effective indexes in PostgreSQL, covering B-tree, GIN, GiST, and partial indexes with practical examples and best practices for query optimization.

---

Indexes are critical for PostgreSQL performance. Well-designed indexes can speed up queries by orders of magnitude, while poor indexing wastes storage and slows down writes. This guide covers all PostgreSQL index types and when to use each.

## Prerequisites

- PostgreSQL database access
- Understanding of your query patterns
- Basic knowledge of EXPLAIN ANALYZE

## Index Fundamentals

### How Indexes Work

Without index:
```
Query: WHERE id = 12345
Action: Scan all 1,000,000 rows (sequential scan)
Time: O(n)
```

With index:
```
Query: WHERE id = 12345
Action: Tree lookup to find row location
Time: O(log n)
```

### Basic Index Creation

```sql
-- Create simple index
CREATE INDEX idx_users_email ON users(email);

-- Create unique index
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

-- Create index concurrently (non-blocking)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Drop index
DROP INDEX idx_users_email;
```

## B-tree Indexes (Default)

### When to Use

- Equality comparisons: `=`
- Range queries: `<`, `>`, `<=`, `>=`, `BETWEEN`
- Pattern matching (prefix): `LIKE 'abc%'`
- Sorting: `ORDER BY`
- Unique constraints

### Examples

```sql
-- Single column
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Multi-column (composite)
CREATE INDEX idx_orders_customer_date ON orders(customer_id, created_at);

-- Descending order
CREATE INDEX idx_orders_date_desc ON orders(created_at DESC);

-- Include columns (covering index)
CREATE INDEX idx_orders_customer_covering
ON orders(customer_id)
INCLUDE (status, total);
```

### Column Order Matters

```sql
-- Index on (customer_id, created_at)

-- Uses index fully
SELECT * FROM orders
WHERE customer_id = 123 AND created_at > '2026-01-01';

-- Uses index (first column only)
SELECT * FROM orders WHERE customer_id = 123;

-- Does NOT use index efficiently
SELECT * FROM orders WHERE created_at > '2026-01-01';
```

Rule: Put most selective/commonly filtered columns first.

## Partial Indexes

### Filter Index to Subset

```sql
-- Index only active users
CREATE INDEX idx_users_active_email
ON users(email)
WHERE status = 'active';

-- Index only recent orders
CREATE INDEX idx_orders_recent
ON orders(customer_id, created_at)
WHERE created_at > '2025-01-01';

-- Index non-null values
CREATE INDEX idx_users_phone
ON users(phone)
WHERE phone IS NOT NULL;
```

### Benefits

- Smaller index size
- Faster updates
- Better cache utilization

### Query Must Match

```sql
-- Uses partial index
SELECT * FROM users
WHERE email = 'test@example.com'
  AND status = 'active';

-- Does NOT use partial index
SELECT * FROM users
WHERE email = 'test@example.com';
```

## Expression Indexes

### Index on Computed Values

```sql
-- Index on lowercase email
CREATE INDEX idx_users_email_lower
ON users(LOWER(email));

-- Use it
SELECT * FROM users
WHERE LOWER(email) = 'test@example.com';

-- Index on date part
CREATE INDEX idx_orders_year
ON orders(EXTRACT(YEAR FROM created_at));

-- Index on JSON field
CREATE INDEX idx_users_settings_theme
ON users((settings->>'theme'));
```

## GIN Indexes (Generalized Inverted Index)

### When to Use

- Full-text search
- Array columns
- JSONB queries
- Range types

### Full-Text Search

```sql
-- Create text search index
CREATE INDEX idx_articles_search
ON articles USING GIN(to_tsvector('english', title || ' ' || body));

-- Query
SELECT * FROM articles
WHERE to_tsvector('english', title || ' ' || body) @@ to_tsquery('postgresql & performance');
```

### Array Columns

```sql
-- Index array column
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- Contains element
SELECT * FROM products WHERE tags @> ARRAY['electronics'];

-- Overlaps
SELECT * FROM products WHERE tags && ARRAY['sale', 'new'];
```

### JSONB Indexes

```sql
-- Index all JSONB paths
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);

-- Contains
SELECT * FROM users WHERE metadata @> '{"type": "premium"}';

-- Path exists
SELECT * FROM users WHERE metadata ? 'email';

-- Specific path index (more efficient)
CREATE INDEX idx_users_metadata_type
ON users USING BTREE((metadata->>'type'));
```

### GIN Operator Classes

```sql
-- jsonb_ops (default) - supports @>, ?, ?&, ?|
CREATE INDEX idx_data ON table USING GIN(data);

-- jsonb_path_ops - faster @> only, smaller index
CREATE INDEX idx_data ON table USING GIN(data jsonb_path_ops);
```

## GiST Indexes (Generalized Search Tree)

### When to Use

- Geometric data
- Full-text search (alternative to GIN)
- Range types
- Nearest-neighbor search

### Geometric Data

```sql
-- PostGIS geometry
CREATE INDEX idx_locations_geom
ON locations USING GIST(geom);

-- Spatial query
SELECT * FROM locations
WHERE ST_DWithin(geom, ST_Point(-73.9857, 40.7484)::geography, 1000);
```

### Range Types

```sql
-- Range index
CREATE INDEX idx_events_timerange
ON events USING GIST(time_range);

-- Overlaps query
SELECT * FROM events
WHERE time_range && '[2026-01-01, 2026-01-31]'::daterange;
```

### Full-Text (Alternative to GIN)

```sql
-- GiST full-text index
CREATE INDEX idx_articles_search_gist
ON articles USING GIST(to_tsvector('english', body));
```

GIN vs GiST for full-text:
- GIN: Faster lookups, slower updates, larger size
- GiST: Faster updates, lossy (requires recheck)

## BRIN Indexes (Block Range Index)

### When to Use

- Very large tables
- Naturally ordered data (time series)
- Low storage overhead needed

### Example

```sql
-- BRIN on time-series data
CREATE INDEX idx_logs_created_brin
ON logs USING BRIN(created_at);

-- With pages per range
CREATE INDEX idx_logs_created_brin
ON logs USING BRIN(created_at)
WITH (pages_per_range = 128);
```

### Characteristics

- Very small index size
- Best when data is physically ordered
- Less precise than B-tree

## Hash Indexes

### When to Use

- Equality comparisons only
- Cannot use for ranges or sorting

```sql
-- Hash index
CREATE INDEX idx_sessions_token ON sessions USING HASH(token);

-- Only supports =
SELECT * FROM sessions WHERE token = 'abc123';
```

Note: B-tree often performs similarly; hash rarely needed.

## Covering Indexes (INCLUDE)

### Avoid Table Lookups

```sql
-- Covering index with INCLUDE
CREATE INDEX idx_orders_customer_covering
ON orders(customer_id)
INCLUDE (status, total, created_at);

-- Query uses index-only scan
SELECT customer_id, status, total, created_at
FROM orders
WHERE customer_id = 123;
```

Benefits:
- Index-only scan (no heap access)
- Included columns don't affect sort order
- Included columns can't be used in WHERE

## Index Maintenance

### Check Index Usage

```sql
-- Index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT
    schemaname || '.' || indexrelname AS index,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Reindex

```sql
-- Rebuild single index
REINDEX INDEX idx_users_email;

-- Rebuild all indexes on table
REINDEX TABLE users;

-- Rebuild concurrently (PostgreSQL 12+)
REINDEX INDEX CONCURRENTLY idx_users_email;
```

### Index Size

```sql
-- Check index sizes
SELECT
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Index Selection Guidelines

### Decision Matrix

| Query Pattern | Index Type |
|--------------|------------|
| Equality (=) | B-tree |
| Range (<, >, BETWEEN) | B-tree |
| Pattern (LIKE 'abc%') | B-tree |
| Pattern (LIKE '%abc%') | GIN + pg_trgm |
| Full-text search | GIN or GiST |
| JSON containment | GIN |
| Array contains | GIN |
| Geometry/spatial | GiST |
| Large table, ordered data | BRIN |
| Equality only, high cardinality | Hash or B-tree |

### Multi-Column Index Guidelines

1. **Most selective column first** - unless ordering matters
2. **Equality before range** - `WHERE a = 1 AND b > 5` - index `(a, b)`
3. **Consider query variations** - if `a` and `b` queried independently, may need separate indexes

## Practical Examples

### E-commerce Product Search

```sql
-- Primary lookup
CREATE INDEX idx_products_category ON products(category_id);

-- Price filtering
CREATE INDEX idx_products_category_price
ON products(category_id, price);

-- Text search
CREATE INDEX idx_products_search
ON products USING GIN(to_tsvector('english', name || ' ' || description));

-- Attribute filtering (JSONB)
CREATE INDEX idx_products_attributes
ON products USING GIN(attributes jsonb_path_ops);
```

### User Authentication

```sql
-- Email lookup
CREATE UNIQUE INDEX idx_users_email_lower
ON users(LOWER(email));

-- Session lookup
CREATE INDEX idx_sessions_token ON sessions(token);

-- Active sessions only
CREATE INDEX idx_sessions_user_active
ON sessions(user_id)
WHERE expires_at > NOW();
```

### Time Series / Logs

```sql
-- BRIN for large time-series
CREATE INDEX idx_logs_timestamp_brin
ON logs USING BRIN(created_at);

-- Composite for filtered queries
CREATE INDEX idx_logs_level_time
ON logs(level, created_at DESC)
WHERE level IN ('ERROR', 'WARN');
```

## Anti-Patterns to Avoid

### Too Many Indexes

```sql
-- Bad: Index on every column
CREATE INDEX idx1 ON users(a);
CREATE INDEX idx2 ON users(b);
CREATE INDEX idx3 ON users(c);
CREATE INDEX idx4 ON users(a, b);
CREATE INDEX idx5 ON users(b, c);
-- Slows down writes, wastes space
```

### Wrong Column Order

```sql
-- Index (created_at, status)
-- Query: WHERE status = 'active' AND created_at > '2026-01-01'
-- Less efficient - should be (status, created_at)
```

### Indexing Low-Cardinality Columns Alone

```sql
-- Bad: boolean or few-value columns alone
CREATE INDEX idx_users_active ON users(is_active);
-- Better: partial index or composite
```

## Conclusion

Effective indexing requires understanding your queries:

1. **Analyze queries first** - Use EXPLAIN ANALYZE
2. **Choose appropriate type** - B-tree for most, GIN for arrays/JSONB
3. **Consider column order** - Selective and equality columns first
4. **Use partial indexes** - When querying subsets
5. **Monitor usage** - Remove unused indexes
6. **Create concurrently** - Avoid locking production tables

Remember: Every index slows down writes. Only create indexes that benefit your read queries.
