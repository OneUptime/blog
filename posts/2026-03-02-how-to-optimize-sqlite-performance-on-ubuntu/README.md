# How to Optimize SQLite Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SQLite, Database, Performance

Description: Practical techniques for tuning SQLite performance on Ubuntu, covering PRAGMAs, indexing strategies, query optimization, and configuration for high-throughput workloads.

---

SQLite performs remarkably well for many workloads right out of the box, but its default settings are conservative to favor safety and compatibility over speed. With a few targeted adjustments, you can dramatically increase throughput for both read-heavy and write-heavy workloads.

## Understanding SQLite's Default Bottlenecks

Before tuning, it helps to know where SQLite spends its time by default:

- Every write transaction is followed by a `fsync()` call to ensure durability
- The page cache is small (2MB by default)
- Journal mode uses DELETE journaling, which is slower than WAL
- Foreign keys are not enforced by default (a feature, but worth noting)
- The query planner may not always make optimal choices without statistics

Most of these can be addressed with PRAGMA settings.

## Essential PRAGMAs for Performance

### Journal Mode

Switching from the default DELETE journal mode to WAL (Write-Ahead Logging) is the single biggest performance improvement for most workloads.

```sql
-- Set WAL mode (persists across connections)
PRAGMA journal_mode = WAL;

-- Verify
PRAGMA journal_mode;
-- Returns: wal
```

WAL allows concurrent readers while a writer is active, significantly improving read performance in multi-reader scenarios.

### Synchronous Mode

The `synchronous` PRAGMA controls how aggressively SQLite calls `fsync()`.

```sql
-- FULL: fsync after every write (default, safest)
PRAGMA synchronous = FULL;

-- NORMAL: fsync less often (safe with WAL, slight risk with DELETE journal)
PRAGMA synchronous = NORMAL;

-- OFF: never fsync (fastest, but data loss risk on OS crash)
PRAGMA synchronous = OFF;
```

For most production use cases with WAL mode, `NORMAL` is a good balance.

```sql
-- Recommended combination for performance + safety
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
```

### Page Cache Size

The default cache is 2000 pages at 4KB each = ~8MB. Increasing this reduces disk I/O for working sets that fit in memory.

```sql
-- Set cache size to 64MB (negative value = kilobytes)
PRAGMA cache_size = -65536;

-- Or set as number of pages (positive value)
PRAGMA cache_size = 16384;  -- 16384 pages * 4KB = 64MB

-- Check current setting
PRAGMA cache_size;
```

### Temp Store

SQLite uses temporary files for sorting and intermediate results. Moving temp storage to memory speeds up large queries.

```sql
-- Store temp tables in memory instead of disk
PRAGMA temp_store = MEMORY;
```

### Memory-Mapped I/O

For databases that fit in RAM, memory-mapped I/O can eliminate system call overhead.

```sql
-- Enable mmap for up to 512MB
PRAGMA mmap_size = 536870912;

-- Verify
PRAGMA mmap_size;
```

### WAL Auto-Checkpoint

The WAL file grows until it is checkpointed back to the main database. By default this happens after 1000 pages. Tune it based on your write pattern.

```sql
-- Increase checkpoint threshold (reduces checkpoint frequency)
PRAGMA wal_autocheckpoint = 10000;

-- Or run checkpoints manually during low traffic
PRAGMA wal_checkpoint(TRUNCATE);
```

## Setting PRAGMAs at Connection Time

PRAGMAs that affect performance need to be set on each connection since most are not persistent. Create a standard initialization function.

```python
import sqlite3

def get_optimized_connection(db_path):
    conn = sqlite3.connect(db_path)

    # Apply performance PRAGMAs
    conn.executescript('''
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = -65536;
        PRAGMA temp_store = MEMORY;
        PRAGMA mmap_size = 536870912;
        PRAGMA wal_autocheckpoint = 10000;
        PRAGMA foreign_keys = ON;
    ''')

    return conn

conn = get_optimized_connection('/data/myapp.db')
```

## Indexing Strategies

Indexes are often the highest-leverage optimization. The key is creating indexes that match your query patterns.

