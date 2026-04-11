# How to Write a Redis Cluster Status Check Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Script, Monitoring, Bash

Description: Write a Redis Cluster status check script that validates cluster health, slot coverage, node states, and failover readiness.

---

Redis Cluster distributes data across nodes and automatically handles failover, but you need visibility into cluster health to catch partial failures before they become outages. A cluster status check script examines node states, slot coverage, and fail flags across all nodes.

## Bash Cluster Status Script

```bash
#!/bin/bash
# redis-cluster-check.sh

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

cli_cmd() {
    local cmd_args=("-h" "$REDIS_HOST" "-p" "$REDIS_PORT" "--no-auth-warning")
    [ -n "$REDIS_PASSWORD" ] && cmd_args+=("-a" "$REDIS_PASSWORD")
    redis-cli "${cmd_args[@]}" "$@"
}

log() { echo "[$(date '+%H:%M:%S')] $*"; }

alert() {
    local msg="$1"
    log "ALERT: $msg"
    [ -n "$SLACK_WEBHOOK" ] && curl -s -X POST "$SLACK_WEBHOOK" \
        -H "Content-type: application/json" \
        -d "{\"text\":\"Redis Cluster ALERT: $msg\"}"
}

# 1. Overall cluster state
CLUSTER_INFO=$(cli_cmd CLUSTER INFO)
CLUSTER_STATE=$(echo "$CLUSTER_INFO" | grep "^cluster_state:" | cut -d: -f2 | tr -d '\r ')
CLUSTER_SLOTS_OK=$(echo "$CLUSTER_INFO" | grep "^cluster_slots_ok:" | cut -d: -f2 | tr -d '\r ')
CLUSTER_SLOTS_FAIL=$(echo "$CLUSTER_INFO" | grep "^cluster_slots_fail:" | cut -d: -f2 | tr -d '\r ')
KNOWN_NODES=$(echo "$CLUSTER_INFO" | grep "^cluster_known_nodes:" | cut -d: -f2 | tr -d '\r ')

log "Cluster state: $CLUSTER_STATE"
log "Slots OK: $CLUSTER_SLOTS_OK | Slots FAIL: $CLUSTER_SLOTS_FAIL | Nodes: $KNOWN_NODES"

if [ "$CLUSTER_STATE" != "ok" ]; then
    alert "Cluster state is '$CLUSTER_STATE' (not ok)"
    exit 2
fi

if [ "$CLUSTER_SLOTS_FAIL" -gt 0 ]; then
    alert "$CLUSTER_SLOTS_FAIL slots are in FAIL state"
    exit 2
fi

# 2. Node states
CLUSTER_NODES=$(cli_cmd CLUSTER NODES)
FAILED_NODES=$(echo "$CLUSTER_NODES" | grep "fail" | grep -v "slave")
if [ -n "$FAILED_NODES" ]; then
    alert "Failed master nodes detected:\n$FAILED_NODES"
    exit 2
fi

MASTER_COUNT=$(echo "$CLUSTER_NODES" | grep "master" | grep -v "fail" | wc -l)
REPLICA_COUNT=$(echo "$CLUSTER_NODES" | grep "slave" | grep -v "fail" | wc -l)
log "Masters: $MASTER_COUNT | Replicas: $REPLICA_COUNT"

# 3. Slot coverage check
if [ "$CLUSTER_SLOTS_OK" -ne 16384 ]; then
    alert "Slot coverage incomplete: $CLUSTER_SLOTS_OK/16384 slots assigned"
    exit 2
fi

log "OK: All 16384 slots covered"
log "OVERALL: Cluster is healthy"
exit 0
```

## Python Script with Per-Node Metrics

```python
#!/usr/bin/env python3
import redis
import os

def check_cluster(host: str, port: int, password: str = None) -> dict:
    r = redis.Redis(host=host, port=port, password=password,
                    decode_responses=True, socket_timeout=5)

    info = r.execute_command("CLUSTER", "INFO")
    nodes_raw = r.execute_command("CLUSTER", "NODES")

    results = {
        "cluster_state": None,
        "slots_ok": 0,
        "slots_fail": 0,
        "nodes": [],
    }

    for line in info.split("\r\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            if k == "cluster_state":
                results["cluster_state"] = v
            elif k == "cluster_slots_ok":
                results["slots_ok"] = int(v)
            elif k == "cluster_slots_fail":
                results["slots_fail"] = int(v)

    for line in nodes_raw.strip().split("\n"):
        parts = line.split()
        if len(parts) >= 3:
            results["nodes"].append({
                "id": parts[0][:8],
                "addr": parts[1],
                "flags": parts[2],
                "role": "master" if "master" in parts[2] else "slave",
                "failed": "fail" in parts[2] and "fail?" not in parts[2],
            })

    return results

if __name__ == "__main__":
    import json
    result = check_cluster(
        os.getenv("REDIS_HOST", "localhost"),
        int(os.getenv("REDIS_PORT", 6379)),
        os.getenv("REDIS_PASSWORD"),
    )
    print(json.dumps(result, indent=2))
    failed_nodes = [n for n in result["nodes"] if n["failed"]]
    if result["cluster_state"] != "ok" or result["slots_fail"] > 0 or failed_nodes:
        exit(1)
```

## Summary

The Redis Cluster status script checks overall cluster state, slot coverage across all 16384 hash slots, and per-node fail flags in a single pass. Bash output suits cron-based monitoring, while the Python version produces structured JSON for integration with monitoring platforms. Alerts fire on cluster state degradation, slot gaps, or master node failures.
