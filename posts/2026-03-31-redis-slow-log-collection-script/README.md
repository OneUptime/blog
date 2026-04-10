# How to Write a Redis Slow Log Collection Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Slow Log, Script, Performance, Monitoring

Description: Collect and forward Redis slow log entries on a schedule to identify expensive commands and optimize query performance.

---

Redis records commands that exceed a configurable execution threshold in its slow log. Unlike a passive log file, the slow log must be actively polled - it is stored in memory and cycles old entries. A collection script reads new entries, enriches them, and ships them to your monitoring backend.

## Configuring the Slow Log

Enable and size the slow log in `redis.conf` or at runtime:

```bash
# Log commands taking longer than 10ms (10000 microseconds)
redis-cli CONFIG SET slowlog-log-slower-than 10000

# Keep last 1000 entries in memory
redis-cli CONFIG SET slowlog-max-len 1000

# Check current settings
redis-cli CONFIG GET slowlog-log-slower-than
redis-cli CONFIG GET slowlog-max-len
```

## Bash Collection Script

Read new slow log entries since the last collection run:

```bash
#!/bin/bash
# redis-slowlog-collect.sh

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
LAST_ID_FILE="/tmp/redis_slowlog_last_id"
OUTPUT_FILE="${OUTPUT_FILE:-/var/log/redis-slowlog.jsonl}"

cli_cmd() {
    local args=("-h" "$REDIS_HOST" "-p" "$REDIS_PORT" "--no-auth-warning")
    [ -n "$REDIS_PASSWORD" ] && args+=("-a" "$REDIS_PASSWORD")
    redis-cli "${args[@]}" "$@"
}

# Get last processed ID
LAST_ID=0
[ -f "$LAST_ID_FILE" ] && LAST_ID=$(cat "$LAST_ID_FILE")

# Get total slow log length
TOTAL=$(cli_cmd SLOWLOG LEN)
echo "Slow log entries: $TOTAL (last_id=$LAST_ID)"

# Get all entries and filter by ID
ENTRIES=$(cli_cmd SLOWLOG GET 128)
if [ -z "$ENTRIES" ]; then
    echo "No slow log entries"
    exit 0
fi

# Parse and save entries (redis-cli outputs structured text)
cli_cmd SLOWLOG GET 128 | while read -r line; do
    echo "$line" >> "$OUTPUT_FILE"
done

# Update last ID tracker (first entry is newest)
NEWEST_ID=$(cli_cmd SLOWLOG GET 1 | head -2 | tail -1 | tr -d ' ')
[ -n "$NEWEST_ID" ] && echo "$NEWEST_ID" > "$LAST_ID_FILE"

echo "Collected slow log entries"
```

## Python Collection with JSON Output

A more structured collector that outputs JSON lines for log aggregators:

```python
#!/usr/bin/env python3
import redis
import json
import time
import os

r = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    password=os.getenv("REDIS_PASSWORD"),
    decode_responses=True,
    socket_timeout=5,
)

LAST_ID_FILE = "/tmp/redis_slowlog_last_id"

def get_last_id() -> int:
    try:
        return int(open(LAST_ID_FILE).read().strip())
    except Exception:
        return -1

def save_last_id(entry_id: int):
    open(LAST_ID_FILE, "w").write(str(entry_id))

def collect_slow_log(count: int = 128) -> list:
    last_id = get_last_id()
    entries = r.slowlog_get(count)
    new_entries = [e for e in entries if e["id"] > last_id]

    if new_entries:
        save_last_id(new_entries[0]["id"])  # highest ID is first

    return new_entries

def format_entry(entry: dict) -> dict:
    command = entry.get("command", "")
    parts = command.split() if command else []
    return {
        "id": entry["id"],
        "timestamp": entry["start_time"],
        "duration_us": entry["duration"],
        "duration_ms": entry["duration"] / 1000,
        "command": parts[0] if parts else "UNKNOWN",
        "args_preview": " ".join(parts[:4]),
        "client_addr": entry.get("client_address", ""),
        "client_name": entry.get("client_name", ""),
    }

if __name__ == "__main__":
    entries = collect_slow_log()
    print(f"Collected {len(entries)} new slow log entries")

    output_file = os.getenv("OUTPUT_FILE", "/var/log/redis-slowlog.jsonl")
    with open(output_file, "a") as f:
        for entry in entries:
            f.write(json.dumps(format_entry(entry)) + "\n")

    if entries:
        slowest = max(entries, key=lambda e: e["duration"])
        cmd_preview = " ".join(slowest.get("command", "").split()[:2])
        print(f"Slowest command: {cmd_preview} "
              f"({slowest['duration'] / 1000:.1f}ms)")
```

## Cron Schedule

```bash
# Collect every minute
* * * * * /opt/scripts/redis-slowlog-collect.sh >> /dev/null 2>&1
# Or the Python version
* * * * * /usr/bin/python3 /opt/scripts/redis_slowlog_collect.py
```

## Summary

Redis slow log collection requires active polling since entries live in a ring buffer in memory. The Python script tracks the last-seen entry ID to avoid duplicates, formats entries as JSON lines, and identifies the slowest command in each collection run. Shipping slow log entries to a central log aggregator over time reveals patterns - commands that need indexes, oversized key scans, or pipeline opportunities.
