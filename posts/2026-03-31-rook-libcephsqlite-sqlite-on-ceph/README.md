# How to Use libcephsqlite for SQLite on Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, SQLite, libcephsqlite, Database

Description: Learn how to use libcephsqlite to store and access SQLite databases directly on Ceph RADOS object storage for distributed, concurrent database access.

---

libcephsqlite is a SQLite Virtual File System (VFS) that stores SQLite database files as RADOS objects on a Ceph cluster. It enables multiple processes across different hosts to share a single SQLite database with distributed locking, without needing a traditional network filesystem.

## How libcephsqlite Works

SQLite's VFS interface allows custom storage backends. libcephsqlite implements this interface using RADOS:

- The database file is striped across multiple RADOS objects using a custom SimpleRADOSStriper
- The rollback journal is also striped across RADOS objects
- Distributed locking uses RADOS exclusive locks on the first stripe object of the database

## Installation

```bash
# Install on systems with Ceph packages
sudo apt install libsqlite3-mod-ceph  # Ubuntu/Debian
sudo dnf install libcephsqlite         # RHEL/CentOS
```

## Using libcephsqlite from the Command Line

Load the VFS and open a database stored on Ceph:

```bash
sqlite3 -cmd '.load libcephsqlite.so' \
  -cmd '.open file:///mypool:/mydb.sqlite?vfs=ceph' \
  "CREATE TABLE events (id INTEGER PRIMARY KEY, name TEXT, ts DATETIME);" \
  "INSERT INTO events VALUES (1, 'startup', datetime('now'));" \
  "SELECT * FROM events;"
```

## Using from Python with sqlite3

```python
import sqlite3
import ctypes

# Load the libcephsqlite shared library
ctypes.CDLL("libcephsqlite.so")

# Connect using the ceph VFS
conn = sqlite3.connect(
    "file:///mypool:/mydb.sqlite?vfs=ceph",
    uri=True,
    check_same_thread=False
)

# Create a table and insert data
conn.execute("""
    CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT NOT NULL,
        value REAL NOT NULL,
        recorded_at TEXT DEFAULT (datetime('now'))
    )
""")

conn.execute("INSERT INTO metrics (host, value) VALUES (?, ?)", ("node-1", 92.5))
conn.commit()

# Query
rows = conn.execute("SELECT * FROM metrics").fetchall()
for row in rows:
    print(row)

conn.close()
```

## URI Format

The connection URI follows this format:

```text
file:///pool:namespace/dbname?vfs=ceph
```

Examples:

```text
file:///mypool:/app.db?vfs=ceph
file:///analytics:mynamespace/events.sqlite?vfs=ceph
```

## Configuring the Ceph Connection

libcephsqlite reads the standard Ceph configuration:

```bash
export CEPH_CONF=/etc/ceph/ceph.conf
```

Or set it programmatically in C:

```c
#include <libcephsqlite.h>
sqlite3_cephsqlite_init(db, NULL, NULL);
```

## Limitations and Use Cases

libcephsqlite is best suited for:

- Configuration stores accessed by multiple cluster nodes
- Low-to-moderate write workloads with many readers
- Applications already using SQLite that need distributed access

It is not suitable for high-write-throughput workloads, as RADOS locking overhead limits concurrent write performance.

## Summary

libcephsqlite implements a SQLite VFS backed by RADOS, enabling SQLite databases to be stored directly on Ceph and accessed concurrently from multiple hosts. The `file:///pool:namespace/dbname?vfs=ceph` URI format connects applications to RADOS-backed databases, making it an excellent choice for distributed configuration stores and shared lookup tables in Ceph-centric infrastructure.
