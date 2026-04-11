# How to Use CLUSTER NODES in Redis to List All Cluster Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Monitoring, Operation, CLUSTER NODES

Description: Learn how to use CLUSTER NODES in Redis to get a complete list of all nodes in the cluster with their IDs, addresses, roles, slot ranges, and replication relationships.

---

## Overview

`CLUSTER NODES` returns a text-based dump of all nodes known to the current node, including their IDs, IP/port, roles (primary or replica), slot assignments, and replication relationships. It is the primary command for understanding the full topology of a Redis Cluster.

## Syntax

```redis
CLUSTER NODES
```

Returns a multi-line bulk string. Each line represents one node.

## Sample Output

```redis
CLUSTER NODES
```

```text
a1b2c3d4e5f6 192.168.1.10:7001@17001 master - 0 1711900000000 1 connected 0-5460
d4e5f678abcd 192.168.1.11:7002@17002 master - 0 1711900000100 2 connected 5461-10922
c7d8e9f0ef12 192.168.1.12:7003@17003 master - 0 1711900000200 3 connected 10923-16383
f1a2b3c4d5e6 192.168.1.10:7004@17004 slave a1b2c3d4e5f6 0 1711900000300 1 connected
a7b8c9d0e1f2 192.168.1.11:7005@17005 slave d4e5f678abcd 0 1711900000400 2 connected
b3c4d5e6f7a8 192.168.1.12:7006@17006 slave c7d8e9f0ef12 0 1711900000500 3 connected
```

## Field Format

Each line follows this structure:

```text
<node-id> <ip:port@cluster-port> <flags> <primary-id> <ping-sent> <pong-recv> <config-epoch> <link-state> <slot-range>
```

| Field | Description |
|-------|-------------|
| `node-id` | 40-character hex node identifier |
| `ip:port@cluster-port` | Client port and cluster bus port |
| `flags` | Comma-separated flags (see below) |
| `primary-id` | For replicas: the ID of their primary. For primaries: `-` |
| `ping-sent` | Milliseconds unix time of the currently active ping, or 0 if no pending ping |
| `pong-recv` | Milliseconds unix time of the last PONG received |
| `config-epoch` | Configuration epoch of this node |
| `link-state` | `connected` or `disconnected` |
| `slot-range` | Slot ranges assigned (primaries only) |

## Node Flags

| Flag | Meaning |
|------|---------|
| `master` | Primary node |
| `slave` | Replica node |
| `myself` | The node this command was issued on |
| `fail?` | Node suspected to be down (pfail) |
| `fail` | Node confirmed down (fail) |
| `handshake` | Node being added, in handshake |
| `noaddr` | Node address not yet known |
| `nofailover` | Replica will not attempt failover |
| `noflags` | No special flags |

## Identifying the Current Node

The node issuing the command appears with the `myself` flag:

```text
a1b2c3d4e5f6 192.168.1.10:7001@17001 myself,master - 0 0 1 connected 0-5460
```

## Finding Primary-Replica Relationships

For each replica, the 4th field is the primary's node ID:

```text
# This replica (f1a2b3...) replicates from primary a1b2c3...
f1a2b3c4d5e6 192.168.1.10:7004@17004 slave a1b2c3d4e5f6 0 1711900000300 1 connected
```

## Detecting Node Issues

Watch the `flags` and `link-state` fields:

```text
# Node suspected down
d4e5f678abcd 192.168.1.11:7002@17002 master,fail? - 0 0 2 connected 5461-10922

# Node confirmed down
d4e5f678abcd 192.168.1.11:7002@17002 master,fail - 0 0 2 connected 5461-10922

# Node disconnected at cluster bus level
c7d8e9f0ef12 192.168.1.12:7003@17003 master - 0 0 3 disconnected 10923-16383
```

## Parsing CLUSTER NODES Output

The output is designed to be parsed. Example to extract just primaries and their slots:

```bash
redis-cli -p 7001 CLUSTER NODES | grep master | grep -v slave | awk '{print $2, $9}'
```

```text
192.168.1.10:7001@17001 0-5460
192.168.1.11:7002@17002 5461-10922
192.168.1.12:7003@17003 10923-16383
```

## CLUSTER NODES vs CLUSTER SHARDS

`CLUSTER NODES` returns a flat text representation. `CLUSTER SHARDS` (Redis 7.0+) returns structured shard data with associated replica groupings, which is easier to parse programmatically.

```redis
# Text format, all nodes
CLUSTER NODES

# Structured format, grouped by shard (Redis 7.0+)
CLUSTER SHARDS
```

## Summary

`CLUSTER NODES` returns a complete text dump of all nodes in the Redis Cluster as seen by the querying node. Each line contains the node's ID, address, role flags, primary relationship, configuration epoch, link state, and slot assignments. Use it to understand cluster topology, identify primary-replica pairings, detect failed or disconnected nodes, and extract slot assignments. For structured programmatic parsing in Redis 7.0+, consider `CLUSTER SHARDS` as an alternative.
