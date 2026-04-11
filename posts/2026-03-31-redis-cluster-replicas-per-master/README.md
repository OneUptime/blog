# How to Configure Redis Cluster Replicas Per Master

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Replica, Configuration, High Availability

Description: Learn how to configure the number of replicas per primary in Redis Cluster for high availability, and how to add or reassign replicas to specific primaries.

---

Each primary in a Redis Cluster can have one or more replicas. More replicas provide higher fault tolerance (can survive multiple simultaneous failures) and more read capacity, but consume additional memory and network bandwidth.

## Initial Cluster Creation with Replicas

When creating a cluster, specify replicas per primary with `--cluster-replicas`:

```bash
# 1 replica per primary (minimum for HA)
redis-cli --cluster create \
  host1:7001 host2:7002 host3:7003 \
  host4:7004 host5:7005 host6:7006 \
  --cluster-replicas 1

# 2 replicas per primary (higher availability)
redis-cli --cluster create \
  h1:7001 h2:7002 h3:7003 \
  h4:7004 h5:7005 h6:7006 \
  h7:7007 h8:7008 h9:7009 \
  --cluster-replicas 2
```

With 2 replicas per primary, the cluster survives losing 2 nodes per shard.

## Adding a Replica to an Existing Primary

### Step 1 - Add the New Node to the Cluster

```bash
redis-cli --cluster add-node new-host:7007 existing-host:7001
```

This adds the new node but assigns it no slots and no primary.

### Step 2 - Assign It as a Replica

Get the node IDs:

```bash
redis-cli -p 7001 CLUSTER NODES
```

```text
abc123... host3:7003@17003 master - 0 ... connected 10923-16383
def456... new-host:7007@17007 master - 0 ... connected
```

Assign the new node as a replica of the primary you want to protect:

```bash
redis-cli -h new-host -p 7007 CLUSTER REPLICATE abc123...
# abc123 is the node ID of the primary to follow
```

Verify:

```bash
redis-cli -p 7001 CLUSTER NODES | grep def456
# Should now show "slave" and point to abc123
```

## Using --cluster add-node with Replica Flag

A single command approach:

```bash
redis-cli --cluster add-node new-host:7007 existing-host:7001 \
  --cluster-slave \
  --cluster-master-id abc123...
```

## Checking Replica Distribution

```bash
redis-cli -p 7001 CLUSTER NODES | awk '{print $3, $8}' | grep -v "noaddr"
```

Verify each primary has the expected number of replicas:

```bash
redis-cli -p 7001 CLUSTER SHARDS
```

Output shows each shard with its primary and all replicas.

## Reassigning a Replica to a Different Primary

```bash
# Connect to the replica node and reassign
redis-cli -h replica-host -p 7007 CLUSTER REPLICATE new-master-node-id
```

This triggers a new resync from the new primary.

## Replica Priority for Failover

Control which replica is preferred for promotion during failover:

```bash
# Lower non-zero priority = preferred for promotion (default 100)
redis-cli -h replica-1 -p 7004 CONFIG SET replica-priority 10

# Never promote this replica (useful for replicas used only for backups)
redis-cli -h backup-replica -p 7008 CONFIG SET replica-priority 0
```

## Monitoring Replica Health per Primary

```bash
for port in 7001 7002 7003; do
  echo "Primary $port replicas:"
  redis-cli -p $port INFO replication | grep -E "slave[0-9]"
done
```

## Summary

Configure Redis Cluster replicas by specifying `--cluster-replicas N` during creation, or by adding nodes with `--cluster add-node` and then assigning them with `CLUSTER REPLICATE`. Use `replica-priority 0` for replicas that should never be promoted (e.g., backup nodes). Each additional replica improves fault tolerance but adds replication overhead.
