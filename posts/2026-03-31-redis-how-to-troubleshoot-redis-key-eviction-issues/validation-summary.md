# Validation Summary: How to Troubleshoot Redis Key Eviction Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Redis (server, eviction policies, keyspace notifications, LFU configuration)
- redis-cli (command-line interface)
- Python redis-py client library

## Sources Consulted
- Redis source code (`src/notify.c` — `keyspaceEventsStringToFlags` function) for keyspace notification flag definitions
- Redis source code (`src/redis-cli.c` — `statMode` function) for `--stat` output columns
- Redis official documentation on eviction policies (https://redis.io/docs/reference/eviction/)
- Redis official documentation on keyspace notifications (https://redis.io/docs/manual/keyspace-notifications/)
- Redis official documentation on `OBJECT FREQ` command
- Redis official documentation on `CONFIG GET/SET` parameters (`lfu-decay-time`, `lfu-log-factor`, `maxmemory-samples`)

## Issues Found

### Issue 1: Incorrect keyspace notification flag for eviction events (Line 80)
- **What was wrong:** The command `redis-cli CONFIG SET notify-keyspace-events "Eg"` used the `g` flag, which enables generic command notifications (DEL, RENAME, UNLINK, etc.), not eviction events.
- **What was changed:** Changed `"Eg"` to `"Ee"`. The `e` flag (lowercase) specifically enables eviction event notifications, which is required for the `__keyevent@0__:evicted` subscription to receive messages.
- **Why:** Without the `e` flag, subscribing to `__keyevent@0__:evicted` would receive no messages because the eviction event class is not enabled. The `g` flag only covers generic key manipulation commands.

### Issue 2: `redis-cli --stat` does not include eviction data (Lines 39-41)
- **What was wrong:** The command `redis-cli --stat -i 1 | grep evict` would produce no output. The `--stat` mode only outputs: keys, mem, clients, blocked, requests, and connections. It does not include any eviction-related metrics.
- **What was changed:** Replaced with `redis-cli INFO stats | grep evicted_keys`, which correctly retrieves the eviction counter from the INFO stats section.
- **Why:** The original command would silently produce no output, which is misleading in a troubleshooting guide.

## Review Notes
- The eviction policy table is complete and accurate for Redis 4.0+ (all 8 policies listed).
- The LFU defaults (`lfu-decay-time` = 1, `lfu-log-factor` = 10) and `maxmemory-samples` default (5) are correct.
- The Python monitoring script correctly accesses `used_memory` and `maxmemory` fields from `r.info('memory')`.
- The advice about volatile-* policies only evicting keys with TTL set is accurate. Note that if all keys with TTL have been evicted and memory is still full, Redis will return OOM errors rather than evicting keys without TTL (behaving like `noeviction` for remaining keys).
- The `save ""` syntax for disabling RDB snapshots is correct.
- `maxmemory 0` correctly means no memory limit in Redis configuration.
