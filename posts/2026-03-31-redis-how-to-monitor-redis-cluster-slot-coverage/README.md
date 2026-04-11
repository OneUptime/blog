# How to Monitor Redis Cluster Slot Coverage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Monitoring, Slot Coverage, High Availability

Description: Learn how to monitor Redis cluster slot coverage to detect missing slots, unbalanced distributions, and prevent CLUSTERDOWN errors in production.

---

## What Is Redis Cluster Slot Coverage?

Redis Cluster divides the keyspace into 16,384 hash slots distributed across nodes. Every slot must be assigned to a live primary node. If any slot is uncovered (no live primary owns it), the cluster enters a CLUSTERDOWN state and rejects all commands (both reads and writes) by default.

Monitoring slot coverage is essential to:
- Detect partial cluster failures
- Identify unbalanced shard distributions
- Prevent CLUSTERDOWN from impacting production

## Checking Slot Coverage with CLUSTER INFO

```bash
redis-cli -c CLUSTER INFO
```

Key fields:

```text
cluster_enabled:1
cluster_state:ok
cluster_slots_assigned:16384
cluster_slots_ok:16384
cluster_slots_pfail:0
cluster_slots_fail:0
cluster_known_nodes:6
cluster_size:3
```

If `cluster_state` is not `ok`, the cluster has a problem.

## Inspecting Slot Assignments

```bash
redis-cli -c CLUSTER SLOTS
```

This returns a list of slot ranges with their owning nodes:

```text
1) 1) (integer) 0
   2) (integer) 5460
   3) 1) "10.0.0.1"
      2) (integer) 6379
      3) "node-id-1"
2) 1) (integer) 5461
   2) (integer) 10922
   3) 1) "10.0.0.2"
      2) (integer) 6379
      3) "node-id-2"
3) 1) (integer) 10923
   2) (integer) 16383
   3) 1) "10.0.0.3"
      2) (integer) 6379
      3) "node-id-3"
```

## Checking All Node Statuses

```bash
redis-cli -c CLUSTER NODES
```

Output format: `<id> <ip:port@bus-port> <flags> <master> <ping-sent> <pong-recv> <config-epoch> <link-state> <slot-ranges>`

```text
abc123 10.0.0.1:6379@16379 master - 0 1711900000 1 connected 0-5460
def456 10.0.0.2:6379@16379 master - 0 1711900010 2 connected 5461-10922
ghi789 10.0.0.3:6379@16379 master - 0 1711900020 3 connected 10923-16383
```

## Monitoring with Python

```python
import redis
from redis.cluster import RedisCluster, ClusterNode

def check_cluster_slot_coverage(startup_nodes):
    rc = RedisCluster(startup_nodes=startup_nodes, decode_responses=True)

    cluster_info = rc.cluster_info()
    state = cluster_info.get('cluster_state', 'unknown')
    slots_assigned = int(cluster_info.get('cluster_slots_assigned', 0))
    slots_ok = int(cluster_info.get('cluster_slots_ok', 0))
    slots_fail = int(cluster_info.get('cluster_slots_fail', 0))
    slots_pfail = int(cluster_info.get('cluster_slots_pfail', 0))

    print(f"Cluster state: {state}")
    print(f"Slots assigned: {slots_assigned}/16384")
    print(f"Slots OK: {slots_ok}")
    print(f"Slots FAIL: {slots_fail}")
    print(f"Slots PFAIL: {slots_pfail}")

    if state != 'ok':
        print("ALERT: Cluster is not in OK state!")
    if slots_assigned < 16384:
        missing = 16384 - slots_assigned
        print(f"ALERT: {missing} slots are unassigned!")
    if slots_fail > 0:
        print(f"ALERT: {slots_fail} slots are in FAIL state!")
    if slots_pfail > 0:
        print(f"WARNING: {slots_pfail} slots are in PFAIL state!")

    # Check for slot balance
    nodes = rc.cluster_nodes()
    slot_counts = {}
    for node_id, node_info in nodes.items():
        if 'master' in node_info.get('flags', ''):
            slots = node_info.get('slots', [])
            total_slots = sum(end - start + 1 for start, end in slots)
            slot_counts[node_id] = total_slots

    print("\nSlot distribution:")
    for node, count in slot_counts.items():
        print(f"  Node {node[:8]}...: {count} slots")

    if slot_counts:
        min_slots = min(slot_counts.values())
        max_slots = max(slot_counts.values())
        imbalance = max_slots - min_slots
        if imbalance > 500:
            print(f"WARNING: Slot imbalance of {imbalance} slots detected")

startup_nodes = [
    ClusterNode("10.0.0.1", 6379),
    ClusterNode("10.0.0.2", 6379),
]
check_cluster_slot_coverage(startup_nodes)
```

## Fixing Uncovered Slots

If a slot is uncovered due to a failed node, you can manually reassign it:

```bash
# Connect to a cluster node
redis-cli -c -h 10.0.0.1 -p 6379

# Assign slot to a node
CLUSTER ADDSLOTS 5000

# Or fix via cluster repair tool
redis-cli --cluster fix 10.0.0.1:6379
```

To rebalance slots across nodes:

```bash
redis-cli --cluster rebalance 10.0.0.1:6379 --use-empty-masters
```

## Setting Up Continuous Monitoring

Add a scheduled check in your monitoring pipeline:

```bash
#!/bin/bash
REDIS_HOST="10.0.0.1"
REDIS_PORT="6379"

CLUSTER_STATE=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT CLUSTER INFO | grep cluster_state | cut -d: -f2 | tr -d '[:space:]')
SLOTS_FAIL=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT CLUSTER INFO | grep cluster_slots_fail | cut -d: -f2 | tr -d '[:space:]')

if [ "$CLUSTER_STATE" != "ok" ]; then
  echo "CRITICAL: Redis cluster state is $CLUSTER_STATE"
  exit 2
fi

if [ "$SLOTS_FAIL" -gt "0" ]; then
  echo "CRITICAL: $SLOTS_FAIL slots in FAIL state"
  exit 2
fi

echo "OK: Redis cluster state is ok, all slots covered"
exit 0
```

## Summary

Redis cluster slot coverage monitoring relies on the `CLUSTER INFO` command to track `cluster_state`, `cluster_slots_assigned`, and `cluster_slots_fail`. Automated checks that alert on any uncovered or failed slots give you early warning before the cluster enters a CLUSTERDOWN state. Combined with slot balance checks, this monitoring approach ensures your Redis cluster remains stable and evenly distributed.
