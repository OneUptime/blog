# Redis Runbook: Performing Emergency Key Deletion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Key, Runbook

Description: Step-by-step runbook for safely deleting large numbers of Redis keys in an emergency without blocking the server or disrupting production traffic.

---

Bulk key deletion in Redis can block the server if done carelessly. This runbook explains how to safely delete thousands of keys in production using non-blocking approaches.

## Step 1: Identify Keys to Delete

Use SCAN to find keys matching a pattern without blocking:

```bash
redis-cli --scan --pattern "cache:old:*" | head -20
```

Count how many keys match:

```bash
redis-cli --scan --pattern "cache:old:*" | wc -l
```

Never use KEYS in production as it blocks the entire server:

```bash
# DO NOT use in production
# redis-cli KEYS "cache:old:*"
```

## Step 2: Use UNLINK for Large Keys

UNLINK is the async version of DEL. It deletes the key immediately but frees memory in the background:

```bash
redis-cli UNLINK large-hash-key
redis-cli UNLINK large-list-key
```

This avoids blocking Redis while freeing large data structures.

## Step 3: Batch Delete with SCAN and UNLINK

Delete in batches of 100 to avoid overwhelming the server:

```bash
redis-cli --scan --pattern "cache:old:*" --count 100 | xargs -L 100 redis-cli UNLINK
```

Add a small sleep between each key deletion if needed:

```bash
redis-cli --scan --pattern "cache:old:*" | while IFS= read -r key; do
  redis-cli UNLINK "$key"
  sleep 0.001
done
```

## Step 4: Use a Lua Script for Batched Deletion

For more control, use a Lua script that deletes one batch per invocation. Avoid looping SCAN to completion inside a single Lua script, as Lua scripts block Redis for their entire execution and a full-keyspace scan would stall the server:

```lua
local result = redis.call("SCAN", ARGV[1], "MATCH", ARGV[2], "COUNT", 100)
local keys = result[2]
for _, key in ipairs(keys) do
  redis.call("UNLINK", key)
end
return result[1]
```

Call it in a loop from the shell, passing the cursor between invocations:

```bash
cursor="0"
while true; do
  cursor=$(redis-cli EVAL "$(cat cleanup.lua)" 0 "$cursor" "cache:old:*")
  if [ "$cursor" = "0" ]; then
    break
  fi
  sleep 0.01
done
```

## Step 5: Monitor Impact During Deletion

Watch latency while deleting:

```bash
redis-cli --latency -h localhost -p 6379
```

Monitor memory freeing:

```bash
watch -n 2 "redis-cli INFO memory | grep used_memory_human"
```

## Step 6: Verify Deletion

After cleanup, confirm the keys are gone:

```bash
redis-cli --scan --pattern "cache:old:*" | wc -l
```

Check memory after cleanup:

```bash
redis-cli INFO memory | grep used_memory_human
```

## Summary

Emergency key deletion in Redis must use SCAN (never KEYS) and UNLINK (never DEL for large keys) to avoid blocking production traffic. Deleting in small batches with pacing ensures the server remains responsive while memory is reclaimed progressively.
