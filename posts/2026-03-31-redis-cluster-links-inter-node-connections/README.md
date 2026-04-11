# How to Use CLUSTER LINKS in Redis to View Inter-Node Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, CLUSTER LINKS, Network, Cluster Topology

Description: Learn how to use CLUSTER LINKS in Redis 7.0+ to inspect active TCP connections between cluster nodes for network diagnostics and monitoring.

---

`CLUSTER LINKS`, introduced in Redis 7.0, returns detailed information about the TCP connections that the current node maintains with other cluster nodes. This is useful for diagnosing network issues, verifying cluster mesh connectivity, and monitoring gossip protocol health.

## Syntax

```text
CLUSTER LINKS
```

Returns an array of maps, one per active connection to a peer node.

## Basic Usage

```bash
redis-cli -p 7001 CLUSTER LINKS
```

Example output:

```text
1) 1) "direction"
   2) "to"
   3) "node"
   4) "a17b...c32f"
   5) "create-time"
   6) (integer) 1711800000000
   7) "events"
   8) "rw"
   9) "send-buffer-allocated"
   10) (integer) 4096
   11) "send-buffer-used"
   12) (integer) 0
```

## Understanding the Fields

| Field | Description |
|-------|-------------|
| direction | `to` (outbound) or `from` (inbound) |
| node | The ID of the connected peer node |
| create-time | Timestamp when the connection was created (milliseconds). For outbound (`to`) links, this is when the TCP link was initiated, not when it was fully established. |
| events | `r` = readable, `w` = writable |
| send-buffer-allocated | Bytes allocated in the send buffer |
| send-buffer-used | Bytes currently in the send buffer waiting to be sent |

## Identifying Network Issues

A healthy cluster node should have connections to all other nodes. Missing connections indicate network problems:

```bash
# How many connections does this node have?
redis-cli -p 7001 CLUSTER LINKS | grep "direction" | wc -l

# Compare to expected number of nodes
redis-cli -p 7001 CLUSTER INFO | grep cluster_known_nodes
```

If the connection count is lower than expected, investigate network policies or firewall rules between nodes.

## Checking for Buffer Buildup

High `send-buffer-used` values on connections may indicate a slow or unresponsive peer:

```bash
redis-cli -p 7001 CLUSTER LINKS | grep -A1 "send-buffer-used"
```

Persistent buffer buildup can cause gossip delays and affect cluster state convergence.

## Monitoring Connection Age

New connections being frequently recreated may indicate network instability:

```bash
redis-cli -p 7001 CLUSTER LINKS | grep -A1 "create-time"
```

Very recent `create-time` values across many connections suggest repeated reconnects.

## Scripting Connectivity Checks

```bash
#!/bin/bash
# Count links per node and alert if below expected threshold
EXPECTED_LINKS=10  # adjust for your cluster size
for port in 7001 7002 7003; do
  count=$(redis-cli -p $port CLUSTER LINKS | grep '"direction"' | wc -l)
  if [ "$count" -lt "$EXPECTED_LINKS" ]; then
    echo "WARNING: Node on port $port has only $count links (expected $EXPECTED_LINKS)"
  fi
done
```

## Availability

`CLUSTER LINKS` requires Redis 7.0 or later. For older versions, use `CLUSTER NODES` to inspect topology, though it provides less connection-level detail.

## Summary

`CLUSTER LINKS` exposes the active TCP connections between Redis Cluster nodes, giving you visibility into gossip protocol connectivity and network health. Use it to identify missing connections, buffer buildup, and connection instability that could affect cluster reliability.
