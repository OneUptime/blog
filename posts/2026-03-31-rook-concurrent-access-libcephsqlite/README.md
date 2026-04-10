# How to Handle Concurrent Access with libcephsqlite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, SQLite, libcephsqlite, Concurrency, Locking, RADOS

Description: Understand and manage concurrent access to libcephsqlite databases using RADOS locking, WAL mode, and proper connection handling to avoid conflicts.

---

libcephsqlite uses RADOS locking to coordinate concurrent database access from multiple processes or hosts. Understanding the locking model helps you design applications that access Ceph-backed SQLite databases safely without deadlocks or data corruption.

## How libcephsqlite Handles Locking

SQLite uses file-level locking on local filesystems. libcephsqlite replaces this with RADOS object locks (`rados_lock_exclusive`, `rados_lock_shared`) to coordinate concurrent access across nodes.

Lock types:
- **Shared lock** - multiple readers can hold simultaneously
- **Reserved lock** - signals intent to write, blocks new readers
- **Exclusive lock** - single writer, blocks all others

## WAL Mode for Better Concurrency

In WAL (Write-Ahead Log) mode, readers do not block writers and writers do not block readers. This is the recommended mode for multi-process access:

```python
import sqlite3
import ctypes

ctypes.CDLL("/usr/lib/x86_64-linux-gnu/libcephsqlite.so")

conn = sqlite3.connect("file:mypool/shared.db?vfs=ceph", uri=True)

# Enable WAL mode - persist this setting in the database
result = conn.execute("PRAGMA journal_mode=WAL").fetchone()
print(f"Journal mode: {result[0]}")  # Should print: wal

conn.execute("PRAGMA synchronous=NORMAL")
conn.execute("PRAGMA wal_autocheckpoint=1000")
conn.commit()
```

## Busy Timeout Configuration

When multiple processes compete, configure a busy timeout so connections wait instead of immediately failing:

```python
conn = sqlite3.connect("file:mypool/shared.db?vfs=ceph", uri=True, timeout=30)

# Or set after connecting
conn.execute("PRAGMA busy_timeout=30000")  # 30 seconds in ms
```

## Multi-Process Access Pattern

```python
# writer.py - single writer process
import sqlite3, ctypes, time

ctypes.CDLL("/usr/lib/x86_64-linux-gnu/libcephsqlite.so")

def writer_process():
    conn = sqlite3.connect("file:data/events.db?vfs=ceph", uri=True, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")

    while True:
        try:
            with conn:
                conn.execute(
                    "INSERT INTO events (type, data) VALUES (?, ?)",
                    ("heartbeat", "writer-01")
                )
            time.sleep(1)
        except sqlite3.OperationalError as e:
            print(f"Write conflict: {e}, retrying...")
            time.sleep(0.5)
```

```python
# reader.py - multiple reader processes can run simultaneously
import sqlite3, ctypes

ctypes.CDLL("/usr/lib/x86_64-linux-gnu/libcephsqlite.so")

def reader_process():
    # Read-only connections do not block writers in WAL mode
    conn = sqlite3.connect(
        "file:data/events.db?vfs=ceph&mode=ro",
        uri=True,
        timeout=30
    )
    rows = conn.execute(
        "SELECT * FROM events ORDER BY id DESC LIMIT 20"
    ).fetchall()
    conn.close()
    return rows
```

## Handling Lock Contention

```python
import sqlite3, ctypes, time, random

ctypes.CDLL("/usr/lib/x86_64-linux-gnu/libcephsqlite.so")

def write_with_retry(conn, query, params, max_retries=5):
    for attempt in range(max_retries):
        try:
            with conn:
                conn.execute(query, params)
            return True
        except sqlite3.OperationalError as e:
            if "locked" in str(e).lower() and attempt < max_retries - 1:
                # Exponential backoff with jitter
                wait = (2 ** attempt) * 0.1 + random.uniform(0, 0.1)
                time.sleep(wait)
            else:
                raise
    return False
```

## Monitoring Lock State

```bash
# Check if a RADOS lock is currently held on the database object
rados -p mypool lock info shared.db cephsqlite

# List all locks on the database object
rados -p mypool lock list shared.db
```

## Limitations and Best Practices

Key constraints with libcephsqlite concurrency:

- **Single writer**: Only one process can write at a time (SQLite limitation)
- **Network latency**: RADOS lock round-trips add latency compared to local SQLite
- **Checkpoint frequency**: WAL files need periodic checkpointing

```python
# Force a WAL checkpoint (consolidates WAL into main DB file)
conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
```

## Summary

libcephsqlite uses RADOS locking to coordinate concurrent access across multiple processes and hosts. WAL mode is essential for achieving good concurrent performance - it allows simultaneous readers while a writer holds its lock. Configure a generous `busy_timeout` to prevent immediate failures under contention, and implement retry logic with exponential backoff for write-heavy workloads. For best results, designate a single writer process per database while allowing many concurrent readers.
