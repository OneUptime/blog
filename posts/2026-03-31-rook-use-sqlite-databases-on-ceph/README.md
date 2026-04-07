# How to Use SQLite Databases Stored on Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, SQLite, libcephsqlite, RADOS, Database, Application

Description: Build applications that use SQLite databases backed by Ceph RADOS, covering schema creation, CRUD operations, WAL mode, and best practices for distributed use.

---

With `libcephsqlite`, your application uses standard SQLite APIs but the database lives in Ceph RADOS instead of a local file. This guide covers practical usage patterns: schema design, CRUD operations, WAL mode configuration, and data access patterns suitable for Ceph-backed SQLite.

## Application Setup

```python
# app_db.py
import sqlite3
import ctypes
import os

# Load the libcephsqlite VFS extension
_lib = ctypes.CDLL("/usr/lib/x86_64-linux-gnu/libcephsqlite.so")

POOL = os.environ.get("CEPH_POOL", "appdata")
DB_NAME = os.environ.get("DB_NAME", "app.db")

# Set the Ceph client ID via environment variable
# e.g., export CEPH_ARGS='--id admin'

def get_connection() -> sqlite3.Connection:
    uri = f"file:///{POOL}/{DB_NAME}?vfs=ceph"
    conn = sqlite3.connect(uri, uri=True, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Exclusive locking is required for libcephsqlite
    conn.execute("PRAGMA locking_mode=EXCLUSIVE")
    # Enable WAL mode for better write performance (requires exclusive locking)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=10000")
    return conn
```

## Schema Creation

```python
def init_schema(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            quota_bytes INTEGER DEFAULT 10737418240
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL REFERENCES tenants(id),
            event_type TEXT NOT NULL,
            payload TEXT,
            occurred_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_events_tenant
            ON events(tenant_id, occurred_at DESC);

        CREATE INDEX IF NOT EXISTS idx_events_type
            ON events(event_type, occurred_at DESC);
    """)
    conn.commit()
```

## CRUD Operations

```python
def create_tenant(conn: sqlite3.Connection, tenant_id: str, name: str):
    conn.execute(
        "INSERT INTO tenants (id, name) VALUES (?, ?)",
        (tenant_id, name)
    )
    conn.commit()

def log_event(conn: sqlite3.Connection, tenant_id: str, event_type: str, payload: str = None):
    conn.execute(
        "INSERT INTO events (tenant_id, event_type, payload) VALUES (?, ?, ?)",
        (tenant_id, event_type, payload)
    )
    conn.commit()

def get_recent_events(conn: sqlite3.Connection, tenant_id: str, limit: int = 50):
    return conn.execute(
        "SELECT * FROM events WHERE tenant_id = ? ORDER BY occurred_at DESC LIMIT ?",
        (tenant_id, limit)
    ).fetchall()
```

## Transactions for Batch Operations

```python
def bulk_insert_events(conn: sqlite3.Connection, events: list):
    # Use explicit transactions for batch writes - much faster
    with conn:
        conn.executemany(
            "INSERT INTO events (tenant_id, event_type, payload) VALUES (?, ?, ?)",
            [(e["tenant_id"], e["type"], e["payload"]) for e in events]
        )
    # conn.commit() is called automatically by the context manager
```

## Read-Only Access Pattern

Since libcephsqlite uses exclusive locking, only one connection can access the database at a time. For read-only queries, open a separate connection when the writer is idle:

```python
def get_readonly_connection() -> sqlite3.Connection:
    uri = f"file:///{POOL}/{DB_NAME}?vfs=ceph&mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA locking_mode=EXCLUSIVE")
    return conn

# Usage
with get_readonly_connection() as ro_conn:
    stats = ro_conn.execute(
        "SELECT event_type, COUNT(*) as cnt FROM events GROUP BY event_type"
    ).fetchall()
    for row in stats:
        print(f"{row['event_type']}: {row['cnt']}")
```

## Backup and Export

```python
def backup_to_local(conn: sqlite3.Connection, local_path: str):
    # Use SQLite's built-in backup API to copy to a local file
    local_conn = sqlite3.connect(local_path)
    with local_conn:
        conn.backup(local_conn)
    local_conn.close()
    print(f"Database backed up to {local_path}")

# Usage
backup_to_local(conn, "/tmp/app-backup-20260331.db")
```

## Summary

Using SQLite on Ceph with libcephsqlite requires only loading the VFS extension and changing the connection URI. Standard SQLite APIs work unchanged for schema creation, CRUD operations, transactions, and backups. Enable WAL mode with exclusive locking for better write performance, use explicit transactions for bulk inserts, and use the SQLite backup API for data export. Note that libcephsqlite enforces exclusive locking, so only one connection can access the database at a time. The database is stored as RADOS objects in Ceph, gaining replication and durability without any changes to application business logic.
