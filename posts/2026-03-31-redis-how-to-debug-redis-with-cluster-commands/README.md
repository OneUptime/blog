# How to Debug Redis with CLUSTER Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Debugging, CLUSTER INFO, Sharding, High Availability

Description: Use Redis CLUSTER commands to inspect cluster health, diagnose node failures, check slot distribution, and troubleshoot replication issues in Redis Cluster deployments.

---

## Redis Cluster Debugging Command Reference

Redis Cluster exposes a rich set of commands for introspection and management. The key debugging commands are:

| Command | Purpose |
|---------|---------|
| `CLUSTER INFO` | Overall cluster status |
| `CLUSTER NODES` | All nodes, their roles, and slot ranges |
| `CLUSTER MYID` | Current node's ID |
| `CLUSTER SLOTS` | Slot-to-node mapping |
| `CLUSTER SHARDS` | Slot ranges with replica details (Redis 7+) |
| `CLUSTER COUNTKEYSINSLOT` | Number of keys in a hash slot |
| `CLUSTER KEYSLOT key` | Which slot a key maps to |
| `CLUSTER FAILOVER` | Manually trigger failover |
| `CLUSTER RESET` | Reset cluster state |

## Checking Overall Cluster Health

```bash
redis-cli -h redis-node-1 -p 6379 CLUSTER INFO
```

Key fields in the output:

```text
cluster_enabled:1
cluster_state:ok          # 'ok' or 'fail'
cluster_slots_assigned:16384
cluster_slots_ok:16384
cluster_slots_pfail:0     # slots in probable failure state
cluster_slots_fail:0      # slots in definite failure state
cluster_known_nodes:6
cluster_size:3            # number of primary nodes
cluster_current_epoch:12
cluster_my_epoch:3
cluster_stats_messages_sent:1234567
cluster_stats_messages_received:1234321
total_cluster_links_buffer_limit_exceeded:0
```

A healthy cluster shows `cluster_state:ok` and `cluster_slots_fail:0`.

```python
import redis

def check_cluster_health(host='localhost', port=6379):
    r = redis.Redis(host=host, port=port, decode_responses=True)
    info = r.cluster_info()

    state = info.get('cluster_state', 'unknown')
    failed_slots = int(info.get('cluster_slots_fail', 0))
    pfail_slots = int(info.get('cluster_slots_pfail', 0))

    if state != 'ok':
        print(f"CRITICAL: Cluster state is '{state}'")
    elif failed_slots > 0:
        print(f"ERROR: {failed_slots} slot(s) in FAIL state")
    elif pfail_slots > 0:
        print(f"WARNING: {pfail_slots} slot(s) in PFAIL state")
    else:
        print("Cluster is healthy")

    return info
```

## Viewing All Nodes

```bash
redis-cli -h redis-node-1 CLUSTER NODES
```

```text
abc123... 10.0.0.1:6379@16379 master - 0 1706000000 1 connected 0-5460
def456... 10.0.0.2:6379@16379 master - 0 1706000001 2 connected 5461-10922
ghi789... 10.0.0.3:6379@16379 master - 0 1706000002 3 connected 10923-16383
jkl012... 10.0.0.4:6379@16379 slave abc123... 0 1706000003 1 connected
mno345... 10.0.0.5:6379@16379 slave def456... 0 1706000004 2 connected
pqr678... 10.0.0.6:6379@16379 slave ghi789... 0 1706000005 3 connected
```

```python
def list_cluster_nodes(host='localhost', port=6379):
    r = redis.Redis(host=host, port=port, decode_responses=True)
    nodes_raw = r.cluster_nodes()

    masters = []
    slaves = []

    for line in nodes_raw.strip().split('\n'):
        parts = line.split(' ')
        node_id = parts[0]
        addr = parts[1].split('@')[0]
        flags = parts[2]
        master_id = parts[3]

        if 'master' in flags:
            slots = parts[8] if len(parts) > 8 else 'no slots'
            masters.append({'id': node_id[:8], 'addr': addr, 'slots': slots})
        elif 'slave' in flags:
            slaves.append({'id': node_id[:8], 'addr': addr, 'master': master_id[:8]})

    print(f"\nMasters ({len(masters)}):")
    for m in masters:
        print(f"  {m['id']} {m['addr']} slots:{m['slots']}")

    print(f"\nReplicas ({len(slaves)}):")
    for s in slaves:
        print(f"  {s['id']} {s['addr']} -> master:{s['master']}")
```

## Checking Key Distribution and Slot Assignments

```bash
# Which slot does a key map to?
redis-cli CLUSTER KEYSLOT mykey
# Returns: 14687

# How many keys are in that slot?
redis-cli -h redis-node-3 CLUSTER COUNTKEYSINSLOT 14687
```

```python
def find_key_location(key: str, startup_nodes: list):
    from redis.cluster import RedisCluster

    rc = RedisCluster(startup_nodes=startup_nodes, decode_responses=True)

    # Find which slot the key belongs to
    slot = rc.cluster_keyslot(key)
    print(f"Key '{key}' maps to slot {slot}")

    # Count keys in that slot on the owning node
    count = rc.cluster_countkeysinslot(slot)
    print(f"Slot {slot} contains {count} key(s)")
```

## Diagnosing a Failed Node

```bash
# Check node states - look for 'fail' flag
redis-cli CLUSTER NODES | grep fail

# Check replication offset lag between primary and replica
redis-cli -h replica-node CLUSTER INFO | grep cluster_current_epoch
redis-cli -h primary-node INFO replication | grep master_repl_offset
```

## Triggering Manual Failover

```bash
# Connect to the replica you want to promote
redis-cli -h replica-to-promote CLUSTER FAILOVER

# Force failover even if primary is unreachable
redis-cli -h replica-to-promote CLUSTER FAILOVER FORCE

# Takeover without coordination (use only when primary is truly dead)
redis-cli -h replica-to-promote CLUSTER FAILOVER TAKEOVER
```

## Checking Slot Coverage

```bash
# List all slots and which nodes own them
redis-cli -h redis-node-1 CLUSTER SLOTS

# Redis 7+: detailed shard info
redis-cli -h redis-node-1 CLUSTER SHARDS
```

```python
def check_slot_coverage(host='localhost', port=6379):
    r = redis.Redis(host=host, port=port, decode_responses=True)
    slots = r.cluster_slots()

    covered_slots = set()
    for slot_range in slots:
        start, end = slot_range[0], slot_range[1]
        covered_slots.update(range(start, end + 1))

    total_slots = 16384
    missing = total_slots - len(covered_slots)
    print(f"Covered slots: {len(covered_slots)}/{total_slots}")
    if missing > 0:
        print(f"WARNING: {missing} slot(s) not assigned to any node!")
```

## Summary

Redis CLUSTER commands provide the visibility you need to diagnose distributed Redis deployments. Start with `CLUSTER INFO` to get the overall state, then use `CLUSTER NODES` to see individual node health and role assignments. Use `CLUSTER KEYSLOT` and `CLUSTER COUNTKEYSINSLOT` to investigate key distribution. When a node fails, `CLUSTER FAILOVER` lets you manually promote a replica with controlled precision.
