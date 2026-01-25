# How to Query and Index JSONB Efficiently in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, JSONB, JSON, Indexing, NoSQL, Database Performance

Description: Learn how to store, query, and index JSONB data efficiently in PostgreSQL. This guide covers JSONB operators, GIN indexes, expression indexes, and performance patterns for document-style data.

---

> PostgreSQL JSONB gives you the flexibility of document databases without abandoning relational integrity. You can store schema-less data, query nested structures, and index specific paths for fast lookups. But JSONB can also become a performance trap if you do not understand how to query and index it properly.

This guide shows you how to work with JSONB efficiently in production systems.

---

## JSONB Basics

### Creating Tables with JSONB

```sql
-- Simple table with JSONB column
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert JSON data
INSERT INTO events (event_type, data) VALUES
('page_view', '{"url": "/home", "user_id": 123, "referrer": "google.com"}'),
('purchase', '{"user_id": 123, "items": [{"sku": "ABC", "qty": 2}], "total": 99.99}'),
('signup', '{"email": "user@example.com", "plan": "pro", "source": {"campaign": "summer"}}');
```

### JSON vs JSONB

```sql
-- JSON: Stores exact text, preserves whitespace and key order
-- JSONB: Binary format, no duplicate keys, faster operations

-- Always use JSONB unless you need to preserve formatting
CREATE TABLE config (
    id SERIAL PRIMARY KEY,
    settings JSONB NOT NULL  -- Use JSONB, not JSON
);
```

---

## Essential JSONB Operators

### Extracting Values

```sql
-- -> : Get JSON value (returns JSONB)
SELECT data->'user_id' FROM events;
-- Returns: 123 (as JSONB)

-- ->> : Get value as text
SELECT data->>'user_id' FROM events;
-- Returns: '123' (as TEXT)

-- #> : Get nested value by path (returns JSONB)
SELECT data#>'{source,campaign}' FROM events WHERE event_type = 'signup';
-- Returns: "summer"

-- #>> : Get nested value as text
SELECT data#>>'{source,campaign}' FROM events WHERE event_type = 'signup';
-- Returns: summer
```

### Containment Operators

```sql
-- @> : Contains (left contains right)
SELECT * FROM events WHERE data @> '{"user_id": 123}';

-- <@ : Contained by (left is contained by right)
SELECT * FROM events WHERE '{"user_id": 123, "extra": true}' <@ data;

-- ? : Key exists
SELECT * FROM events WHERE data ? 'referrer';

-- ?| : Any key exists
SELECT * FROM events WHERE data ?| array['referrer', 'campaign'];

-- ?& : All keys exist
SELECT * FROM events WHERE data ?& array['user_id', 'url'];
```

### Array Operations

```sql
-- Access array elements
INSERT INTO events (event_type, data) VALUES
('order', '{"items": [{"name": "Widget", "price": 10}, {"name": "Gadget", "price": 20}]}');

-- Get first array element
SELECT data->'items'->0 FROM events WHERE event_type = 'order';
-- Returns: {"name": "Widget", "price": 10}

-- Get array length
SELECT jsonb_array_length(data->'items') FROM events WHERE event_type = 'order';
-- Returns: 2

-- Expand array to rows
SELECT jsonb_array_elements(data->'items') AS item
FROM events WHERE event_type = 'order';
```

---

## Indexing JSONB Data

### GIN Index for General Queries

```sql
-- GIN index for containment queries (@>, ?, ?|, ?&)
CREATE INDEX idx_events_data ON events USING GIN (data);

-- Now this query uses the index
EXPLAIN ANALYZE
SELECT * FROM events WHERE data @> '{"user_id": 123}';
-- Bitmap Index Scan on idx_events_data
```

### GIN with jsonb_path_ops

```sql
-- Smaller, faster index for @> queries only
CREATE INDEX idx_events_data_path ON events USING GIN (data jsonb_path_ops);

-- Supports:
SELECT * FROM events WHERE data @> '{"user_id": 123}';  -- Uses index

-- Does NOT support:
SELECT * FROM events WHERE data ? 'user_id';  -- Cannot use index
```

### Expression Indexes for Specific Fields

```sql
-- B-Tree index on specific JSONB field
CREATE INDEX idx_events_user_id ON events ((data->>'user_id'));

-- Query using the index
EXPLAIN ANALYZE
SELECT * FROM events WHERE data->>'user_id' = '123';
-- Index Scan using idx_events_user_id

-- Cast for numeric comparisons
CREATE INDEX idx_events_user_id_int ON events (((data->>'user_id')::INTEGER));

SELECT * FROM events WHERE (data->>'user_id')::INTEGER > 100;
```

