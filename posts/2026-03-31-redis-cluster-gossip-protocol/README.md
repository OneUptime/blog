# How Redis Cluster Gossip Protocol Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Gossip, Protocol, Architecture

Description: Learn how Redis Cluster uses the gossip protocol for node discovery, failure detection, and cluster state propagation across all nodes.

---

Redis Cluster uses a gossip protocol to propagate cluster state, detect node failures, and keep all nodes informed without central coordination. Understanding it helps you tune cluster-node-timeout and debug connectivity issues.

## What the Gossip Protocol Does

```text
1. Node discovery - new nodes are announced to the cluster
2. Failure detection - nodes mark unresponsive peers as PFAIL/FAIL
3. Slot ownership propagation - who owns which hash slots
4. Configuration version tracking - cluster epochs
5. Replica/primary relationship changes - after failover
```

## The Cluster Bus Port

Gossip runs on a separate port from the Redis client port:

```text
Redis client port: 7001
Cluster bus port:  17001 (client port + 10000)
```

Ensure firewall rules allow cluster bus communication:

```bash
# All cluster nodes need inbound access to ports 7001-7006 AND 17001-17006
sudo ufw allow 7001:7006/tcp
sudo ufw allow 17001:17006/tcp
```

## How Gossip Messages Work

Every second, each node:
1. Selects a random set of known nodes
2. Sends PING messages to them via the cluster bus
3. Includes gossip information about other nodes it knows

```text
Node A pings Node B
  -> includes info about nodes C, D it has seen recently

Node B updates its knowledge of C and D
Node B pongs back with info about nodes E, F

Result: cluster state propagates across all nodes in O(log N) rounds
```

## Message Types

```text
PING  - Periodic heartbeat, carries gossip payload
PONG  - Response to PING
MEET  - Initial introduction when adding a new node
FAIL  - Broadcast when a node is confirmed as failed
UPDATE - Sent when a node's config has changed (e.g., after failover)
PUBLISH - Used for Pub/Sub in cluster mode
```

## Failure Detection via Gossip

When a node does not respond to PINGs:

```text
1. Node A: "Node B hasn't responded for cluster-node-timeout ms" -> marks B as PFAIL
2. Node A gossips this to other nodes: "B seems down"
3. When majority of primaries have B marked as PFAIL:
   -> B is declared FAIL
4. FAIL message is broadcast to all nodes immediately (not gossiped slowly)
```

## Viewing Gossip Activity

```bash
# See what nodes each node knows about
redis-cli -p 7001 CLUSTER NODES

# See inter-node links and their state
redis-cli -p 7001 CLUSTER LINKS
```

```text
# CLUSTER LINKS output for a healthy node:
1) 1) "direction" -> "to"
   2) "node" -> "node-id-2"
   3) "create-time" -> 1234567890
   4) "events" -> "rw"     <- read/write active
   5) "send-buffer-allocated" -> 4096
   6) "send-buffer-used" -> 0
```

If `events` shows only `r` or nothing, the link is degraded.

## Cluster State Convergence Time

In a healthy cluster, gossip ensures all nodes converge to the same view within:

```text
~2 * cluster-node-timeout * (log N) rounds
```

For a 9-node cluster with 5-second timeout:

```text
~2 * 5000ms * log(9) = ~20 seconds for full convergence
```

In practice, FAIL messages are broadcast directly, so failures converge in seconds.

## Debugging Gossip Issues

```bash
# Check if nodes can reach each other on cluster bus
telnet 192.168.1.11 17001

# Look for links with degraded events (missing "rw")
redis-cli -p 7001 CLUSTER LINKS

# Verify cluster epoch is consistent
redis-cli -p 7001 CLUSTER INFO | grep cluster_current_epoch
redis-cli -p 7002 CLUSTER INFO | grep cluster_current_epoch
# All nodes should eventually show the same epoch
```

## Summary

Redis Cluster gossip protocol propagates node state, slot ownership, and failure information via periodic PING/PONG messages on the cluster bus port (Redis port + 10000). Nodes detect failures when peers stop responding for `cluster-node-timeout` milliseconds, then gossip the PFAIL state until a majority confirms it as FAIL. Keep cluster bus ports open in firewalls and monitor `CLUSTER LINKS` for degraded connections.
