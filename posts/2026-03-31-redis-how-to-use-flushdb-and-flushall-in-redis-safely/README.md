# How to Use FLUSHDB and FLUSHALL in Redis Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Management, Administration, Command, Safety

Description: Learn how to use FLUSHDB and FLUSHALL in Redis to clear data from one or all databases, including ASYNC options and safety practices to prevent accidental data loss.

---

## What Are FLUSHDB and FLUSHALL

`FLUSHDB` deletes all keys in the currently selected database. `FLUSHALL` deletes all keys in all databases. Both are destructive operations with no undo - use them with extreme care in production.

```text
FLUSHDB [ASYNC | SYNC]
FLUSHALL [ASYNC | SYNC]
```

Returns `OK` on success.

## FLUSHDB - Clear Current Database Only

```bash
# Clear all keys in the current database (db 0 by default)
SELECT 0
FLUSHDB
# OK

# Clear a specific database
SELECT 3
FLUSHDB
# OK - only db 3 is cleared, others untouched
```

## FLUSHALL - Clear All Databases

```bash
# Delete everything in all databases
FLUSHALL
# OK
```

This affects database 0 through 15 (or however many are configured).

## ASYNC vs SYNC Options

**Default behavior** (depends on `lazyfree-lazy-user-flush` config):

```bash
# Default flush (sync or async based on config)
FLUSHDB
FLUSHALL
```

**Explicit async flush** - returns immediately, deletion happens in background:

```bash
FLUSHDB ASYNC
FLUSHALL ASYNC
```

**Explicit sync flush** - blocks until all keys are deleted:

```bash
FLUSHDB SYNC
FLUSHALL SYNC
```

Use `ASYNC` in production to avoid blocking the server during large flushes.

## Checking Current Database

```bash
# Verify you're in the right database before flushing
SELECT 3
DBSIZE      # Count keys first
DBSIZE      # Make sure it's what you expect
FLUSHDB     # Then flush
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def safe_flushdb(db_number, confirm=True):
    """Flush a specific database with confirmation."""
    db_client = redis.Redis(host='localhost', port=6379, db=db_number, decode_responses=True)
    key_count = db_client.dbsize()

    print(f"Database {db_number} has {key_count} key(s)")

    if confirm and key_count > 0:
        answer = input(f"Delete all {key_count} keys in DB {db_number}? (yes/no): ")
        if answer.lower() != 'yes':
            print("Aborted")
            return False

    # Use async to avoid blocking
    db_client.flushdb(asynchronous=True)
    print(f"Database {db_number} flush initiated (async)")
    return True

# Safe flush of test database
safe_flushdb(15)
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

(async () => {
    const client = createClient({ database: 3 });
    await client.connect();

    // Count keys before flushing
    const keyCount = await client.dbSize();
    console.log(`About to delete ${keyCount} key(s) from DB 3`);

    // Async flush
    await client.flushDb('ASYNC');
    console.log('Database 3 cleared (async)');

    // Verify
    const afterCount = await client.dbSize();
    console.log(`Keys remaining: ${afterCount}`); // 0

    await client.disconnect();
})();
```

## FLUSHALL with Precautions

```python
import redis
import os

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def safe_flushall():
    """Flush all databases with environment safety check."""

    # Only allow in non-production environments
    env = os.environ.get('ENVIRONMENT', 'production')
    if env == 'production':
        raise RuntimeError("FLUSHALL is not allowed in production!")

    # Count total keys across all databases
    total_keys = 0
    info = client.info('keyspace')
    for db_info in info.values():
        if isinstance(db_info, dict):
            total_keys += db_info.get('keys', 0)

    print(f"Flushing ALL {total_keys} keys from all databases in {env}")
    client.flushall(asynchronous=True)
    print("All databases cleared")

# Safe to call in development/staging
safe_flushall()
```

## Protect Against Accidental FLUSHALL

Use ACL rules to prevent unauthorized flushes:

```bash
# Disable FLUSHALL and FLUSHDB for application users
ACL SETUSER app_user on >password ~* &* +@all -flushall -flushdb

# Only allow admin users to flush
ACL SETUSER admin_user on >adminpassword ~* &* +@all
```

## Renaming Dangerous Commands

In `redis.conf`, rename dangerous commands to prevent accidental use:

```text
rename-command FLUSHDB "FLUSH_DB_c8a3f2d1"
rename-command FLUSHALL "FLUSH_ALL_a7b9e4c2"
```

Or disable entirely:

```text
rename-command FLUSHDB ""
rename-command FLUSHALL ""
```

## When to Use FLUSHDB vs FLUSHALL

| Command | Use Case |
|---------|----------|
| `FLUSHDB` | Clear test data from a specific database |
| `FLUSHDB` | Reset a specific feature's data (e.g., cache db) |
| `FLUSHALL` | Full environment reset in development |
| `FLUSHALL` | Before restoring from backup |

## Flushing in Testing Environments

```python
import redis
import pytest

@pytest.fixture
def redis_client():
    """Provide a clean Redis database for each test."""
    client = redis.Redis(host='localhost', port=6379, db=15, decode_responses=True)
    client.flushdb()  # Clean before test
    yield client
    client.flushdb()  # Clean after test

def test_user_session(redis_client):
    redis_client.set('session:abc', 'user:1')
    assert redis_client.get('session:abc') == 'user:1'
    # DB is automatically cleaned up after the test
```

## Monitor After Flush

```python
import redis
import time

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def flush_and_monitor():
    before_count = client.dbsize()
    print(f"Keys before flush: {before_count}")

    client.flushdb(asynchronous=True)
    print("Async flush started")

    # Monitor until keys are gone
    for _ in range(10):
        time.sleep(0.1)
        count = client.dbsize()
        if count == 0:
            print("Flush complete - all keys deleted")
            break
        print(f"Remaining: {count}")

flush_and_monitor()
```

## Summary

`FLUSHDB` removes all keys from the current database while `FLUSHALL` removes all keys from every database. Both support `ASYNC` mode for non-blocking deletion in production environments. Protect these commands with ACL rules or command renaming, always verify the target database with `DBSIZE` before flushing, and restrict usage to authorized users in non-production environments only.