### Partial Indexes

```sql
-- Index only specific event types
CREATE INDEX idx_purchase_items ON events USING GIN ((data->'items'))
WHERE event_type = 'purchase';

-- Efficient for filtered queries
SELECT * FROM events
WHERE event_type = 'purchase'
  AND data->'items' @> '[{"sku": "ABC"}]';
```

---

## Query Performance Patterns

### Pattern 1: Filter Then Extract

```sql
-- Good: Filter first, extract later
SELECT
    id,
    data->>'user_id' AS user_id,
    data->>'url' AS url
FROM events
WHERE data @> '{"event_type": "page_view"}'
  AND created_at > NOW() - INTERVAL '1 day';

-- Bad: Extract then compare (may not use index)
SELECT * FROM events
WHERE (data->>'user_id')::INTEGER = 123
  AND data->>'event_type' = 'page_view';
-- Consider expression index if you query this pattern often
```

### Pattern 2: Searching Arrays

```sql
-- Check if array contains element with specific value
-- This is expensive without proper indexing

-- Option 1: Containment query
SELECT * FROM events
WHERE data @> '{"items": [{"sku": "ABC"}]}';

-- Option 2: Unnest and filter (more flexible)
SELECT DISTINCT e.*
FROM events e,
     jsonb_array_elements(e.data->'items') AS item
WHERE item->>'sku' = 'ABC';

-- Option 3: Expression index for common searches
CREATE INDEX idx_events_first_item_sku ON events ((data->'items'->0->>'sku'));
```

### Pattern 3: Aggregating JSONB Data

```sql
-- Sum values from JSONB
SELECT SUM((data->>'total')::NUMERIC) AS total_revenue
FROM events
WHERE event_type = 'purchase'
  AND created_at > NOW() - INTERVAL '30 days';

-- Count by JSONB field
SELECT data->>'plan' AS plan, COUNT(*)
FROM events
WHERE event_type = 'signup'
GROUP BY data->>'plan';
```

---

## Modifying JSONB Data

### Update Specific Fields

```sql
-- Set a single field
UPDATE events
SET data = jsonb_set(data, '{status}', '"processed"')
WHERE id = 1;

-- Set nested field
UPDATE events
SET data = jsonb_set(data, '{source,processed}', 'true')
WHERE event_type = 'signup';

-- Remove a key
UPDATE events
SET data = data - 'referrer'
WHERE event_type = 'page_view';

-- Remove nested key
UPDATE events
SET data = data #- '{source,campaign}'
WHERE event_type = 'signup';
```

### Merge JSONB Objects

```sql
-- Concatenate (shallow merge, right wins)
UPDATE events
SET data = data || '{"processed": true, "processed_at": "2024-01-15"}'::JSONB
WHERE id = 1;

-- Deep merge with jsonb_set
UPDATE events
SET data = jsonb_set(
    data,
    '{metadata}',
    COALESCE(data->'metadata', '{}'::JSONB) || '{"version": 2}'::JSONB
)
WHERE id = 1;
```

---

## Advanced Querying

### JSON Path Queries (PostgreSQL 12+)

```sql
-- jsonb_path_query: Extract values using SQL/JSON path
SELECT jsonb_path_query(data, '$.items[*].price')
FROM events WHERE event_type = 'order';

-- jsonb_path_exists: Check if path matches
SELECT * FROM events
WHERE jsonb_path_exists(data, '$.items[*] ? (@.price > 15)');

-- jsonb_path_query_first: Get first matching value
SELECT jsonb_path_query_first(data, '$.items[*].name')
FROM events WHERE event_type = 'order';
```

### Building Complex Queries

```sql
-- Find events where any item has quantity > 1
SELECT * FROM events
WHERE event_type = 'purchase'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(data->'items') AS item
    WHERE (item->>'qty')::INTEGER > 1
  );

-- Calculate totals from nested arrays
SELECT
    id,
    data->>'user_id' AS user_id,
    (
        SELECT SUM((item->>'qty')::INTEGER * (item->>'price')::NUMERIC)
        FROM jsonb_array_elements(data->'items') AS item
    ) AS calculated_total
FROM events
WHERE event_type = 'purchase';
```

---

## JSONB Schema Validation

### Using CHECK Constraints

