# How to Script Redis Operations with redis-cli and Bash

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bash, CLI, Automation, Script

Description: Learn how to automate Redis operations using redis-cli in Bash scripts, including reading output, looping over keys, and running conditional logic.

---

`redis-cli` is highly scriptable. Combined with Bash, you can automate backups, key migrations, cache warming, health checks, and bulk operations without a full programming language runtime.

## Basic Command Execution

```bash
# Run a single command and capture the output
VALUE=$(redis-cli GET mykey)
echo "Value: $VALUE"

# Check if a key exists
EXISTS=$(redis-cli EXISTS user:123)
if [ "$EXISTS" -eq 1 ]; then
  echo "Key exists"
fi
```

## Authentication and Connection Options

Set credentials in a variable or use a config file:

```bash
REDIS="redis-cli -h redis.example.com -p 6379 -a $REDIS_PASSWORD"
$REDIS PING
$REDIS GET mykey
```

Or use a Redis URL:

```bash
redis-cli -u "redis://:$REDIS_PASSWORD@redis.example.com:6379"
```

## Iterating Over Keys Safely with SCAN

Never use `KEYS *` in production. Use `SCAN` via a loop:

```bash
#!/bin/bash
CURSOR=0

while true; do
  RESULT=$(redis-cli SCAN $CURSOR MATCH "session:*" COUNT 100)
  CURSOR=$(echo "$RESULT" | head -1)
  KEYS=$(echo "$RESULT" | tail -n +2)

  for key in $KEYS; do
    TTL=$(redis-cli TTL "$key")
    echo "Key: $key, TTL: $TTL"
  done

  if [ "$CURSOR" -eq 0 ]; then
    break
  fi
done
```

## Bulk Delete by Pattern

```bash
#!/bin/bash
redis-cli --scan --pattern "temp:*" | \
  xargs -I {} redis-cli DEL {}
```

For large-scale deletion, use pipe mode:

```bash
redis-cli --scan --pattern "temp:*" | \
  awk '{print "DEL " $1}' | \
  redis-cli --pipe
```

## Health Check Script

```bash
#!/bin/bash
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

PING=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT PING 2>&1)
if [ "$PING" != "PONG" ]; then
  echo "ERROR: Redis is not responding"
  exit 1
fi

MEM=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
KEYS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT DBSIZE)

echo "Redis OK | memory=$MEM keys=$KEYS"
```

## Setting Keys from a File

Load a CSV of key-value pairs into Redis:

```bash
#!/bin/bash
# data.csv format: key,value
while IFS=',' read -r key value; do
  redis-cli SET "$key" "$value"
done < data.csv
```

For bulk import, use pipe mode:

```bash
while IFS=',' read -r key value; do
  echo "SET $key $value"
done < data.csv | redis-cli --pipe
```

## Conditional Logic Based on Redis State

```bash
#!/bin/bash
QUEUE_LEN=$(redis-cli LLEN job:queue)

if [ "$QUEUE_LEN" -gt 10000 ]; then
  echo "WARNING: job queue has $QUEUE_LEN items" | mail -s "Redis Alert" ops@example.com
fi
```

## Scripting with Eval (Lua)

Run Lua scripts for atomic multi-step operations:

```bash
redis-cli EVAL "
  local val = redis.call('GET', KEYS[1])
  if val then
    return redis.call('INCR', KEYS[1])
  else
    return redis.call('SET', KEYS[1], 1)
  end
" 1 counter:visits
```

## Summary

Bash and redis-cli pair well for automation tasks like health checks, bulk operations, key migrations, and scheduled cleanup. Use `SCAN` instead of `KEYS`, leverage pipe mode for bulk writes, and store credentials in environment variables to keep scripts portable and production-safe.
