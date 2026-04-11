# How Redis Cluster Gossip Protocol Works Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Gossip Protocol, Distributed System, Internal

Description: Understand how Redis Cluster nodes discover each other, detect failures, and maintain cluster topology using the gossip protocol over the cluster bus port.

---

## What Is the Gossip Protocol

Gossip protocols (also called epidemic protocols) are a class of distributed communication protocols where nodes periodically exchange state information with a random subset of peers. Over time, information propagates throughout the cluster like a rumor spreading through a crowd.

Redis Cluster uses gossip for:
- Cluster topology discovery (who are the nodes, what slots do they own)
- Failure detection (which nodes are unreachable)
- Configuration updates propagation (master/replica changes)

## The Cluster Bus

Redis Cluster nodes communicate on two ports:
- **Data port** (e.g., 7000): Client connections
- **Cluster bus port** (data port + 10000, e.g., 17000): Node-to-node gossip

```bash
# Redis Cluster configuration
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 15000  # 15 seconds

# The cluster bus port is automatically data_port + 10000
# port 7000 -> cluster bus on 17000
```

## Cluster Message Types

Nodes exchange several message types over the cluster bus:

```text
PING   - Heartbeat sent to a random subset of nodes
PONG   - Response to PING with sender's cluster view
MEET   - Initial introduction (like PING but forces node into cluster)
FAIL   - Broadcast when a node is confirmed down
PUBLISH - Pub/Sub message routing in cluster mode
UPDATE - Sent when a node detects stale configuration
```

## The PING/PONG Gossip Cycle

Every node sends a PING to a random selection of nodes every 100ms (configurable):

```text
Gossip cycle (every 100ms):

1. Select nodes to PING
   - Always PING nodes not heard from in > cluster-node-timeout/2
   - Pick 5 random nodes and PING the one with the oldest pong_received time

2. PING includes:
   - Sender's current cluster view (node IDs, IPs, slots, states)
   - Information about a few random other nodes (gossip section)
   - Current epoch numbers

3. Recipient responds with PONG:
   - Own updated cluster view
   - Ack of any new information received

4. Nodes update their local cluster view based on received PINGs/PONGs
```

## Failure Detection

Redis Cluster uses a two-phase failure detection:

```text
Phase 1: PFAIL (Possible Failure)
- Node A does not receive PONG from Node B within cluster-node-timeout
- Node A marks Node B as PFAIL in its local state

Phase 2: FAIL (Confirmed Failure)
- Node A gossips Node B's PFAIL status to other nodes
- When a majority of masters see Node B as PFAIL within the timeout window
- Any node can mark Node B as FAIL and broadcast FAIL message
- FAIL message propagates immediately (unlike regular gossip)
```

```bash
# Cluster node timeout (default: 15000ms = 15 seconds)
redis-cli CONFIG GET cluster-node-timeout

# After node-timeout, node is marked PFAIL
# FAIL requires majority of masters to report PFAIL within 2 * node-timeout window
```

## Cluster State Information Per Node

Each node maintains a cluster view of all other nodes:

```text
For each known node, a Redis node stores:
- Node ID (40-character hex string)
- IP address and port
- Flags (master, slave, pfail, fail, myself, noaddr, etc.)
- Master node ID (if this is a replica)
- Ping sent timestamp
- Pong received timestamp
- Config epoch
- Hash slots bitmap (16384 bits = 2048 bytes)
- Link status
```

## Inspecting Cluster State

```bash
# View cluster topology from any node's perspective
redis-cli -p 7000 CLUSTER NODES

# Sample output:
# <node-id> <ip:port> <flags> <master> <ping-sent> <pong-recv> <config-epoch> <link-state> <slots>
# 6a7b9f... 127.0.0.1:7000@17000 myself,master - 0 1735689600000 1 connected 0-5460
# 8c2d1e... 127.0.0.1:7001@17001 master - 1735689000000 1735689500000 2 connected 5461-10922
# 9e4f2a... 127.0.0.1:7002@17002 master - 1735689000000 1735689500000 3 connected 10923-16383

# View cluster info
redis-cli -p 7000 CLUSTER INFO

# Check slot assignments
redis-cli -p 7000 CLUSTER SLOTS
```

## Epoch and Configuration Versioning

Redis Cluster uses monotonically increasing epoch numbers to resolve conflicts:

```text
Current epoch: Global counter incremented on configuration changes
Config epoch: Per-node epoch for its slot assignments

When two nodes claim the same slot:
- The node with higher config epoch wins
- Other nodes update their view to match

Failover:
1. Replica detects master FAIL
2. Replica requests votes from other masters
3. Replica increments its config epoch
4. Replica takes over slots from failed master
5. Broadcasts UPDATE to inform cluster
```

## Cluster Configuration File

Redis writes the cluster state to a file on every change:

```bash
# nodes.conf (auto-generated, do not edit manually)
cat /var/lib/redis/nodes.conf

# Content includes:
# <nodeid> <ip:port@busport> <flags> <master> <ping-sent> <pong-recv> <config-epoch> <link-state> <slots>
# vars currentEpoch lastVoteEpoch
```

## Gossip Propagation Speed

With N nodes, gossip takes O(log N) rounds to reach all nodes:

```text
Round 1: Node A informs 2 nodes (B and C)
Round 2: B informs 2 nodes, C informs 2 nodes -> 4 more nodes
Round 3: 4 nodes each inform 2 -> 8 more nodes
...
After log2(N) rounds, all N nodes have the information

For 100 nodes: ~7 rounds
For 1000 nodes: ~10 rounds (a few seconds at 100ms intervals)
```

## Summary

Redis Cluster gossip works by having each node periodically PING a random subset of other nodes, including its current cluster view in each message. Recipients update their local topology view and respond with PONG. Failure detection uses a two-phase PFAIL/FAIL mechanism requiring majority agreement before a node is marked truly failed. Epoch numbers ensure that configuration conflicts are resolved deterministically, with higher-epoch configurations always winning.
