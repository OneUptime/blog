# How Redis Cluster Bus Communication Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Bus, Communication, Protocol

Description: Learn how the Redis Cluster bus works as a separate TCP channel for inter-node communication, what data it carries, and how to configure and troubleshoot it.

---

Redis Cluster nodes communicate with each other on a separate TCP channel called the cluster bus. This channel is distinct from the client-facing Redis port and carries gossip messages, failure detection, and configuration updates.

## The Cluster Bus Port

Every Redis Cluster node listens on two ports:

```text
Client port:      6379  (or custom, e.g., 7001)
Cluster bus port: 16379 (client port + 10000, or set via cluster-port config in Redis 7.0+)
```

Clients connect to the client port. Cluster nodes connect to each other's bus port.

```bash
# Verify cluster bus is listening
ss -tlnp | grep -E "6379|16379"
```

## What Travels on the Cluster Bus

```text
1. PING/PONG heartbeats - failure detection, includes gossip payload
2. MEET messages - add new nodes to the cluster
3. FAIL messages - immediate broadcast of confirmed node failures
4. UPDATE messages - propagate config epoch changes after failover
5. MFSTART - manual failover coordination
6. PUBLISH payloads - for keyspace notifications and Pub/Sub in cluster
```

## Cluster Bus Packet Structure

Each gossip PING/PONG contains:

```text
Header:
  - Sender node ID (40 bytes)
  - Current config epoch
  - Sender's slot bitmap (2048 bytes for 16384 slots)
  - Sender IP/port

Gossip section (variable):
  - Up to 1/10th of known nodes
  - For each: node ID, IP, port, flags, last ping sent, last pong received
```

This is why 16384 slots was chosen - the slot bitmap fits in 2048 bytes (2KB), keeping the heartbeat packet header compact. With 65536 slots, the bitmap alone would be 8KB, making gossip messages prohibitively large.

## Checking Cluster Bus Links

```bash
redis-cli -p 7001 CLUSTER LINKS
```

```text
1) 1) "direction"  -> "to"       (outbound) or "from" (inbound)
   2) "node"       -> "node-id"
   3) "create-time"-> 1712000000
   4) "events"     -> "r"        (r=readable, w=writable, rw=both)
   5) "send-buffer-allocated" -> 4096
   6) "send-buffer-used"      -> 0
```

Healthy links show `events: rw`. Links stuck on only `r` or empty indicate network issues.

## Firewall Requirements

Both directions must be open on the bus port:

```bash
# Open cluster bus ports for all cluster nodes
# Replace with your actual node IPs
for NODE_IP in 192.168.1.10 192.168.1.11 192.168.1.12; do
  sudo ufw allow from $NODE_IP to any port 17001
  sudo ufw allow from $NODE_IP to any port 17002
  sudo ufw allow from $NODE_IP to any port 17003
done
```

If nodes cannot reach each other on the bus port, they will mark each other as PFAIL:

```bash
redis-cli -p 7001 CLUSTER NODES | grep pfail
```

## Cluster Bus Buffer Monitoring

Redis 7.0+ provides metrics for bus buffer usage:

```bash
redis-cli -p 7001 CLUSTER INFO | grep cluster_links
# total_cluster_links_buffer_limit_exceeded:0
```

If this counter is non-zero, some cluster bus messages were dropped due to buffer overflow. Increase the limit:

```bash
redis-cli CONFIG SET cluster-link-sendbuf-limit 8mb
```

## Send Buffer Limit Behavior

When a cluster bus link is congested, Redis limits the send buffer to prevent memory exhaustion:

```bash
redis-cli CONFIG GET cluster-link-sendbuf-limit
# Default: 0 (no limit)
```

Setting a limit (e.g., 8mb) causes Redis to drop the link if the buffer exceeds the limit, forcing a reconnect:

```bash
redis-cli CONFIG SET cluster-link-sendbuf-limit 8388608  # 8MB
```

## Debugging Bus Connectivity

```bash
# Test if cluster bus port is reachable from another node
telnet 192.168.1.11 17001

# Check connection count on bus port
ss -tn | grep :17001 | wc -l

# Look for refused connections in Redis logs
grep "Error connecting to cluster node" /var/log/redis/cluster.log
```

## Summary

The Redis Cluster bus is a dedicated TCP channel (client port + 10000) used for gossip, failure detection, and configuration propagation. Ensure firewall rules allow cluster bus traffic between all nodes, monitor `CLUSTER LINKS` for degraded connections, and watch `total_cluster_links_buffer_limit_exceeded` for bus congestion in production.
