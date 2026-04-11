# How to Write a Redis Key Cleanup Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Script, Cleanup, Memory, Bash

Description: Write a safe Redis key cleanup script using SCAN to delete expired patterns, orphaned keys, and oversized keys without blocking production.

---

Redis can accumulate stale keys over time - expired sessions that were never cleaned up, orphaned cache entries from deprecated features, or test data that crept into production. A cleanup script using SCAN removes these without the blocking behavior of KEYS.

## Why SCAN Not KEYS

`KEYS pattern` blocks Redis while it scans all keys - catastrophic on a database with millions of entries. `SCAN` is non-blocking and iterates in chunks:

```bash
# NEVER use this in production:
redis-cli KEYS "session:*" | xargs redis-cli DEL

# Always use SCAN instead:
redis-cli --scan --pattern "session:*" | xargs -L 100 redis-cli DEL
```

## Bash Cleanup Script

```bash
#!/bin/bash
# redis-cleanup.sh

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
DRY_RUN="${DRY_RUN:-true}"
BATCH_SIZE=100
SCAN_COUNT=200

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Build redis-cli base command (plain string so xargs can use it)
CLI_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
if [ -n "$REDIS_PASSWORD" ]; then
    CLI_CMD="$CLI_CMD -a $REDIS_PASSWORD --no-auth-warning"
fi

delete_pattern() {
    local pattern="$1"
    local deleted=0
    local cursor=0

    log "Scanning pattern: $pattern (dry_run=$DRY_RUN)"

    while true; do
        result=$($CLI_CMD SCAN "$cursor" MATCH "$pattern" COUNT "$SCAN_COUNT")
        cursor=$(echo "$result" | head -1)
        keys=$(echo "$result" | tail -n +2)

        if [ -n "$keys" ]; then
            count=$(echo "$keys" | wc -l)
            deleted=$((deleted + count))
            if [ "$DRY_RUN" != "true" ]; then
                echo "$keys" | xargs -L "$BATCH_SIZE" $CLI_CMD DEL > /dev/null
            else
                log "[DRY RUN] Would delete $count keys (cursor=$cursor)"
            fi
        fi

        [ "$cursor" = "0" ] && break
        sleep 0.01  # be gentle on production
    done

    log "Pattern '$pattern': found $deleted keys"
}

# Clean up common stale patterns
delete_pattern "session:expired:*"
delete_pattern "cache:v1:*"       # old cache version
delete_pattern "tmp:*"
delete_pattern "test:*"

log "Cleanup complete"
```

## Python Script with TTL-Based Cleanup

Delete keys that have no TTL and match an unexpected pattern (potential leaks):

```python
#!/usr/bin/env python3
import redis
import os

r = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    password=os.getenv("REDIS_PASSWORD"),
    decode_responses=True,
)

def find_keys_without_ttl(pattern: str, max_count: int = 10000) -> list:
    no_ttl_keys = []
    cursor = 0
    found = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=200)
        for key in keys:
            ttl = r.ttl(key)
            if ttl == -1:  # -1 means no expiry
                no_ttl_keys.append(key)
            found += 1
            if found >= max_count:
                break
        if cursor == 0 or found >= max_count:
            break
    return no_ttl_keys

def cleanup_oversized_lists(pattern: str, max_length: int = 10000):
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=100)
        for key in keys:
            key_type = r.type(key)
            if key_type == "list":
                length = r.llen(key)
                if length > max_length:
                    # Trim to last max_length entries
                    r.ltrim(key, -max_length, -1)
                    print(f"Trimmed {key}: {length} -> {max_length}")
        if cursor == 0:
            break

if __name__ == "__main__":
    leaked = find_keys_without_ttl("cache:*")
    print(f"Found {len(leaked)} cache keys without TTL")
    cleanup_oversized_lists("list:*")
```

## Running Safely in Production

```bash
# Always test with dry run first
DRY_RUN=true ./redis-cleanup.sh

# Then run with actual deletion during low-traffic hours
DRY_RUN=false ./redis-cleanup.sh
```

## Summary

Redis key cleanup scripts use SCAN with pattern matching and batch deletion to avoid blocking production. A dry-run mode lets you preview deletions before committing. Python-based cleanup adds smarter heuristics - finding keys without TTLs and trimming oversized lists. Always run cleanup during low-traffic windows and rate-limit with small sleeps between batches.
