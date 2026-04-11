# How to Write a Redis Health Check Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Script, Health Check, Monitoring, Bash

Description: Write a comprehensive Redis health check script in Bash and Python that checks connectivity, memory, replication, and key metrics for production monitoring.

---

A Redis health check script does more than ping. It validates that Redis is accepting connections, memory usage is within bounds, replication is working, and the instance is not in a degraded state. This script can run as a Kubernetes liveness probe, a cron job, or a monitoring agent check.

## Basic Bash Health Check

A simple script for use as a container health check or liveness probe:

```bash
#!/bin/bash
# redis-health.sh

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
MAX_MEMORY_PCT=80

cli_cmd() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning "$@"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" "$@"
    fi
}

# 1. Connectivity check
PING=$(cli_cmd PING 2>&1)
if [ "$PING" != "PONG" ]; then
    echo "CRITICAL: Redis not responding to PING (got: $PING)"
    exit 2
fi
echo "OK: Redis responding to PING"

# 2. Memory check
USED_MEM=$(cli_cmd INFO memory | grep "^used_memory:" | cut -d: -f2 | tr -d '\r')
MAX_MEM=$(cli_cmd INFO memory | grep "^maxmemory:" | cut -d: -f2 | tr -d '\r')
if [ "$MAX_MEM" -gt 0 ]; then
    MEM_PCT=$(( USED_MEM * 100 / MAX_MEM ))
    if [ "$MEM_PCT" -gt "$MAX_MEMORY_PCT" ]; then
        echo "WARNING: Memory usage ${MEM_PCT}% exceeds threshold ${MAX_MEMORY_PCT}%"
        exit 1
    fi
    echo "OK: Memory usage ${MEM_PCT}%"
fi

# 3. Replication check
ROLE=$(cli_cmd INFO replication | grep "^role:" | cut -d: -f2 | tr -d '\r')
echo "OK: Role is ${ROLE}"
if [ "$ROLE" = "master" ]; then
    CONNECTED=$(cli_cmd INFO replication | grep "connected_slaves:" | cut -d: -f2 | tr -d '\r')
    echo "INFO: Connected replicas: ${CONNECTED}"
fi

echo "OVERALL: Redis is healthy"
exit 0
```

## Python Health Check with Alerting

A more detailed Python script for monitoring pipelines:

```python
#!/usr/bin/env python3
import redis
import sys
import os

def check_redis_health() -> dict:
    r = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        password=os.getenv("REDIS_PASSWORD"),
        socket_connect_timeout=5,
        socket_timeout=5,
    )

    results = {"status": "ok", "checks": {}}

    # Ping
    try:
        r.ping()
        results["checks"]["ping"] = "ok"
    except Exception as e:
        results["status"] = "critical"
        results["checks"]["ping"] = f"FAILED: {e}"
        return results

    info = r.info()

    # Memory
    used = info.get("used_memory", 0)
    maxmem = info.get("maxmemory", 0)
    if maxmem > 0:
        pct = (used / maxmem) * 100
        results["checks"]["memory_pct"] = round(pct, 1)
        if pct > 90:
            results["status"] = "critical"
        elif pct > 80:
            results["status"] = "warning"

    # Replication
    results["checks"]["role"] = info.get("role")
    results["checks"]["connected_slaves"] = info.get("connected_slaves", 0)

    # Slow operations
    results["checks"]["blocked_clients"] = info.get("blocked_clients", 0)
    results["checks"]["rejected_connections"] = info.get("rejected_connections", 0)

    return results

if __name__ == "__main__":
    result = check_redis_health()
    import json
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["status"] == "ok" else 1)
```

## Cron Schedule

```bash
# Run health check every minute, log to file
* * * * * /opt/scripts/redis-health.sh >> /var/log/redis-health.log 2>&1
```

## Summary

A production Redis health check validates connectivity, memory usage, replication status, and blocked client counts. The Bash version suits container health probes and simple cron checks, while the Python version produces structured JSON output for integration with monitoring pipelines. Both exit with non-zero codes on degraded states so alerting systems can react automatically.
