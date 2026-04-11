# How to Use MOVE in Redis to Move Keys Between Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, MOVE, Database, Key, Data Management

Description: Learn how to use MOVE in Redis to atomically transfer a key from one database to another within the same Redis server instance.

---

## What Is MOVE?

`MOVE` transfers a key from the currently selected database to another database on the same Redis server. The operation is atomic - if the key exists in the destination database, the move fails and the source key is preserved. This makes `MOVE` a safe way to migrate keys between Redis's logical databases (numbered 0-15 by default).

## Syntax

```text
MOVE key db
```

- `key` - the key to move
- `db` - the target database number (0-15 by default)

Returns `1` if the key was moved, `0` if the move failed (key does not exist in source, or already exists in destination).

## Basic Usage

```bash
# Work in database 0
SELECT 0
SET mykey "important data"

# Move mykey to database 1
MOVE mykey 1
# (integer) 1

# mykey is gone from database 0
GET mykey
# (nil)

# mykey exists in database 1
SELECT 1
GET mykey
# "important data"
```

## MOVE Is Conditional

`MOVE` fails if the key already exists in the destination database:

```bash
SELECT 0
SET shared-key "source data"

SELECT 1
SET shared-key "destination data"

SELECT 0
MOVE shared-key 1
# (integer) 0 - failed, key exists in db 1

# Source key is untouched
GET shared-key
# "source data"
```

## TTL Preservation

When a key is moved, its TTL is preserved in the destination database:

```bash
SELECT 0
SET temp-key "expiring data"
EXPIRE temp-key 600

MOVE temp-key 1

SELECT 1
TTL temp-key
# (integer) ~600
```

## Practical Use Cases

### Promoting Keys from Staging to Production Namespace

```python
import redis

# In multi-database setups, some teams use db 0 for production and db 1 for staging
r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def promote_key_to_production(key: str, staging_db: int = 1, production_db: int = 0):
    """Move a key from staging DB to production DB."""
    # Switch to staging database
    staging_conn = redis.Redis(host="localhost", port=6379, db=staging_db, decode_responses=True)

    result = staging_conn.move(key, production_db)
    if result:
        print(f"Key '{key}' moved from db {staging_db} to db {production_db}")
    else:
        print(f"Move failed - key may not exist or already exists in db {production_db}")
    return result

promote_key_to_production("feature-flags:beta", staging_db=1, production_db=0)
```

### Isolating Expired Session Keys

```python
import redis

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
archive = redis.Redis(host="localhost", port=6379, db=2, decode_responses=True)

def archive_session(session_key: str):
    """Move a session key to an archive database."""
    result = r.move(session_key, 2)  # Move to db 2
    if result:
        # Set a longer TTL in archive for audit purposes
        archive.expire(session_key, 86400 * 30)
        print(f"Session '{session_key}' archived to db 2")
    else:
        print(f"Could not archive '{session_key}' - may not exist or already archived")

archive_session("session:expired:abc123")
```

## MOVE vs COPY vs RENAME

| Feature | MOVE | COPY | RENAME |
|---------|------|------|--------|
| Source preserved | No | Yes | No |
| Cross-database | Yes | Yes | No |
| Overwrites destination | No (conditional) | With REPLACE | Yes |
| Same DB operation | No | Yes | Yes |

## Limitations and Considerations

- **Same server only** - `MOVE` only works between databases on the same Redis instance. For cross-server migration, use `DUMP` + `RESTORE` or `COPY` (if Redis 6.2+ is available).
- **No multi-database support in cluster mode** - Redis Cluster only supports database 0, so `MOVE` is not available in cluster deployments.
- **Not for high-traffic keys** - While `MOVE` is atomic (Redis executes it in a single-threaded event loop with no interleaving), moving frequently accessed keys between databases can complicate application logic that expects the key in a specific database.

```bash
# MOVE fails in cluster mode
MOVE mykey 1
# (error) ERR MOVE is not allowed in cluster mode
```

## Checking the Target Database Before Moving

```python
import redis

r0 = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
r1 = redis.Redis(host="localhost", port=6379, db=1, decode_responses=True)

def safe_move(key: str, source_db: int = 0, target_db: int = 1):
    """Move a key only if it does not already exist in the target."""
    source_conn = redis.Redis(host="localhost", port=6379, db=source_db, decode_responses=True)
    target_conn = redis.Redis(host="localhost", port=6379, db=target_db, decode_responses=True)

    if not source_conn.exists(key):
        print(f"Key '{key}' does not exist in db {source_db}")
        return False

    if target_conn.exists(key):
        print(f"Key '{key}' already exists in db {target_db} - cannot move")
        return False

    result = source_conn.move(key, target_db)
    if result:
        print(f"Key '{key}' successfully moved from db {source_db} to db {target_db}")
    return bool(result)

safe_move("mykey")
```

## Summary

`MOVE` atomically transfers a key from the current Redis database to a specified target database on the same server. If the key already exists in the destination, the move is rejected and the source key remains intact. TTL values are preserved during the move. `MOVE` is useful for logical database segregation, key promotion workflows, and archiving, but is not available in Redis Cluster mode (which only supports database 0). For cross-server migration, use `DUMP` + `RESTORE` or `COPY` instead.
