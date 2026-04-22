# How to Configure libcephsqlite Connection Strings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, SQLite, libcephsqlite, Connection String, Configuration, RADOS

Description: Master libcephsqlite connection string syntax and options to configure pool, Ceph config path, auth credentials, and VFS parameters for SQLite on RADOS.

---

`libcephsqlite` uses SQLite's URI filename format to specify where the database lives in Ceph and how to authenticate. Understanding the connection string syntax is essential for correctly configuring database placement, auth, and behavior.

## URI Format Overview

The libcephsqlite connection string follows SQLite's URI format:

```yaml
file:///<pool>:[<namespace>]/<dbname>?vfs=ceph
```

Note the triple `///` - the URI authority must be empty or localhost for SQLite to parse it correctly.

Key components:
- `<pool>` - the RADOS pool name (or `*<poolid>` to use a numeric pool ID)
- `<namespace>` - optional RADOS namespace (separated from pool by a colon)
- `<dbname>` - the RADOS object name (the SQLite database file)
- `vfs=ceph` - required to activate the libcephsqlite VFS

## Basic Connection String

```bash
# Minimal connection - pool and object name (empty namespace)
sqlite3 "file:///mypool:/app.db?vfs=ceph"

# With WAL mode (requires exclusive locking mode)
sqlite3 "file:///mypool:/app.db?vfs=ceph" <<EOF
PRAGMA locking_mode=EXCLUSIVE;
PRAGMA journal_mode=WAL;
SELECT * FROM sqlite_master;
EOF
```

## Specifying a Custom Ceph Config

libcephsqlite does not accept custom configuration via URI query parameters. Instead, use environment variables to override the default Ceph config and keyring paths:

```bash
# Point to a non-default ceph.conf
export CEPH_CONF=/path/to/ceph.conf
sqlite3 "file:///mypool:/app.db?vfs=ceph"

# Use a specific keyring file
export CEPH_KEYRING=/etc/ceph/ceph.client.myapp.keyring
sqlite3 "file:///mypool:/app.db?vfs=ceph"
```

## Setting the Ceph Auth User

Use `CEPH_ARGS` to pass the client ID:

```bash
# Use a specific Ceph user (client.myapp -> id=myapp)
export CEPH_ARGS='--id myapp'
sqlite3 "file:///mypool:/app.db?vfs=ceph"
```

## Python Examples with Different Connection Strings

```python
import sqlite3
import os

# Set Ceph configuration via environment variables before connecting
os.environ["CEPH_CONF"] = "/etc/ceph/ceph.conf"
os.environ["CEPH_ARGS"] = "--id myapp"

# Default configuration (uses /etc/ceph/ceph.conf and client.admin)
conn = sqlite3.connect("file:///data:/myapp.db?vfs=ceph", uri=True)

# With a specific pool and namespace
conn = sqlite3.connect(
    "file:///app-pool:metrics/metrics.db?vfs=ceph",
    uri=True
)
```

## Environment Variable Configuration

You can set Ceph connection parameters via environment variables that the Ceph client library reads:

```bash
export CEPH_CONF=/etc/ceph/ceph.conf
export CEPH_KEYRING=/etc/ceph/ceph.client.myapp.keyring
export CEPH_ARGS='--id myapp'

# Now connection strings can be simpler
sqlite3 "file:///data:/app.db?vfs=ceph"
```

## Creating the Auth User and Pool

Before using a connection string, ensure the pool and user exist:

```bash
# Create the pool
ceph osd pool create mypool 32

# Create an auth user for the app
ceph auth get-or-create client.myapp \
  mon 'allow r' \
  osd 'allow rwx pool=mypool' \
  -o /etc/ceph/ceph.client.myapp.keyring
```

## Ceph Namespace Support

Use a RADOS namespace within a pool to organize databases:

```bash
# The namespace is specified between the pool and object name, separated by a colon
# Format: file:///pool:namespace/object?vfs=ceph
sqlite3 "file:///mypool:app1/config.db?vfs=ceph"
sqlite3 "file:///mypool:app2/config.db?vfs=ceph"

# Verify objects in the namespace
rados -p mypool -N app1 ls
rados -p mypool -N app2 ls
```

## Connection String Validation

```python
import sqlite3

def validate_ceph_connection(pool: str, db_name: str) -> bool:
    uri = f"file:///{pool}:/{db_name}?vfs=ceph"
    try:
        conn = sqlite3.connect(uri, uri=True, timeout=5)
        conn.execute("SELECT 1")
        conn.close()
        return True
    except sqlite3.OperationalError as e:
        print(f"Connection failed: {e}")
        return False

validate_ceph_connection("mypool", "test.db")
```

## Summary

libcephsqlite connection strings use SQLite's URI format with `?vfs=ceph` to route the connection through the RADOS backend. The path follows the format `file:///pool:[namespace]/dbname?vfs=ceph`, with the pool and optional namespace separated by a colon. Configuration such as the Ceph config path, keyring, and client ID are set via environment variables (`CEPH_CONF`, `CEPH_KEYRING`, `CEPH_ARGS`), not through URI query parameters. Note that libcephsqlite does not yet support concurrent readers - all database access is protected by a single exclusive lock. WAL mode is supported only with `locking_mode=EXCLUSIVE`. Always create the pool and Ceph auth user with appropriate OSD caps before attempting connections, and test connectivity with a simple `SELECT 1` before deploying to production.
