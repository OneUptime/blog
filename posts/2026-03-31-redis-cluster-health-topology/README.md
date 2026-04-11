# How to Monitor Redis Cluster Health and Topology

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Monitoring, Health, Topology

Description: Learn how to monitor Redis Cluster health, view topology, detect degraded nodes, and automate health checks for production alerting.

---

Redis Cluster health monitoring requires checking more than just whether nodes are up. You need to verify slot coverage, replication state, node roles, and epoch consistency across the cluster.

## Core Cluster Info Commands

```bash
# Overall cluster status
redis-cli -p 7001 CLUSTER INFO
```

Key fields to monitor:

```text
cluster_state:ok                  # ok or fail
cluster_slots_assigned:16384      # must be 16384
cluster_slots_ok:16384            # slots with healthy primaries
cluster_slots_pfail:0             # slots on probably-failed nodes
cluster_slots_fail:0              # slots on confirmed-failed nodes
cluster_known_nodes:6             # total nodes in cluster
cluster_size:3                    # number of primary nodes
cluster_current_epoch:6           # increments on each failover
total_cluster_links_buffer_limit_exceeded:0
```

Alert if:
- `cluster_state` is not `ok`
- `cluster_slots_assigned` < 16384
- `cluster_slots_fail` > 0

## Node Topology View

```bash
redis-cli -p 7001 CLUSTER NODES
```

Parse the output to identify node roles:

```bash
# List primaries only
redis-cli -p 7001 CLUSTER NODES | grep master

# List replicas only
redis-cli -p 7001 CLUSTER NODES | grep slave

# Count expected vs actual
MASTER_COUNT=$(redis-cli -p 7001 CLUSTER NODES | grep -c master)
echo "Primary count: $MASTER_COUNT"
```

## Checking Each Node's Replication Status

```bash
#!/bin/bash
PORTS=(7001 7002 7003 7004 7005 7006)

for port in "${PORTS[@]}"; do
  ROLE=$(redis-cli -p $port ROLE 2>/dev/null | head -1)
  echo "Port $port: $ROLE"

  if [ "$ROLE" = "slave" ]; then
    LAG=$(redis-cli -p $port INFO replication | grep master_last_io_seconds_ago | cut -d: -f2 | tr -d '\r')
    echo "  -> Replication lag: ${LAG}s"
  fi
done
```

## Detecting Disconnected Nodes

```bash
# Nodes in PFAIL (fail?) or FAIL state
redis-cli -p 7001 CLUSTER NODES | grep -E "fail\?|fail "
```

Also check via CLUSTER SHARDS (Redis 7.0+):

```bash
redis-cli -p 7001 CLUSTER SHARDS
# Shows each shard (primary + replicas) with health status
```

## Checking Link Status Between Nodes

```bash
# Redis 7.0+
redis-cli -p 7001 CLUSTER LINKS
```

Look for links in `connecting` or `disconnected` state - these indicate network issues between nodes.

## Slot Coverage Verification

```bash
redis-cli --cluster check 127.0.0.1:7001
```

This command checks:
- All 16384 slots are assigned
- No slot is assigned to multiple nodes
- Replica counts per primary

Example output:

```text
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
[OK] No open slots found.
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

## Automated Health Check Script

```bash
#!/bin/bash
HOST="127.0.0.1"
PORT="7001"

STATE=$(redis-cli -h $HOST -p $PORT CLUSTER INFO | grep cluster_state | cut -d: -f2 | tr -d '[:space:]')
SLOTS_FAIL=$(redis-cli -h $HOST -p $PORT CLUSTER INFO | grep cluster_slots_fail | cut -d: -f2 | tr -d '[:space:]')

if [ "$STATE" != "ok" ]; then
  echo "CRITICAL: Cluster state is $STATE"
  exit 2
fi

if [ "$SLOTS_FAIL" != "0" ]; then
  echo "WARNING: $SLOTS_FAIL slots in fail state"
  exit 1
fi

echo "OK: Cluster healthy, state=ok, slots_fail=0"
exit 0
```

## Summary

Monitor Redis Cluster health by checking `CLUSTER INFO` for `cluster_state:ok` and zero `cluster_slots_fail`, verifying node topology with `CLUSTER NODES`, and running `redis-cli --cluster check` to validate slot coverage. Automate these checks with scripts and alert when any degraded state is detected.
