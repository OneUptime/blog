# How to Write a Redis Replication Monitoring Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Monitoring, Script, Bash

Description: Monitor Redis replication lag, replica count, and sync status with a script that alerts when replicas fall behind or disconnect.

---

Redis replication is asynchronous, which means replicas can lag behind the primary. A replication monitoring script tracks replication lag in bytes and seconds, alerts when replicas disconnect, and validates that the expected number of replicas are connected and in sync.

## Replication Monitoring Script

```bash
#!/bin/bash
# redis-replication-monitor.sh

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
EXPECTED_REPLICAS="${EXPECTED_REPLICAS:-1}"
MAX_LAG_BYTES="${MAX_LAG_BYTES:-1048576}"  # 1MB
MAX_LAG_SECONDS="${MAX_LAG_SECONDS:-10}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

cli_cmd() {
    local args=("-h" "$REDIS_HOST" "-p" "$REDIS_PORT" "--no-auth-warning")
    [ -n "$REDIS_PASSWORD" ] && args+=("-a" "$REDIS_PASSWORD")
    redis-cli "${args[@]}" "$@"
}

log() { echo "[$(date '+%H:%M:%S')] $*"; }
alert() { log "ALERT: $1"; }

REPL_INFO=$(cli_cmd INFO replication)
ROLE=$(echo "$REPL_INFO" | grep "^role:" | cut -d: -f2 | tr -d '\r ')
log "Role: $ROLE"

if [ "$ROLE" = "master" ]; then
    CONNECTED=$(echo "$REPL_INFO" | grep "^connected_slaves:" | cut -d: -f2 | tr -d '\r ')
    log "Connected replicas: $CONNECTED / expected $EXPECTED_REPLICAS"

    if [ "$CONNECTED" -lt "$EXPECTED_REPLICAS" ]; then
        alert "Only $CONNECTED replicas connected (expected $EXPECTED_REPLICAS)"
    fi

    # Check each replica's lag
    for i in $(seq 0 $((CONNECTED - 1))); do
        SLAVE_INFO=$(echo "$REPL_INFO" | grep "^slave${i}:")
        LAG=$(echo "$SLAVE_INFO" | grep -oP "lag=\K[0-9]+")
        OFFSET=$(echo "$SLAVE_INFO" | grep -oP "offset=\K[0-9]+")
        STATE=$(echo "$SLAVE_INFO" | grep -oP "state=\K\w+")
        ADDR=$(echo "$SLAVE_INFO" | grep -oP "ip=\K[^,]+")

        log "Replica $i ($ADDR): state=$STATE lag=${LAG}s offset=$OFFSET"

        if [ "$STATE" != "online" ]; then
            alert "Replica $i ($ADDR) is in state '$STATE'"
        fi

        if [ -n "$LAG" ] && [ "$LAG" -gt "$MAX_LAG_SECONDS" ]; then
            alert "Replica $i ($ADDR) lag ${LAG}s exceeds threshold ${MAX_LAG_SECONDS}s"
        fi
    done

    # Replication offset delta check
    MASTER_OFFSET=$(echo "$REPL_INFO" | grep "^master_repl_offset:" | cut -d: -f2 | tr -d '\r ')
    log "Master replication offset: $MASTER_OFFSET"

elif [ "$ROLE" = "slave" ]; then
    MASTER_HOST=$(echo "$REPL_INFO" | grep "^master_host:" | cut -d: -f2 | tr -d '\r ')
    MASTER_PORT=$(echo "$REPL_INFO" | grep "^master_port:" | cut -d: -f2 | tr -d '\r ')
    LINK_STATUS=$(echo "$REPL_INFO" | grep "^master_link_status:" | cut -d: -f2 | tr -d '\r ')
    MASTER_OFFSET=$(echo "$REPL_INFO" | grep "^master_repl_offset:" | cut -d: -f2 | tr -d '\r ')
    REPLICA_OFFSET=$(echo "$REPL_INFO" | grep "^slave_repl_offset:" | cut -d: -f2 | tr -d '\r ' 2>/dev/null || echo "$MASTER_OFFSET")

    log "Master: ${MASTER_HOST}:${MASTER_PORT} link=$LINK_STATUS"

    if [ "$LINK_STATUS" != "up" ]; then
        alert "Replication link to master is $LINK_STATUS"
    fi

    LAG_BYTES=$((MASTER_OFFSET - REPLICA_OFFSET))
    log "Replication lag: ${LAG_BYTES} bytes behind master"

    if [ "$LAG_BYTES" -gt "$MAX_LAG_BYTES" ]; then
        alert "Replication lag ${LAG_BYTES} bytes exceeds threshold ${MAX_LAG_BYTES}"
    fi
fi

log "Replication check complete"
```

## Cron Schedule

```bash
# Check every minute
* * * * * /opt/scripts/redis-replication-monitor.sh >> /var/log/redis-replication.log 2>&1
```

## Checking Replication Offset Drift

For more precise lag measurement, compare offsets between primary and replica directly:

```bash
MASTER_OFFSET=$(redis-cli -h master-host info replication | grep master_repl_offset | cut -d: -f2 | tr -d '\r ')
REPLICA_OFFSET=$(redis-cli -h replica-host info replication | grep slave_repl_offset | cut -d: -f2 | tr -d '\r ')
echo "Drift: $((MASTER_OFFSET - REPLICA_OFFSET)) bytes"
```

## Summary

The Redis replication monitoring script validates replica count, connection state, and lag in both seconds and bytes. Running on the primary, it inspects each connected replica from the `INFO replication` output. Running on a replica, it checks master link status and offset drift. Scheduled via cron, it provides continuous replication health visibility with alerting on degradation.
