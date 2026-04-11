# How to Configure Redis cluster-node-timeout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Configuration, Availability

Description: Configure cluster-node-timeout to control how quickly Redis Cluster detects node failures and triggers failover, balancing availability against false positives.

---

`cluster-node-timeout` determines the maximum time (in milliseconds) a Redis Cluster node can be unreachable before it is considered failed. This value directly affects how fast the cluster detects and recovers from node failures.

## What cluster-node-timeout Controls

The timeout drives multiple cluster behaviors:

- **Failure detection** - A node must be unreachable for `cluster-node-timeout` milliseconds before it is marked as PFAIL (probable failure)
- **Failover trigger** - PFAIL reports from a majority of masters within a `cluster-node-timeout * 2` window promote the state to FAIL, starting replica election
- **Replica validity** - Replicas disconnected longer than `cluster-node-timeout * cluster-replica-validity-factor` are excluded from failover elections

```text
# redis.conf
cluster-node-timeout 15000  # 15 seconds (default)
```

## Choosing the Right Value

A shorter timeout means faster failover but higher risk of false positives (flagging healthy nodes as failed during brief network hiccups).

A longer timeout means fewer false positives but slower recovery from real failures.

| Environment | Recommended Value | Reason |
| --- | --- | --- |
| LAN, stable network | 5000-10000 ms | Fast failover |
| WAN or cloud VMs | 15000-30000 ms | Avoid transient hiccups |
| Kubernetes pods | 10000-15000 ms | Allow pod restarts |

## Updating the Timeout

```text
# redis.conf
cluster-node-timeout 10000
```

Apply to a running cluster without restart:

```bash
# Apply to each node
for port in 7000 7001 7002 7003 7004 7005; do
  redis-cli -p $port CONFIG SET cluster-node-timeout 10000
done

# Verify
redis-cli -p 7000 CONFIG GET cluster-node-timeout
```

## Monitoring Node States

Use `CLUSTER NODES` to see the current state of all nodes:

```bash
redis-cli -p 7000 CLUSTER NODES
```

```text
a1b2c3... 192.168.1.10:7000@17000 master - 0 1700000000 1 connected 0-5460
d4e5f6... 192.168.1.11:7001@17001 master - 0 1700000001 2 connected 5461-10922
g7h8i9... 192.168.1.12:7002@17002 master,fail 1700000050 1700000040 3 connected 10923-16383
```

A node with `,fail` has exceeded the timeout and is being replaced by a replica election.

## Related: cluster-replica-validity-factor

This multiplier controls when a replica is considered too stale to participate in elections:

```text
# redis.conf
cluster-replica-validity-factor 10
```

A replica that has been disconnected for longer than `cluster-node-timeout * cluster-replica-validity-factor` will not attempt to become primary. With a 15-second timeout and factor of 10, a replica disconnected for more than 150 seconds will not start an election.

## Example: Measuring Failover Time

Test actual failover duration by killing a primary node and timing the recovery:

```bash
# Record start time and kill a primary
time redis-cli -p 7002 DEBUG SLEEP 30 &
sleep 1
redis-cli -p 7000 CLUSTER NODES | grep "7002"
```

You should see the node transition from `connected` to `pfail` to `fail` within the configured timeout, followed by replica promotion.

## Summary

`cluster-node-timeout` is the central timing parameter for Redis Cluster failure detection and failover. Set it lower (5-10 seconds) on stable LAN networks for faster recovery, and higher (15-30 seconds) in cloud or WAN environments to avoid false positive failures. Always apply the same value consistently across all cluster nodes for predictable behavior.
