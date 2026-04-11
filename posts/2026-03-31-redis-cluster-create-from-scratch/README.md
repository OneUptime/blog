# How to Create a Redis Cluster from Scratch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Setup, Configuration, Sharding

Description: Step-by-step guide to creating a Redis Cluster from scratch with 3 primary nodes and 3 replicas using redis-cli cluster create.

---

Redis Cluster provides automatic sharding and high availability. This guide walks through creating a 6-node cluster (3 primaries + 3 replicas) from scratch on a single machine or across multiple hosts.

## Architecture

```text
Node 1 (7001): Primary - slots 0-5460
Node 2 (7002): Primary - slots 5461-10922
Node 3 (7003): Primary - slots 10923-16383
Node 4 (7004): Replica of Node 1
Node 5 (7005): Replica of Node 2
Node 6 (7006): Replica of Node 3
```

## Step 1 - Configure Each Node

Create a config file for each node:

```bash
for port in 7001 7002 7003 7004 7005 7006; do
  mkdir -p /etc/redis/cluster/$port
  cat > /etc/redis/cluster/$port/redis.conf << EOF
port $port
bind 0.0.0.0
daemonize yes
logfile /var/log/redis/cluster-$port.log
dir /var/lib/redis/cluster/$port
cluster-enabled yes
cluster-config-file /etc/redis/cluster/$port/nodes.conf
cluster-node-timeout 5000
appendonly yes
EOF
done
```

## Step 2 - Create Data Directories

```bash
for port in 7001 7002 7003 7004 7005 7006; do
  mkdir -p /var/lib/redis/cluster/$port
done
```

## Step 3 - Start All Nodes

```bash
for port in 7001 7002 7003 7004 7005 7006; do
  redis-server /etc/redis/cluster/$port/redis.conf
done

# Verify all are running
for port in 7001 7002 7003 7004 7005 7006; do
  redis-cli -p $port PING
done
```

## Step 4 - Create the Cluster

```bash
redis-cli --cluster create \
  127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \
  127.0.0.1:7004 127.0.0.1:7005 127.0.0.1:7006 \
  --cluster-replicas 1 --cluster-yes
```

The `--cluster-replicas 1` flag assigns 1 replica per primary. Redis automatically assigns replicas to primaries (placing replicas of a primary on different hosts if possible).

Expected output:

```text
>>> Performing hash slots allocation on 6 nodes...
Master[0] -> Slots 0 - 5460
Master[1] -> Slots 5461 - 10922
Master[2] -> Slots 10923 - 16383
Adding replica 127.0.0.1:7004 to 127.0.0.1:7001
Adding replica 127.0.0.1:7005 to 127.0.0.1:7002
Adding replica 127.0.0.1:7006 to 127.0.0.1:7003
[OK] All 16384 slots covered.
```

## Step 5 - Verify the Cluster

```bash
redis-cli -p 7001 CLUSTER INFO
```

```text
cluster_enabled:1
cluster_state:ok
cluster_slots_assigned:16384
cluster_known_nodes:6
cluster_size:3
```

```bash
redis-cli -p 7001 CLUSTER NODES
# Lists all 6 nodes with their roles, slots, and IDs
```

## Step 6 - Test a Write

```bash
# Use -c flag for cluster mode (handles MOVED redirects)
redis-cli -c -p 7001 SET hello world
# -> OK (key "hello" hashes to slot 866, which is on node 7001)

redis-cli -c -p 7001 GET hello
# -> "world"
```

## Connecting from Application Code

```python
from redis.cluster import RedisCluster, ClusterNode

rc = RedisCluster(
    startup_nodes=[
        ClusterNode("127.0.0.1", 7001),
        ClusterNode("127.0.0.1", 7002)
    ],
    decode_responses=True
)

rc.set("key", "value")
print(rc.get("key"))
```

## Summary

Create a Redis Cluster by configuring each node with `cluster-enabled yes`, starting all nodes, then running `redis-cli --cluster create` with all node addresses and `--cluster-replicas 1`. The tool automatically distributes 16384 hash slots across primaries and assigns replicas. Verify with `CLUSTER INFO` and test with the `-c` cluster mode flag.
