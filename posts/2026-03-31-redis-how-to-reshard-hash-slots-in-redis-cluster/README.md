# How to Reshard Hash Slots in Redis Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Resharding, Hash Slot, Operation

Description: A practical guide to resharding Redis Cluster hash slots manually and automatically, covering slot migration, monitoring, and common pitfalls.

---

## What Is Resharding?

Redis Cluster distributes 16384 hash slots across its primary nodes. Resharding is the process of moving some hash slots (and the keys they contain) from one node to another. You reshard when:

- Adding new primary nodes (they need slots to store data)
- Removing primary nodes (their slots must move elsewhere)
- Rebalancing an uneven slot distribution

## How Hash Slots Work

Each key maps to a slot via:

```text
slot = CRC16(key) % 16384
```

Moving a slot means moving all keys belonging to that slot. Redis handles this online - keys remain accessible during migration through ASK redirects.

## Checking Current Slot Distribution

Before resharding, view the current distribution:

```bash
redis-cli -h 192.168.1.11 -p 7001 -a clusterPassword CLUSTER NODES | grep master
```

Or for a cleaner summary:

```bash
redis-cli --cluster info 192.168.1.11:7001 -a clusterPassword
```

Sample output:

```text
192.168.1.11:7001 (abc123) -> 5000 keys | 5462 slots | 1 slaves.
192.168.1.12:7002 (def456) -> 4800 keys | 5461 slots | 1 slaves.
192.168.1.13:7003 (ghi789) -> 4900 keys | 5461 slots | 1 slaves.
[OK] 14700 keys in 3 masters.
0.90 keys per slot on average.
```

## Method 1 - Interactive Reshard

The `reshard` command walks you through a migration interactively:

```bash
redis-cli --cluster reshard 192.168.1.11:7001 -a clusterPassword
```

You will be asked:

```text
How many slots do you want to move (from 1 to 16384)? 1000
What is the receiving node ID? <destination-node-id>
Please enter all the source node IDs.
  Type 'all' to use all nodes as source.
  Type 'done' once you entered all source IDs.
Source node #1: <source-node-id>
Source node #2: done
Do you want to proceed? yes
```

## Method 2 - Non-Interactive Reshard

For scripting and automation, use flags instead of interactive mode:

```bash
redis-cli --cluster reshard 192.168.1.11:7001 \
  --cluster-from <source-node-id> \
  --cluster-to <destination-node-id> \
  --cluster-slots 1000 \
  --cluster-yes \
  -a clusterPassword
```

Move from multiple sources:

```bash
redis-cli --cluster reshard 192.168.1.11:7001 \
  --cluster-from <node-id1>,<node-id2> \
  --cluster-to <destination-node-id> \
  --cluster-slots 2000 \
  --cluster-yes \
  -a clusterPassword
```

Use `all` to spread the migration cost across all source nodes:

```bash
redis-cli --cluster reshard 192.168.1.11:7001 \
  --cluster-from all \
  --cluster-to <new-node-id> \
  --cluster-slots 4096 \
  --cluster-yes \
  -a clusterPassword
```

## Method 3 - Automatic Rebalance

For balanced distribution without specifying exact slots:

```bash
redis-cli --cluster rebalance 192.168.1.11:7001 \
  --cluster-use-empty-masters \
  -a clusterPassword
```

The `--cluster-use-empty-masters` flag includes nodes with no slots (newly added nodes) in the rebalance.

Rebalance with a pipeline count for faster migration:

```bash
redis-cli --cluster rebalance 192.168.1.11:7001 \
  --cluster-pipeline 100 \
  -a clusterPassword
```

## Monitoring Migration in Progress

While migration is running, you can see slots in MIGRATING or IMPORTING state:

```bash
redis-cli -h 192.168.1.11 -p 7001 -a clusterPassword CLUSTER NODES | grep -E "\[.*->-.*\]|\[.*-<-.*\]"
```

Or watch the slot count change:

```bash
watch -n 2 "redis-cli --cluster info 192.168.1.11:7001 -a clusterPassword"
```

Check how many keys remain in a migrating slot on a specific node:

```bash
redis-cli -h 192.168.1.12 -p 7002 -a clusterPassword CLUSTER COUNTKEYSINSLOT 500
```

## What Happens During Migration

When a slot is being migrated from node A to node B:

1. Node A marks the slot as MIGRATING
2. Node B marks the slot as IMPORTING
3. Keys are moved in batches from A to B using `MIGRATE`
4. During migration, clients accessing keys in the slot are redirected:
   - If the key is on A: A serves it directly
   - If the key has moved to B: A returns an `ASK` redirect
5. When all keys are moved, the slot is committed to B

Clients see `ASK` redirects (temporary, single-command) as distinct from `MOVED` redirects (permanent slot change).

## Verifying Migration Completed

After migration, check that the cluster has no slots in migrating state:

```bash
redis-cli --cluster check 192.168.1.11:7001 -a clusterPassword
```

Expected:

```text
[OK] All nodes agree about slots configuration.
[OK] All 16384 slots covered.
```

If you see warnings about migrating slots, the migration did not complete cleanly. Run:

```bash
redis-cli --cluster fix 192.168.1.11:7001 -a clusterPassword
```

## Performance Impact During Resharding

Resharding consumes CPU and network bandwidth. During large migrations:

- Monitor CPU usage on source and destination nodes
- Monitor network I/O between the nodes
- Consider running migrations during off-peak hours
- Use `--cluster-pipeline` to control batch size (lower = less impact but slower)

```bash
# Conservative migration - 10 keys per batch
redis-cli --cluster reshard 192.168.1.11:7001 \
  --cluster-from all \
  --cluster-to <node-id> \
  --cluster-slots 4096 \
  --cluster-pipeline 10 \
  --cluster-yes \
  -a clusterPassword
```

## Summary

Redis Cluster resharding moves hash slots and their data between primary nodes to maintain balanced distribution. Use `redis-cli --cluster reshard` for manual control, `--cluster rebalance` for automatic balancing, and monitor progress via `CLUSTER NODES` and `cluster check`. Always verify after resharding that all 16384 slots are covered and no slots remain in migration state.
