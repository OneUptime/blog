# How to Use libcephsqlite for SQLite on RADOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, SQLite, libcephsqlite, RADOS, Database, Storage

Description: Use libcephsqlite to store SQLite databases directly in Ceph RADOS, enabling replicated, distributed SQLite storage without a shared filesystem.

---

`libcephsqlite` is a SQLite VFS (Virtual File System) extension that stores SQLite database files as RADOS objects in Ceph. This allows you to use SQLite with Ceph's replication, durability, and distributed access - without needing a mounted filesystem.

## What libcephsqlite Provides

- SQLite databases stored as RADOS objects (no filesystem mount needed)
- Replication and durability from Ceph (no separate backup for the SQLite file)
- Serialized access coordination using RADOS exclusive locking
- Standard SQLite API - no application code changes required beyond the VFS registration

## Prerequisites

```bash
# libcephsqlite is included with Ceph (Pacific 16.2.x+)
# Verify the library is installed
ls /usr/lib/x86_64-linux-gnu/libcephsqlite.so  # Debian/Ubuntu x86_64
ls /usr/lib64/libcephsqlite.so                  # RHEL/CentOS x86_64

# Or install it
apt install libcephsqlite  # Debian/Ubuntu
dnf install libcephsqlite  # RHEL/CentOS
```

## Loading libcephsqlite in SQLite

```bash
# Open SQLite with the extension loaded and database opened via -cmd flags
# Format: file:///<pool>:[namespace]/<dbname>?vfs=ceph
sqlite3 -cmd '.load libcephsqlite.so' -cmd '.open file:///mypool:/myapp.db?vfs=ceph'

# Use it like any SQLite database
CREATE TABLE events (id INTEGER PRIMARY KEY, ts TEXT, message TEXT);
INSERT INTO events (ts, message) VALUES (datetime('now'), 'test entry');
SELECT * FROM events;
```

## Using libcephsqlite from Python

```python
import sqlite3
import ctypes

# Load the libcephsqlite extension
libcephsqlite = ctypes.CDLL("/usr/lib/x86_64-linux-gnu/libcephsqlite.so")

# Connect using the ceph VFS
# Format: file:///<pool>:[namespace]/<dbname>?vfs=ceph
conn = sqlite3.connect("file:///mypool:/myapp.db?vfs=ceph", uri=True)

conn.execute("""
    CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        recorded_at TEXT DEFAULT (datetime('now'))
    )
""")

conn.execute("INSERT INTO metrics (host, metric, value) VALUES (?, ?, ?)",
             ("web-01", "cpu_pct", 42.5))
conn.commit()

rows = conn.execute("SELECT * FROM metrics ORDER BY recorded_at DESC LIMIT 10").fetchall()
for row in rows:
    print(row)

conn.close()
```

## Verifying the RADOS Objects

The SQLite database is stored as RADOS objects in the pool:

```bash
# List objects in the pool
rados -p mypool ls | grep myapp

# Objects are striped, so you will see names like:
# myapp.db.0000000000000000  (first stripe)
# myapp.db.0000000000000001  (second stripe, if data exceeds one stripe)
# myapp.db-journal.0000000000000000  (journal file, if using rollback journal mode)

# To export a database from RADOS:
rados -p mypool --striper get myapp.db myapp-local.db
```

## Ceph Configuration for libcephsqlite

By default, libcephsqlite reads `/etc/ceph/ceph.conf`. You can override this:

```bash
# Set via environment variables
export CEPH_CONF=/path/to/custom/ceph.conf
export CEPH_KEYRING=/path/to/ceph.keyring
export CEPH_ARGS='--id myclientid'

# Then use SQLite normally
sqlite3 -cmd '.load libcephsqlite.so' -cmd '.open file:///mypool:/myapp.db?vfs=ceph'
```

## Summary

`libcephsqlite` makes it possible to use SQLite as an application database backed by Ceph RADOS, gaining Ceph's replication and durability without requiring a mounted filesystem. The library implements the SQLite VFS interface, so existing SQLite code works without modification - just load the extension and use the `ceph` VFS in the connection URI. Database files are stored as RADOS objects in a Ceph pool, making them accessible from any node that can reach the cluster.
