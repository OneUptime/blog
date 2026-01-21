# How to Implement Deduplication in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Deduplication, ReplacingMergeTree, FINAL, argMax, Data Quality, Insert Idempotency, Database

Description: A comprehensive guide to implementing deduplication in ClickHouse using ReplacingMergeTree, FINAL queries, argMax patterns, and strategies for ensuring data uniqueness in high-throughput scenarios.

---

Deduplication in ClickHouse works differently than in traditional databases. ClickHouse doesn't enforce uniqueness constraints; instead, it provides table engines and query patterns for eventual deduplication. This guide covers strategies for handling duplicates.

## Understanding ClickHouse Deduplication

### Insert Deduplication (Block Level)

```sql
-- ClickHouse deduplicates identical insert blocks
-- within insert_deduplicate_block_hash_size bytes

INSERT INTO events VALUES (1, 'click', now());
-- Same insert again is deduplicated
INSERT INTO events VALUES (1, 'click', now());

-- Check deduplication status
SELECT
    setting,
    value
FROM system.settings
WHERE setting LIKE '%deduplic%';
```

### Query-Time Deduplication

```sql
-- FINAL modifier deduplicates on read
SELECT * FROM events FINAL WHERE user_id = 123;

-- LIMIT BY for latest records
SELECT * FROM events
ORDER BY event_time DESC
LIMIT 1 BY user_id, event_type;
```

## ReplacingMergeTree

### Basic Setup

```sql
-- ReplacingMergeTree keeps latest version
CREATE TABLE users
(
    user_id UInt64,
    email String,
    name String,
    updated_at DateTime
)
ENGINE = ReplacingMergeTree(updated_at)  -- Version column
ORDER BY user_id;

-- Insert initial record
INSERT INTO users VALUES (1, 'john@example.com', 'John', now());

-- "Update" by inserting new version
INSERT INTO users VALUES (1, 'john.doe@example.com', 'John Doe', now());

-- Query with deduplication
SELECT * FROM users FINAL WHERE user_id = 1;
```

### With is_deleted Flag

```sql
CREATE TABLE users
(
    user_id UInt64,
    email String,
    name String,
    updated_at DateTime,
    is_deleted UInt8 DEFAULT 0
)
ENGINE = ReplacingMergeTree(updated_at, is_deleted)
ORDER BY user_id;

-- "Delete" by inserting with is_deleted = 1
INSERT INTO users VALUES (1, '', '', now(), 1);

-- Query excludes deleted
SELECT * FROM users FINAL WHERE is_deleted = 0;
```

## Querying Deduplicated Data

### Using FINAL

```sql
-- FINAL forces deduplication at query time
SELECT * FROM users FINAL;

-- FINAL with filters
SELECT * FROM users FINAL
WHERE user_id = 123;

-- FINAL is expensive for large tables
-- Use when accuracy is critical
```

### Using argMax Pattern

```sql
-- argMax returns value corresponding to max of another column
SELECT
    user_id,
    argMax(email, updated_at) AS email,
    argMax(name, updated_at) AS name,
    max(updated_at) AS updated_at
FROM users
GROUP BY user_id;

-- More efficient than FINAL for aggregations
SELECT
    user_id,
    argMax(email, updated_at) AS email,
    count() AS versions
FROM users
GROUP BY user_id
HAVING count() > 1;
```

### Using LIMIT BY

```sql
-- Get latest record per user
SELECT *
FROM users
ORDER BY user_id, updated_at DESC
LIMIT 1 BY user_id;

-- Multiple columns in LIMIT BY
SELECT *
FROM events
ORDER BY user_id, event_type, event_time DESC
LIMIT 1 BY user_id, event_type;
```

### Subquery Pattern

```sql
-- Deduplicate in subquery
SELECT *
FROM (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY updated_at DESC
        ) AS rn
    FROM users
)
WHERE rn = 1;
```

## CollapsingMergeTree

### For Delete Operations

```sql
CREATE TABLE events
(
    event_id UInt64,
    user_id UInt64,
    event_type String,
    sign Int8  -- 1 for insert, -1 for delete
)
ENGINE = CollapsingMergeTree(sign)
ORDER BY event_id;

-- Insert
INSERT INTO events VALUES (1, 100, 'click', 1);

-- Delete (insert cancellation row)
INSERT INTO events VALUES (1, 100, 'click', -1);

-- Query collapses rows
SELECT
    event_id,
    user_id,
    event_type,
    sum(sign) AS count
FROM events
GROUP BY event_id, user_id, event_type
HAVING count > 0;
```

### VersionedCollapsingMergeTree

```sql
CREATE TABLE events_vcmt
(
    event_id UInt64,
    user_id UInt64,
    event_type String,
    sign Int8,
    version UInt64
)
ENGINE = VersionedCollapsingMergeTree(sign, version)
ORDER BY event_id;

-- Insert v1
INSERT INTO events_vcmt VALUES (1, 100, 'click', 1, 1);

-- Update: cancel v1, insert v2
INSERT INTO events_vcmt VALUES
    (1, 100, 'click', -1, 1),
    (1, 100, 'view', 1, 2);

-- Query with FINAL
SELECT * FROM events_vcmt FINAL;
```