```sql
-- Ensure required fields exist
ALTER TABLE events
ADD CONSTRAINT events_data_valid CHECK (
    data ? 'user_id'
    OR event_type NOT IN ('page_view', 'purchase')
);

-- Validate data types
ALTER TABLE events
ADD CONSTRAINT events_user_id_numeric CHECK (
    data->>'user_id' IS NULL
    OR data->>'user_id' ~ '^\d+$'
);
```

### Using Triggers for Complex Validation

```sql
-- Validation trigger
CREATE OR REPLACE FUNCTION validate_event_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate purchase events
    IF NEW.event_type = 'purchase' THEN
        IF NOT (NEW.data ? 'items' AND NEW.data ? 'total') THEN
            RAISE EXCEPTION 'Purchase events must have items and total';
        END IF;

        IF jsonb_typeof(NEW.data->'items') != 'array' THEN
            RAISE EXCEPTION 'Items must be an array';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_validate
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_data();
```

---

## Performance Comparison

### Index Strategy Comparison

```sql
-- Create test table with 1 million rows
CREATE TABLE jsonb_test AS
SELECT
    generate_series(1, 1000000) AS id,
    jsonb_build_object(
        'user_id', (random() * 10000)::INTEGER,
        'status', (ARRAY['active', 'pending', 'completed'])[floor(random() * 3 + 1)],
        'amount', (random() * 1000)::NUMERIC(10,2),
        'tags', (SELECT array_agg(x) FROM generate_series(1, (random()*5)::int) x)
    ) AS data;

-- Compare query performance with different indexes

-- Test 1: No index
EXPLAIN ANALYZE SELECT * FROM jsonb_test WHERE data @> '{"user_id": 5000}';
-- Seq Scan: 150ms

-- Test 2: GIN index
CREATE INDEX idx_gin ON jsonb_test USING GIN (data);
EXPLAIN ANALYZE SELECT * FROM jsonb_test WHERE data @> '{"user_id": 5000}';
-- Bitmap Index Scan: 0.5ms

-- Test 3: GIN jsonb_path_ops
DROP INDEX idx_gin;
CREATE INDEX idx_gin_path ON jsonb_test USING GIN (data jsonb_path_ops);
EXPLAIN ANALYZE SELECT * FROM jsonb_test WHERE data @> '{"user_id": 5000}';
-- Bitmap Index Scan: 0.3ms (smaller index, faster)

-- Test 4: Expression index
CREATE INDEX idx_user_id ON jsonb_test ((data->>'user_id'));
EXPLAIN ANALYZE SELECT * FROM jsonb_test WHERE data->>'user_id' = '5000';
-- Index Scan: 0.1ms (fastest for exact field lookup)
```

---

## Best Practices

### 1. Prefer Containment Queries

```sql
-- Good: Uses GIN index
SELECT * FROM events WHERE data @> '{"user_id": 123}';

-- Less efficient: May not use GIN index
SELECT * FROM events WHERE data->>'user_id' = '123';
```

### 2. Create Expression Indexes for Frequent Queries

```sql
-- If you query user_id often
CREATE INDEX idx_events_user ON events ((data->>'user_id'));
```

### 3. Use jsonb_path_ops When Possible

```sql
-- Smaller and faster for containment queries
CREATE INDEX idx_data ON events USING GIN (data jsonb_path_ops);
```

### 4. Normalize Hot Paths

```sql
-- If you always filter by user_id, consider extracting it
ALTER TABLE events ADD COLUMN user_id INTEGER
    GENERATED ALWAYS AS ((data->>'user_id')::INTEGER) STORED;

CREATE INDEX idx_events_user_id ON events (user_id);
```

---

## Conclusion

PostgreSQL JSONB provides powerful document storage with relational database benefits. Key takeaways:

1. Use JSONB, not JSON, for better performance
2. GIN indexes enable fast containment queries
3. Expression indexes work best for specific field lookups
4. Use jsonb_path_ops for smaller, faster indexes when you only need @>
5. Extract frequently queried fields to regular columns when performance matters

With proper indexing, JSONB queries can be nearly as fast as queries on regular columns while giving you schema flexibility.

---

*Need to monitor your JSONB query performance? [OneUptime](https://oneuptime.com) provides database monitoring with query analysis, index usage tracking, and performance alerting for PostgreSQL.*

**Related Reading:**
- [How to Build Full-Text Search with GIN Indexes in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-full-text-search-gin-postgresql/view)
- [How to Choose Between B-Tree, GIN, and BRIN Indexes in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-btree-gin-brin-indexes-postgresql/view)
