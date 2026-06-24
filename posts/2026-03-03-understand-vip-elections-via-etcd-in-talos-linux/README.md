# How to Understand VIP Elections via etcd in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VIP, etcd, Leader Election, High Availability, Kubernetes

Description: In-depth explanation of how Talos Linux uses etcd leader election to manage Virtual IP ownership and coordinate VIP failover across control plane nodes.

---

The Virtual IP (VIP) feature in Talos Linux relies on etcd for coordinating which control plane node owns the VIP at any given time. Understanding this election mechanism helps you predict failover behavior, diagnose VIP problems, and make informed decisions about your cluster's high availability setup.

This guide digs into the details of how VIP elections work through etcd in Talos Linux.

## The Role of etcd in VIP Management

etcd is the distributed key-value store that Kubernetes uses for all cluster data. In Talos Linux, etcd also serves as the coordination mechanism for VIP ownership. This is a natural choice because etcd is already running on every control plane node and provides the consistency guarantees needed for leader election.

The VIP election uses etcd's concurrency election mechanism, backed by leases. It works like a distributed leadership primitive with an expiration timer. Only one node can be the election leader (and therefore hold the VIP) at a time, and that leadership expires if the holder fails to keep its etcd session alive.

## How the Election Process Works

Here is the step-by-step process of a VIP election:

### Initial Election

1. When a control plane node starts, the Talos network operator detects VIP configuration in the machine config
2. The node connects to the local etcd instance
3. The node creates an etcd concurrency session backed by a lease
4. The node campaigns in an etcd election under the VIP election key prefix
5. The first eligible campaigner becomes the election leader
6. The winning node assigns the VIP to its network interface
7. The winning node sends a gratuitous ARP to announce the VIP

```bash
# Observe the election result by checking which node has the VIP

for node in <cp1> <cp2> <cp3>; do
  echo -n "$node: "
  talosctl -n $node get addresses 2>/dev/null | grep "<vip>" || echo "standby"
done
```

### Lease Renewal

The VIP owner must continuously renew its etcd lease to maintain ownership:

1. The owner sends periodic lease renewal requests to etcd
2. Each successful renewal resets the lease TTL
3. Other nodes remain blocked in the election or observe the current leader
4. As long as renewals succeed, the VIP stays on the current owner

The renewal interval is shorter than the lease TTL, providing a buffer for temporary network hiccups or etcd latency.

### Failover Election

When the VIP owner fails:

1. The failed node stops renewing its etcd lease
2. The lease TTL counts down to zero
3. etcd automatically revokes the expired lease
4. The failed node's election key is deleted
5. Waiting campaigners detect the election key deletion through etcd watches
6. The next eligible campaigner becomes the new election leader
7. The new leader becomes the new VIP owner
8. The new owner assigns the VIP and sends gratuitous ARP

```bash
# Monitor etcd during a failover
talosctl -n <surviving-node> logs etcd --tail=50 --follow
```

## The etcd Lease Mechanism

etcd leases are the foundation of the VIP election. Here is how they work conceptually:

```text
# Simplified lease flow

Node A creates an etcd session lease -> etcd grants lease (ID: abc123)
Node A campaigns under talos:v1:vip:election:<vip>/... with lease abc123 -> Node A owns VIP
Node B campaigns under the same election prefix with its own lease -> waits
Node C campaigns under the same election prefix with its own lease -> waits

etcd keep-alives renew lease abc123 -> etcd refreshes the session TTL

# If Node A fails:
the session TTL passes without renewal -> etcd revokes lease abc123
Node A's election key is automatically deleted
Node B becomes the next election leader -> Node B now owns VIP
Node C continues waiting
```

The exact election key suffix and TTL values are internal to Talos and the etcd client, but the mechanism follows this pattern.

## etcd Quorum Requirements

VIP elections depend on etcd quorum. Quorum means a majority of etcd members must be available:

| Control Plane Nodes | Quorum | Can Tolerate Failures |
|-------------------|--------|----------------------|
| 1 | 1 | 0 |
| 2 | 2 | 0 |
| 3 | 2 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

This is why three control plane nodes is the minimum recommended configuration. With two nodes, losing one means losing quorum, and the VIP cannot fail over.

```bash
# Check etcd member health
talosctl -n <node-ip> get etcdmembers

# Check etcd alarms (indicates problems)
talosctl -n <node-ip> etcd alarm list
```

## What Happens During etcd Problems

### etcd Quorum Lost

If etcd loses quorum (majority of members are down), no VIP election can occur:

- If the current VIP owner remains healthy but the cluster has no quorum, it cannot keep the VIP indefinitely because the etcd session cannot be maintained
- If the current VIP owner is the one that went down, VIP cannot fail over
- The surviving nodes cannot elect a new VIP owner without quorum

```bash
# Diagnose quorum loss
talosctl -n <surviving-node> get etcdmembers
# You will see unhealthy members listed

talosctl -n <surviving-node> logs etcd | grep -i "quorum\|leader\|election"
```

