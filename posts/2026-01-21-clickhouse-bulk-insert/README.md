# How to Bulk Insert Data into ClickHouse Efficiently

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bulk Insert, Performance, Data Ingestion, Database, ETL, Batch Processing

Description: A practical guide to high-performance bulk data insertion in ClickHouse, covering batch inserts, async inserts, buffer tables, and optimization techniques for maximum throughput.

---

ClickHouse can ingest millions of rows per second when configured correctly. The key is batching: instead of inserting one row at a time, batch thousands or millions of rows together. This guide covers all the techniques for efficient bulk insertion.

## The Golden Rule: Batch Your Inserts

Single-row inserts are extremely inefficient in ClickHouse:

```sql
-- BAD: One insert per row (slow, creates many small parts)
INSERT INTO events VALUES (1, 'click', now());
INSERT INTO events VALUES (2, 'view', now());
INSERT INTO events VALUES (3, 'purchase', now());

-- GOOD: Batch insert (fast, creates one part)
INSERT INTO events VALUES
    (1, 'click', now()),
    (2, 'view', now()),
    (3, 'purchase', now());
```

Why batching matters:
- Each INSERT creates a new "part" on disk
- Too many parts triggers expensive merges
- Network round-trips add latency
- Aim for batches of 10,000 to 1,000,000 rows

## Method 1: Batch INSERT Statements

### From Application Code

Collect rows and insert in batches:

```python
import clickhouse_connect
from datetime import datetime

client = clickhouse_connect.get_client(host='localhost')

# Collect rows in a batch
batch = []
batch_size = 100000

for event in event_stream:
    batch.append([
        event['id'],
        event['type'],
        event['user_id'],
        datetime.fromisoformat(event['timestamp'])
    ])

    if len(batch) >= batch_size:
        client.insert(
            'events',
            batch,
            column_names=['event_id', 'event_type', 'user_id', 'event_time']
        )
        batch = []

# Don't forget remaining rows
if batch:
    client.insert('events', batch, column_names=['event_id', 'event_type', 'user_id', 'event_time'])
```

### From SQL

Use INSERT SELECT for bulk copies:

```sql
-- Copy between tables
INSERT INTO events_archive
SELECT * FROM events
WHERE event_time < today() - 90;

-- Transform during copy
INSERT INTO events_daily
SELECT
    toDate(event_time) AS date,
    event_type,
    count() AS event_count,
    uniq(user_id) AS unique_users
FROM events
WHERE event_time >= today() - 1 AND event_time < today()
GROUP BY date, event_type;
```

## Method 2: Async Inserts

Async inserts let ClickHouse batch small inserts server-side.

### Enable Async Inserts

```sql
-- Per-query
INSERT INTO events
SETTINGS async_insert = 1, wait_for_async_insert = 0
VALUES (...);

-- Or set as default for a user
ALTER USER default SETTINGS async_insert = 1;
```

### Configuration

```sql
-- Key settings
SET async_insert = 1;                    -- Enable async inserts
SET wait_for_async_insert = 0;           -- Don't wait for flush (fastest)
SET async_insert_max_data_size = 10000000;  -- Flush at 10MB
SET async_insert_busy_timeout_ms = 200;  -- Max wait before flush
SET async_insert_stale_timeout_ms = 1000; -- Flush stale data
```

### When to Use Async Inserts

- Many small inserts from multiple clients
- When clients can't easily batch (e.g., serverless functions)
- Acceptable to trade latency for throughput

### Monitoring Async Inserts

```sql
-- Check async insert queue
SELECT
    table,
    bytes,
    rows,
    entries
FROM system.asynchronous_inserts;

-- Check async insert metrics
SELECT
    metric,
    value
FROM system.metrics
WHERE metric LIKE '%AsyncInsert%';
```

## Method 3: Buffer Tables

Buffer tables accumulate inserts in memory before flushing to the destination.

### Create Buffer Table

```sql
-- Destination table
CREATE TABLE events
(
    event_id UInt64,
    event_type String,
    event_time DateTime
)
ENGINE = MergeTree()
ORDER BY event_time;

-- Buffer table
CREATE TABLE events_buffer AS events
ENGINE = Buffer(
    'default',          -- Database
    'events',           -- Destination table
    16,                 -- Number of buffers
    10,                 -- Min seconds before flush
    100,                -- Max seconds before flush
    10000,              -- Min rows before flush
    1000000,            -- Max rows before flush
    10000000,           -- Min bytes before flush
    100000000           -- Max bytes before flush
);
```

### Insert to Buffer

```sql
-- Inserts go to buffer, automatically flushed to destination
INSERT INTO events_buffer VALUES (1, 'click', now());
```

### Flush Manually

```sql
-- Force flush all buffers
OPTIMIZE TABLE events_buffer;
```

### Buffer Considerations

- Data in buffer is lost on server crash
- Queries against buffer table include unflushed data
- Use for high-frequency small inserts from trusted sources

## Method 4: File Imports

### CSV Import

```sql
-- From local file
INSERT INTO events
SELECT *
FROM file('events.csv', 'CSVWithNames');

-- With transformation
INSERT INTO events
SELECT
    toUInt64(id) AS event_id,
    type AS event_type,
    parseDateTimeBestEffort(timestamp) AS event_time
FROM file('events.csv', 'CSVWithNames');
```

### Import from URL

```sql
INSERT INTO events
SELECT *
FROM url('https://example.com/data/events.csv', 'CSVWithNames');
```

### Import from S3

```sql
INSERT INTO events
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/events/*.parquet',
    'AWS_ACCESS_KEY',
    'AWS_SECRET_KEY',
    'Parquet'
);
```

### Parallel File Import