```sql
-- Analyze which queries are slow
-- First, run EXPLAIN QUERY PLAN on your slow queries
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 123 AND status = 'pending';

-- If you see "SCAN TABLE orders" instead of "SEARCH TABLE", add an index
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);

-- For range queries, column order in the index matters
-- Put equality columns first, range columns last
CREATE INDEX idx_orders_date ON orders(customer_id, created_at);

-- Covering indexes include all columns needed by the query
-- This avoids going back to the table at all
CREATE INDEX idx_orders_covering ON orders(status, customer_id, total_amount);
```

### Partial Indexes

If most queries only look at a subset of rows, a partial index is smaller and faster.

```sql
-- Index only pending orders (not completed/cancelled)
CREATE INDEX idx_pending_orders ON orders(customer_id, created_at)
WHERE status = 'pending';
```

## Batch Inserts with Transactions

Wrapping bulk inserts in a single transaction is critical for write performance.

```python
import sqlite3
import time

conn = get_optimized_connection('/data/myapp.db')

# Slow: individual transactions (one fsync per insert)
start = time.time()
for i in range(10000):
    conn.execute('INSERT INTO logs (message) VALUES (?)', (f'msg {i}',))
    conn.commit()
print(f'Individual commits: {time.time()-start:.2f}s')

# Fast: single transaction (one fsync for all 10000 inserts)
start = time.time()
with conn:  # automatically commits or rolls back
    for i in range(10000):
        conn.execute('INSERT INTO logs (message) VALUES (?)', (f'msg {i}',))
print(f'Single transaction: {time.time()-start:.2f}s')

# Fastest: executemany with prepared statement
data = [(f'msg {i}',) for i in range(10000)]
start = time.time()
with conn:
    conn.executemany('INSERT INTO logs (message) VALUES (?)', data)
print(f'executemany: {time.time()-start:.2f}s')
```

## Analyzing Query Plans

SQLite's query planner uses statistics gathered by `ANALYZE` to make better decisions.

```bash
sqlite3 /data/myapp.db << 'EOF'
-- Gather statistics for all tables
ANALYZE;

-- Check what stats were collected
SELECT * FROM sqlite_stat1 LIMIT 10;

-- Run ANALYZE on just one table
ANALYZE orders;
EOF
```

Run `ANALYZE` periodically, especially after large data loads.

## Monitoring Performance with Compile-time Features

On Ubuntu, you can build SQLite with additional performance and analysis features.

```bash
# Install build dependencies
sudo apt install build-essential -y

# Download SQLite source
wget https://www.sqlite.org/2024/sqlite-amalgamation-3450000.zip
unzip sqlite-amalgamation-3450000.zip
cd sqlite-amalgamation-3450000

# Compile with performance options
gcc -O3 -DSQLITE_ENABLE_STAT4 \
    -DSQLITE_DEFAULT_WAL_SYNCHRONOUS=1 \
    -DSQLITE_MAX_MMAP_SIZE=1073741824 \
    -o sqlite3 shell.c sqlite3.c -lpthread -ldl -lm
```

## Checking Database Page Utilization

Fragmentation and unused pages can slow reads.

```sql
-- Check database page stats
PRAGMA page_count;
PRAGMA page_size;

-- Reclaim unused space after deletes
VACUUM;

-- VACUUM INTO creates a clean copy in a new file
VACUUM INTO '/tmp/myapp_clean.db';
```

Running `VACUUM` periodically on databases with frequent deletes keeps performance consistent. Schedule it during low-traffic windows since it locks the database during operation.

## Benchmarking Your Changes

Always measure before and after tuning. A simple benchmark script:

```bash
#!/bin/bash
# Simple SQLite write benchmark

DB=/tmp/bench.db
rm -f $DB

time sqlite3 $DB << 'EOF'
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=-65536;
CREATE TABLE bench (id INTEGER PRIMARY KEY, val TEXT);
BEGIN;
WITH RECURSIVE cnt(x) AS (
  SELECT 1 UNION ALL SELECT x+1 FROM cnt WHERE x < 100000
)
INSERT INTO bench(val) SELECT hex(randomblob(16)) FROM cnt;
COMMIT;
EOF

echo "Row count:"
sqlite3 $DB "SELECT COUNT(*) FROM bench;"
rm -f $DB
```

The combination of WAL mode, synchronous=NORMAL, a larger cache, and proper indexing will handle the vast majority of SQLite performance needs without any application code changes.
