# How to Write a Redis Bulk Delete Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Script, Delete, Bulk, Cleanup

Description: Bulk delete Redis keys by pattern using SCAN and pipeline DEL to safely remove large numbers of keys without blocking the server.

---

Removing millions of Redis keys with a pattern delete is dangerous if done naively. `DEL` on thousands of keys in one call blocks Redis; `KEYS` to list them first blocks the entire database. The safe approach combines SCAN (non-blocking iteration) with batched pipeline DEL.

## Safe Bulk Delete Script

```bash
#!/bin/bash
# redis-bulk-delete.sh

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
PATTERN="${1:-}"
BATCH_SIZE=500
SCAN_COUNT=1000
DRY_RUN="${DRY_RUN:-true}"

if [ -z "$PATTERN" ]; then
    echo "Usage: $0 <pattern>"
    echo "Example: $0 'session:*'"
    exit 1
fi

cli_cmd() {
    local args=("-h" "$REDIS_HOST" "-p" "$REDIS_PORT" "--no-auth-warning")
    [ -n "$REDIS_PASSWORD" ] && args+=("-a" "$REDIS_PASSWORD")
    redis-cli "${args[@]}" "$@"
}

log() { echo "[$(date '+%H:%M:%S')] $*"; }

deleted=0
cursor=0
batch=()

log "Starting bulk delete for pattern: '$PATTERN' (dry_run=$DRY_RUN)"

while true; do
    result=$(cli_cmd SCAN "$cursor" MATCH "$PATTERN" COUNT "$SCAN_COUNT")
    cursor=$(echo "$result" | head -1)
    keys=$(echo "$result" | tail -n +2)

    while IFS= read -r key; do
        [ -z "$key" ] && continue
        batch+=("$key")

        if [ "${#batch[@]}" -ge "$BATCH_SIZE" ]; then
            if [ "$DRY_RUN" != "true" ]; then
                cli_cmd DEL "${batch[@]}" > /dev/null
            fi
            deleted=$((deleted + ${#batch[@]}))
            log "Progress: deleted $deleted keys so far..."
            batch=()
            sleep 0.01  # gentle rate limiting
        fi
    done <<< "$keys"

    [ "$cursor" = "0" ] && break
done

# Flush remaining batch
if [ "${#batch[@]}" -gt 0 ]; then
    if [ "$DRY_RUN" != "true" ]; then
        cli_cmd DEL "${batch[@]}" > /dev/null
    fi
    deleted=$((deleted + ${#batch[@]}))
fi

log "Bulk delete complete: $deleted keys $([ "$DRY_RUN" = "true" ] && echo "(dry run)" || echo "deleted")"
```

## Python Script with Unlink (Non-Blocking Delete)

`UNLINK` is the async version of `DEL` - it removes the key immediately but frees memory in the background:

```python
#!/usr/bin/env python3
import redis
import os
import time

r = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    password=os.getenv("REDIS_PASSWORD"),
    decode_responses=True,
)

def bulk_delete(pattern: str, dry_run: bool = True,
                use_unlink: bool = True) -> int:
    deleted = 0
    cursor = 0
    start = time.time()

    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=1000)
        if keys:
            if not dry_run:
                if use_unlink:
                    r.unlink(*keys)  # async, non-blocking
                else:
                    r.delete(*keys)  # synchronous
            deleted += len(keys)
            if deleted % 10000 == 0:
                elapsed = time.time() - start
                rate = deleted / elapsed
                print(f"Deleted {deleted} keys ({rate:.0f}/s)...")

        if cursor == 0:
            break

    return deleted

if __name__ == "__main__":
    import sys
    pattern = sys.argv[1] if len(sys.argv) > 1 else "*"
    dry = os.getenv("DRY_RUN", "true").lower() == "true"
    count = bulk_delete(pattern, dry_run=dry)
    print(f"{'Would delete' if dry else 'Deleted'} {count} keys matching '{pattern}'")
```

## Estimating Deletion Time Before Running

Preview the count without deleting:

```bash
# Count matching keys quickly
redis-cli --scan --pattern "session:*" | wc -l

# Or time a partial scan to estimate the full duration
time redis-cli --scan --pattern "session:*" | head -10000 | wc -l
```

## Summary

Safe Redis bulk deletion uses SCAN for non-blocking iteration and pipeline DEL for batched removal. UNLINK provides async memory freeing for very large values without blocking Redis during cleanup. Dry-run mode is essential before committing to a large delete - always preview the count and a sample of affected keys first.