## Insert Deduplication

### Block-Level Deduplication

```sql
-- Enable insert deduplication (default for replicated tables)
INSERT INTO events
SETTINGS insert_deduplicate = 1
VALUES (1, 'click', now());

-- Same block inserted again is deduplicated
INSERT INTO events
SETTINGS insert_deduplicate = 1
VALUES (1, 'click', now());
```

### Custom Deduplication Key

```sql
-- For ReplicatedMergeTree
CREATE TABLE events
(
    event_id UUID DEFAULT generateUUIDv4(),
    event_type String,
    user_id UInt64,
    event_time DateTime
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
ORDER BY (user_id, event_time)
SETTINGS
    replicated_deduplication_window = 1000,
    replicated_deduplication_window_seconds = 600;
```

## Materialized Views for Deduplication

### Pre-Deduplicated View

```sql
-- Source table (may have duplicates)
CREATE TABLE events_raw
(
    event_id String,
    event_type String,
    user_id UInt64,
    event_time DateTime
)
ENGINE = MergeTree()
ORDER BY event_time;

-- Deduplicated destination
CREATE TABLE events_unique
(
    event_id String,
    event_type String,
    user_id UInt64,
    event_time DateTime
)
ENGINE = ReplacingMergeTree()
ORDER BY event_id;

-- Materialized view for deduplication
CREATE MATERIALIZED VIEW events_dedup_mv TO events_unique AS
SELECT * FROM events_raw;
```

### Aggregating for Dedup

```sql
-- Deduplicate by aggregating
CREATE MATERIALIZED VIEW user_latest_mv
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id
AS SELECT
    user_id,
    argMax(email, updated_at) AS email,
    argMax(name, updated_at) AS name,
    max(updated_at) AS updated_at
FROM users
GROUP BY user_id;
```

## Performance Optimization

### Force Merges

```sql
-- Trigger background merges to consolidate duplicates
OPTIMIZE TABLE users;

-- Force final merge (expensive)
OPTIMIZE TABLE users FINAL;

-- Merge specific partition
OPTIMIZE TABLE users PARTITION '202401' FINAL;
```

### Avoid FINAL When Possible

```sql
-- Instead of FINAL for counts
SELECT count() FROM users FINAL;  -- Slow

-- Use aggregation
SELECT count(DISTINCT user_id) FROM users;  -- Faster

-- Or estimate
SELECT uniqExact(user_id) FROM users;  -- Fast, accurate
```

### Create Deduplicated View

```sql
-- Materialized view with latest state
CREATE MATERIALIZED VIEW users_current
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id
AS SELECT * FROM users;

-- Query the view (still needs FINAL but smaller)
SELECT * FROM users_current FINAL;
```

## Application-Level Strategies

### Idempotent Inserts

```python
# Generate deterministic event ID
import hashlib

def get_event_id(user_id, event_type, timestamp):
    data = f"{user_id}:{event_type}:{timestamp}"
    return hashlib.sha256(data.encode()).hexdigest()

# Insert with deterministic ID
event_id = get_event_id(user_id, event_type, timestamp)
client.execute(
    "INSERT INTO events (event_id, user_id, event_type, event_time) VALUES",
    [(event_id, user_id, event_type, timestamp)]
)
```

### Upsert Pattern

```python
# Check-then-insert pattern
def upsert_user(user_id, email, name):
    # Insert new version
    client.execute("""
        INSERT INTO users (user_id, email, name, updated_at)
        VALUES (%s, %s, %s, now())
    """, (user_id, email, name))

    # Deduplication happens automatically
```

## Monitoring Duplicates

### Check for Duplicates

```sql
-- Find duplicate counts
SELECT
    user_id,
    count() AS versions,
    max(updated_at) AS latest,
    min(updated_at) AS earliest
FROM users
GROUP BY user_id
HAVING versions > 1
ORDER BY versions DESC
LIMIT 100;

-- Duplicate ratio
SELECT
    count() AS total_rows,
    uniqExact(user_id) AS unique_users,
    total_rows / unique_users AS avg_versions
FROM users;
```

### Monitor Merge Progress

```sql
-- Parts that need merging
SELECT
    database,
    table,
    partition,
    count() AS parts
FROM system.parts
WHERE active
GROUP BY database, table, partition
HAVING parts > 10
ORDER BY parts DESC;
```

---

Deduplication in ClickHouse is handled through table engines (ReplacingMergeTree, CollapsingMergeTree) and query patterns (FINAL, argMax, LIMIT BY). Choose the right approach based on your use case: ReplacingMergeTree for simple updates, CollapsingMergeTree for frequent deletes, and argMax for efficient aggregations. Force merges periodically to consolidate duplicates and improve query performance.