### etcd Leader Change

etcd itself has its own leader election (separate from VIP election). When the etcd leader changes:

- VIP ownership is not necessarily affected
- The VIP lease may be renewed slightly slower during the transition
- As long as the lease renewal succeeds before the TTL expires, the VIP stays on its current owner

### etcd High Latency

If etcd is experiencing high latency (due to slow disks, network issues, or high load):

- Lease renewals may take longer than expected
- If a renewal times out, the lease may expire prematurely
- This can cause unexpected VIP movement

```bash
# Check etcd latency
talosctl -n <node-ip> logs etcd | grep -i "slow\|latency\|took too long"
```

## Debugging Election Issues

### VIP Not Being Elected

```bash
# Check if etcd is healthy
talosctl -n <node-ip> service etcd
talosctl -n <node-ip> get etcdmembers

# Check controller-runtime logs for VIP-related messages
talosctl -n <node-ip> logs controller-runtime | grep -i "vip\|shared IP\|etcd session"

# Check whether the VIP address is present on any control plane node
for node in <cp1> <cp2> <cp3>; do
  talosctl -n $node get addresses 2>/dev/null | grep "<vip>" || true
done
```

### VIP Flapping Between Nodes

If the VIP keeps moving between nodes rapidly, the likely cause is etcd instability:

```bash
# Check etcd performance
talosctl -n <node-ip> logs etcd | grep -i "slow\|heartbeat\|election"

# Monitor VIP movement over time
while true; do
  for node in <cp1> <cp2> <cp3>; do
    talosctl -n $node get addresses 2>/dev/null | grep -q "<vip>" && echo "$(date): VIP on $node"
  done
  sleep 2
done
```

Common causes of VIP flapping:

- Slow disk I/O on etcd nodes (etcd is very I/O sensitive)
- Network instability between control plane nodes
- etcd memory pressure causing garbage collection pauses
- CPU contention affecting lease renewal timing

### Fixing Slow etcd Performance

etcd performance directly affects VIP stability. The most common fix is ensuring etcd runs on fast storage:

```yaml
# Install Talos on fast storage so etcd uses fast local storage
machine:
  install:
    disk: /dev/sda
```

Other performance tips:

```bash
# Check disk I/O latency
talosctl -n <node-ip> dmesg | grep -i "io\|disk\|slow"

# Check etcd WAL fsync times
talosctl -n <node-ip> logs etcd | grep "took too long"
```

## VIP Election and Network Partitions

Network partitions create interesting scenarios for VIP elections:

### Scenario: Two control plane nodes can reach etcd but not the third

The two nodes that can communicate maintain etcd quorum (2 out of 3). The VIP election works normally among these two nodes. The isolated node remains an etcd member, but it cannot maintain a healthy etcd session with quorum and cannot hold or obtain the VIP.

### Scenario: All three nodes partitioned from each other

No node has etcd quorum. The current VIP owner cannot keep its etcd election session healthy. Eventually the session is lost or the lease expires, and no new election can occur. All three nodes end up without the VIP.

### Scenario: Two partitions (1 node vs 2 nodes)

The partition with 2 nodes has quorum and operates normally. The single node loses quorum and cannot hold or obtain the VIP.

## The Relationship Between etcd Leader and VIP Owner

An important distinction: the etcd leader and the VIP owner are not necessarily the same node. etcd has its own internal leader election using the Raft consensus protocol, which determines which etcd member handles write operations. The VIP election is a separate process that uses etcd as a coordination service.

It is entirely normal and expected for:
- Node A to be the etcd leader
- Node B to be the VIP owner

```bash
# Check etcd leader
talosctl -n <node-ip> get etcdmembers -o yaml | grep -i "leader"

# Check VIP owner
for n in <cp1> <cp2> <cp3>; do
  talosctl -n $n get addresses 2>/dev/null | grep -q "<vip>" && echo "VIP: $n"
done
```

## Best Practices

1. **Use three control plane nodes minimum**: This is the most important thing for reliable VIP elections.

2. **Fast storage for etcd**: Use SSDs or NVMe drives. Slow disks cause etcd latency, which causes lease renewal delays, which causes VIP instability.

3. **Stable network between control plane nodes**: Network jitter or packet loss between etcd members can disrupt lease renewals.

4. **Monitor etcd health**: Set up alerting on etcd member health and latency metrics.

5. **Do not overload control plane nodes**: If control plane nodes are also running heavy workloads, etcd performance may suffer, affecting VIP stability.

## Conclusion

The VIP election mechanism in Talos Linux is built on etcd's proven lease and election primitives. It is simple and reliable when etcd and the local control plane health checks are healthy, which means keeping etcd healthy is the single most important thing you can do for VIP stability. Use three or more control plane nodes, give etcd fast storage, maintain stable networking between nodes, and monitor etcd health metrics. When VIP problems occur, the first place to look is always etcd and the Talos controller-runtime logs.
