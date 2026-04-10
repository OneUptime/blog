# How to Use RedisInsight for Cluster Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisInsight, Cluster, Management, GUI

Description: Learn how to view cluster topology, check node health, inspect slot distribution, and manage failovers using RedisInsight's cluster management UI.

---

Managing a Redis Cluster through the CLI requires remembering many `CLUSTER` subcommands. RedisInsight provides a visual interface for monitoring node health, slot distribution, and triggering failovers without writing any commands manually.

## Connecting to a Redis Cluster

When adding a database in RedisInsight, enter any node's host and port. RedisInsight automatically discovers the full cluster topology:

```text
Host: cluster-node-1.internal
Port: 6379
```

After connecting, RedisInsight shows a "Cluster" badge on the database card.

## Viewing Cluster Topology

Navigate to the cluster view to see all nodes. Each node card shows:

- Node ID (truncated)
- IP and port
- Role: Primary or Replica
- Slot range assigned (e.g., 0-5460)
- Status: OK, FAIL, or PFAIL

A healthy cluster looks like:

```text
Node 1 (Primary)  Slots: 0-5460     Status: OK
Node 2 (Primary)  Slots: 5461-10922 Status: OK
Node 3 (Primary)  Slots: 10923-16383 Status: OK
Node 4 (Replica of 1) Status: OK
Node 5 (Replica of 2) Status: OK
Node 6 (Replica of 3) Status: OK
```

## Checking Slot Distribution

RedisInsight displays a slot map showing which slots are assigned to each primary. Gaps or unassigned slots are highlighted in red.

You can also run from the CLI tab:

```text
> CLUSTER INFO
cluster_state:ok
cluster_slots_assigned:16384
cluster_known_nodes:6
cluster_size:3
```

## Inspecting Individual Nodes

Click a node card to view details:

```text
> CLUSTER NODES
<id> 10.0.0.1:6379@16379 master - 0 1700000000 1 connected 0-5460
<id> 10.0.0.2:6379@16379 slave <master-id> 0 1700000001 2 connected
```

## Triggering a Manual Failover

If a primary node needs maintenance, promote its replica:

1. Click the replica node card
2. Click "Failover"
3. Choose "Manual Failover"
4. Confirm the action

RedisInsight sends `CLUSTER FAILOVER` to the selected replica node.

From the CLI:

```text
> CLUSTER FAILOVER
OK
```

## Checking Replication Lag

For each replica, hover over the node to see the replication offset difference:

```text
Primary offset:  12345678
Replica offset:  12345670
Lag:             8 bytes
```

A large lag indicates network issues or the replica is under load.

## Adding a New Node

Use the CLI tab to add nodes to an existing cluster:

```text
> CLUSTER MEET 10.0.0.7 6379
OK
```

Then use `redis-cli --cluster reshard` to redistribute slots to the new node.

## Removing a Node

Before removing a node, migrate its slots away:

```bash
redis-cli --cluster reshard 10.0.0.1:6379 \
  --cluster-from <node-id> \
  --cluster-to <target-node-id> \
  --cluster-slots 5461 \
  --cluster-yes
```

Then:

```text
> CLUSTER FORGET <node-id>
OK
```

## Summary

RedisInsight provides a visual interface for Redis Cluster management, including topology inspection, node health monitoring, slot distribution visualization, and failover triggering. It reduces the need to memorize `CLUSTER` subcommands and makes cluster state easier to understand at a glance.