```sql
-- Import multiple files in parallel
INSERT INTO events
SELECT *
FROM s3(
    'https://bucket.s3.amazonaws.com/events/2024-01-*.parquet',
    'key',
    'secret',
    'Parquet'
)
SETTINGS max_threads = 16, max_insert_threads = 16;
```

## Method 5: clickhouse-client CLI

### Piped Input

```bash
# From CSV file
cat events.csv | clickhouse-client --query="INSERT INTO events FORMAT CSVWithNames"

# From compressed file
zcat events.csv.gz | clickhouse-client --query="INSERT INTO events FORMAT CSVWithNames"

# From command output
generate_events | clickhouse-client --query="INSERT INTO events FORMAT JSONEachRow"
```

### Native Format (Fastest)

```bash
# Export in native format
clickhouse-client --query="SELECT * FROM events FORMAT Native" > events.native

# Import native format (fastest)
clickhouse-client --query="INSERT INTO events FORMAT Native" < events.native
```

### Parallel Import with clickhouse-local

```bash
# Process and insert in one command
clickhouse-local --query="
    INSERT INTO FUNCTION remote('clickhouse-server', default, events)
    SELECT *
    FROM file('events_*.csv', 'CSVWithNames')
" --max_threads=16
```

## Optimization Settings

### Insert Performance Settings

```sql
-- Parallelize inserts
SET max_insert_threads = 8;

-- Larger blocks for better compression
SET min_insert_block_size_rows = 1048576;
SET min_insert_block_size_bytes = 268435456;

-- Skip indexes during insert (faster, rebuild later)
SET materialize_skip_indexes_on_insert = 0;

-- Disable fsync for faster inserts (less durable)
SET fsync_after_insert = 0;
```

### For Large Imports

```sql
-- Disable deduplication
SET insert_deduplicate = 0;

-- Skip constraint checks
SET check_constraints = 0;

-- Increase memory limits
SET max_memory_usage = 20000000000;

-- Allow more parts
SET parts_to_throw_insert = 10000;
```

## Best Practices

### 1. Right-Size Your Batches

```
Rows per batch    | Parts created | Merge load | Insert speed
------------------|---------------|------------|-------------
1                 | Very High     | Critical   | Very Slow
100               | High          | Heavy      | Slow
10,000            | Moderate      | Moderate   | Good
100,000           | Low           | Light      | Very Good
1,000,000         | Very Low      | Minimal    | Excellent
```

Aim for 100,000 to 1,000,000 rows per INSERT.

### 2. Monitor Part Count

```sql
-- Check active parts
SELECT
    table,
    count() AS parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE active
GROUP BY table
ORDER BY parts DESC;

-- Alert if too many parts
SELECT count() > 300 AS too_many_parts
FROM system.parts
WHERE active AND table = 'events';
```

### 3. Avoid Concurrent Small Inserts

```sql
-- BAD: 100 clients each inserting 100 rows
-- Creates 100 parts simultaneously

-- GOOD: Funnel through a queue or buffer
-- Or use async_insert = 1
```

### 4. Use Appropriate Formats

| Format | Speed | Compression | Use Case |
|--------|-------|-------------|----------|
| Native | Fastest | Good | ClickHouse to ClickHouse |
| RowBinary | Very Fast | Good | Binary protocols |
| Parquet | Fast | Excellent | Data lake interchange |
| JSONEachRow | Moderate | Poor | API ingestion |
| CSV | Moderate | Poor | Simple interchange |

### 5. Pre-Sort Data When Possible

```sql
-- If data is pre-sorted by ORDER BY columns, inserts are faster
-- The server doesn't need to sort

-- Export sorted
SELECT * FROM events ORDER BY (event_type, event_time) FORMAT Native

-- Or sort before INSERT
INSERT INTO events
SELECT * FROM staging_events
ORDER BY (event_type, event_time);
```

## Handling Insert Failures

### Retry Logic

```python
import time
from clickhouse_connect.driver.exceptions import ClickHouseError

def insert_with_retry(client, table, data, max_retries=3):
    for attempt in range(max_retries):
        try:
            client.insert(table, data)
            return True
        except ClickHouseError as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
    return False
```

### Idempotent Inserts

Use ReplicatedMergeTree's deduplication:

```sql
-- Enable insert deduplication (default for Replicated tables)
SET insert_deduplicate = 1;

-- Same insert block won't be duplicated
INSERT INTO events VALUES (1, 'click', now());
INSERT INTO events VALUES (1, 'click', now());  -- Deduplicated!
```

### Partial Failure Handling

```sql
-- Allow partial success
SET input_format_allow_errors_ratio = 0.01;  -- Allow 1% errors
SET input_format_allow_errors_num = 100;     -- Or up to 100 errors

INSERT INTO events FORMAT JSONEachRow
{"id": 1, "type": "click"}
{"id": "bad", "type": "view"}  -- This row fails, others succeed
{"id": 3, "type": "purchase"}
```

## Benchmarking Inserts

```sql
-- Measure insert performance
SET send_logs_level = 'trace';

INSERT INTO events
SELECT
    number,
    ['click', 'view', 'purchase'][rand() % 3 + 1],
    now() - rand() % 86400
FROM numbers(10000000);

-- Check metrics
SELECT
    query,
    written_rows,
    written_bytes,
    query_duration_ms,
    written_rows / (query_duration_ms / 1000) AS rows_per_second
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE 'INSERT INTO events%'
ORDER BY event_time DESC
LIMIT 1;
```

---

Efficient bulk insertion in ClickHouse comes down to batching. Batch at least 10,000 rows per INSERT, use async inserts when clients can't batch, and monitor your part count to ensure the merge process keeps up. With proper batching, ClickHouse can sustain millions of rows per second.
