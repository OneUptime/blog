# How to Script Redis Administration Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Automation, Shell

Description: Learn how to automate Redis administration tasks using shell scripts, covering backups, health checks, key expiry, and performance monitoring.

---

Automating Redis administration reduces manual errors and ensures consistency across environments. This guide covers practical shell scripting patterns for common Redis operational tasks.

## Connecting in Scripts

Use `redis-cli` with flags for non-interactive use:

```bash
# Basic connection
redis-cli -h 127.0.0.1 -p 6379 -a "$REDIS_PASSWORD" PING

# Using environment variables
REDIS_CLI="redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379}"
[ -n "$REDIS_PASSWORD" ] && REDIS_CLI="$REDIS_CLI -a $REDIS_PASSWORD"

$REDIS_CLI PING
```

## Health Check Script

```bash
#!/bin/bash
REDIS_HOST="${1:-localhost}"
REDIS_PORT="${2:-6379}"

check_redis() {
  local result
  result=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING 2>&1)
  if [ "$result" = "PONG" ]; then
    echo "OK: Redis is responding"
    return 0
  else
    echo "FAIL: Redis not responding - $result"
    return 1
  fi
}

check_memory() {
  local used max
  used=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO memory | grep "^used_memory:" | cut -d: -f2 | tr -d '\r')
  max=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" CONFIG GET maxmemory | tail -1)
  echo "Memory used: $((used / 1024 / 1024))MB, max: $((max / 1024 / 1024))MB"
}

check_redis && check_memory
```

## Automated Backup Script

```bash
#!/bin/bash
BACKUP_DIR="/backups/redis"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Record last save time and trigger background save
BEFORE=$(redis-cli LASTSAVE)
redis-cli BGSAVE
sleep 2

# Wait for save to complete
while [ "$(redis-cli LASTSAVE)" = "$BEFORE" ]; do
  sleep 1
done

# Copy the dump
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/dump-$DATE.rdb"
echo "Backup saved: $BACKUP_DIR/dump-$DATE.rdb"

# Clean old backups
find "$BACKUP_DIR" -name "dump-*.rdb" -mtime +$RETENTION_DAYS -delete
echo "Cleaned backups older than $RETENTION_DAYS days"
```

## Bulk Key Deletion Script

Remove keys matching a pattern safely:

```bash
#!/bin/bash
PATTERN="${1:-temp:*}"
BATCH_SIZE=1000
COUNT=0

while IFS= read -r key; do
  redis-cli DEL "$key" > /dev/null
  COUNT=$((COUNT + 1))
  [ $((COUNT % BATCH_SIZE)) -eq 0 ] && echo "Deleted $COUNT keys..."
done < <(redis-cli --scan --pattern "$PATTERN")

echo "Done. Total deleted: $COUNT keys matching '$PATTERN'"
```

## Keyspace Statistics Script

```bash
#!/bin/bash
echo "=== Redis Keyspace Stats ==="
redis-cli INFO keyspace

echo ""
echo "=== Top Key Patterns ==="
redis-cli --scan | sed 's/:[^:]*$//' | sort | uniq -c | sort -rn | head -20

echo ""
echo "=== Memory Usage ==="
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"
```

## Monitoring Script with Alerts

```bash
#!/bin/bash
THRESHOLD_MEMORY_PCT=80
THRESHOLD_CONN=1000

memory_pct() {
  local used max
  used=$(redis-cli INFO memory | grep "^used_memory:" | cut -d: -f2 | tr -d '\r ')
  max=$(redis-cli CONFIG GET maxmemory | tail -1 | tr -d '\r ')
  [ "$max" -eq 0 ] && echo 0 && return
  echo $(( (used * 100) / max ))
}

connected_clients() {
  redis-cli INFO clients | grep "^connected_clients:" | cut -d: -f2 | tr -d '\r '
}

MEM_PCT=$(memory_pct)
CLIENTS=$(connected_clients)

[ "$MEM_PCT" -gt "$THRESHOLD_MEMORY_PCT" ] && echo "ALERT: Memory at ${MEM_PCT}%"
[ "$CLIENTS" -gt "$THRESHOLD_CONN" ] && echo "ALERT: $CLIENTS connected clients"
```

## Summary

Shell scripting Redis administration involves combining `redis-cli` flags with standard Unix tools. Build scripts for health checks, automated backups, bulk operations, and monitoring to create a reliable operational foundation. Store these scripts in version control and schedule them with cron or your orchestration platform.
