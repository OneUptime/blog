# How to Use CLUSTER REPLICATE in Redis to Set Up Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Replication, High Availability, Operation

Description: Learn how to use CLUSTER REPLICATE in Redis to configure a cluster node as a replica of a master, enabling high availability and failover.

---

## What Is CLUSTER REPLICATE?

`CLUSTER REPLICATE` is a Redis Cluster command that configures the current node to become a replica (slave) of a specified master node. It is used when building out the replication layer of a Redis Cluster, either during initial setup or when adding new replicas to improve fault tolerance.

Unlike the standalone `REPLICAOF` command, `CLUSTER REPLICATE` works within the cluster context and uses node IDs rather than IP addresses.

## Basic Syntax

```text
CLUSTER REPLICATE node-id
```

Parameter:
- `node-id` - the 40-character node ID of the master to replicate from

This command must be run on the node that will become the replica.

## Prerequisites

Before using `CLUSTER REPLICATE`:

1. The node must already be part of the cluster (joined via `CLUSTER MEET`)
2. The node must have no hash slots assigned (only nodes with no slots can become replicas)
3. The target master node ID must be known (find it with `CLUSTER NODES`)

## Finding the Master Node ID

```bash
# Get node IDs for all master nodes
redis-cli -h 192.168.1.10 -p 6379 CLUSTER NODES | grep master | grep -v fail
```

```text
a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 192.168.1.10:6379@16379 master - 0 1700000000 1 connected 0-5460
```

## Configuring a Node as a Replica

Connect to the node you want to make a replica and run:

```bash
redis-cli -h 192.168.1.13 -p 6379 CLUSTER REPLICATE a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
# Returns: OK
```

Verify replication is set up:

```bash
redis-cli -h 192.168.1.10 -p 6379 CLUSTER NODES | grep 192.168.1.13
```

```text
d4e5f6a1... 192.168.1.13:6379@16379 slave a1b2c3d4e5f6... 0 1700000000 1 connected
```

## Full Workflow: Setting Up a 3-Master + 3-Replica Cluster

```bash
# Assume 6 nodes have been started and joined via CLUSTER MEET
# Get node IDs for master candidates
redis-cli -h 127.0.0.1 -p 7001 CLUSTER NODES

# Assign slots to masters (done via reshard or manual CLUSTER ADDSLOTS)
redis-cli --cluster create \
  127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \
  127.0.0.1:7004 127.0.0.1:7005 127.0.0.1:7006 \
  --cluster-replicas 1

# The above command handles CLUSTER REPLICATE automatically
# But you can also do it manually:

# Get master IDs
MASTER1_ID=$(redis-cli -h 127.0.0.1 -p 7001 CLUSTER MYID)
MASTER2_ID=$(redis-cli -h 127.0.0.1 -p 7002 CLUSTER MYID)
MASTER3_ID=$(redis-cli -h 127.0.0.1 -p 7003 CLUSTER MYID)

# Configure replicas
redis-cli -h 127.0.0.1 -p 7004 CLUSTER REPLICATE $MASTER1_ID
redis-cli -h 127.0.0.1 -p 7005 CLUSTER REPLICATE $MASTER2_ID
redis-cli -h 127.0.0.1 -p 7006 CLUSTER REPLICATE $MASTER3_ID
```

## Verifying Replication Status

```bash
# Check replication info on the replica
redis-cli -h 127.0.0.1 -p 7004 INFO replication
```

```text
role:slave
master_host:127.0.0.1
master_port:7001
master_link_status:up
master_last_io_seconds_ago:1
master_sync_in_progress:0
slave_repl_offset:12345
```

## Reassigning a Replica to a Different Master

You can reassign a replica to replicate a different master by running `CLUSTER REPLICATE` again with a new node ID:

```bash
# Reassign replica at port 7004 to replicate master at port 7002
NEW_MASTER_ID=$(redis-cli -h 127.0.0.1 -p 7002 CLUSTER MYID)
redis-cli -h 127.0.0.1 -p 7004 CLUSTER REPLICATE $NEW_MASTER_ID
```

## Python Example

```python
import redis

# Connect to the node that will become a replica
replica = redis.Redis(host='192.168.1.13', port=6379, decode_responses=True)

# Get the master node ID from any cluster node
master_conn = redis.Redis(host='192.168.1.10', port=6379, decode_responses=True)
master_id = master_conn.cluster_myid()

# Set up replication
result = replica.cluster_replicate(master_id)
print(result)  # True (OK)

# Verify
info = replica.info('replication')
print(f"Role: {info['role']}")
print(f"Master: {info.get('master_host')}:{info.get('master_port')}")
```

## Summary

`CLUSTER REPLICATE` is the command used to configure Redis Cluster nodes as replicas, forming the high-availability layer of the cluster. Each master should have at least one replica to enable automatic failover. The command requires the target master's node ID, which can be obtained from `CLUSTER NODES` or `CLUSTER MYID`. For initial cluster creation, `redis-cli --cluster create` with `--cluster-replicas` handles replication setup automatically.
