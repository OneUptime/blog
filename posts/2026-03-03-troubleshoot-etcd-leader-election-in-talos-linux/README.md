# How to Troubleshoot etcd Leader Election in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Leader Election, Troubleshooting, Kubernetes

Description: Learn how to diagnose and fix etcd leader election issues in Talos Linux to maintain a stable and healthy Kubernetes cluster.

---

etcd uses the Raft consensus algorithm to maintain a consistent distributed state across cluster members. At the heart of Raft is leader election: one member is the leader that handles all write requests, and the others are followers that replicate data from the leader. When leader election goes wrong, the entire Kubernetes cluster feels the impact. On Talos Linux, diagnosing leader election issues requires using talosctl and Prometheus metrics since you cannot access the nodes directly.

## How Leader Election Works

In a healthy etcd cluster, one member holds the leader role for extended periods. The leader sends periodic heartbeats to followers. If a follower does not receive a heartbeat within the election timeout (typically around 1 second), it starts a new election by incrementing the raft term and requesting votes from other members.

A new leader is elected when a candidate receives votes from a majority of members. In a 3-member cluster, that means 2 out of 3. In a 5-member cluster, that means 3 out of 5.

Frequent leader elections are a sign of trouble. An occasional election after a node restart or network blip is normal, but more than one or two per hour in steady state means something is wrong.

## Checking Leader Status

Start by identifying the current leader and checking for recent elections:

```bash
# Check etcd status on all control plane nodes
talosctl -n 192.168.1.10,192.168.1.11,192.168.1.12 etcd status

# The output shows which member is the leader
# All members should agree on who the leader is

# Check the member list
talosctl -n 192.168.1.10 etcd members
```

If the status command shows different leaders for different members, or if no member claims to be the leader, you have a split-brain or quorum loss situation.

Using Prometheus metrics:

```promql
# Which member is the leader (1 = leader, 0 = follower)
etcd_server_is_leader

# Total leader changes seen by each member
etcd_server_leader_changes_seen_total

# Rate of leader changes per hour
increase(etcd_server_leader_changes_seen_total[1h])
```

## Common Cause 1: Network Issues

Network problems between etcd members are the most frequent cause of leader election issues. If the leader cannot send heartbeats to followers, or followers cannot reach the leader, elections get triggered.

```bash
# Check etcd logs for network-related errors
talosctl -n 192.168.1.10 logs etcd | grep -i "unreachable\|connection\|dial\|timeout"

# Look for specific heartbeat failures
talosctl -n 192.168.1.10 logs etcd | grep -i "failed to reach\|lost leader"

# Check network connectivity between nodes
talosctl -n 192.168.1.10 get addresses
talosctl -n 192.168.1.11 get addresses
```

Check Prometheus for peer network failures:

```promql
# Failed send operations between peers
rate(etcd_network_peer_sent_failures_total[5m])

# Round-trip time between peers
histogram_quantile(0.99,
  rate(etcd_network_peer_round_trip_time_seconds_bucket[5m])
)
```

If network latency between members is high (above 50ms), consider moving etcd members closer together or improving the network path.

## Common Cause 2: Disk I/O Bottlenecks

etcd writes to its write-ahead log (WAL) on every committed operation. If disk I/O is slow, the leader falls behind on processing requests and may miss sending heartbeats to followers, triggering an election.

```bash
# Check for disk-related warnings in etcd logs
talosctl -n 192.168.1.10 logs etcd | grep -i "slow fdatasync\|disk\|wal"
```

Check disk latency metrics:

```promql
# WAL fsync latency - high values indicate slow disks
histogram_quantile(0.99,
  rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])
)

# Backend commit latency
histogram_quantile(0.99,
  rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])
)
```

If WAL fsync consistently takes more than 10ms at P99, your storage is too slow for etcd. Solutions include:

- Moving to NVMe or SSD storage
- Using dedicated disks for etcd (not shared with other workloads)
- Ensuring your cloud provider volumes have sufficient IOPS

On Talos Linux, you can configure a dedicated disk for etcd in the machine config:

```yaml
# Dedicate a fast disk for etcd
machine:
  disks:
  - device: /dev/nvme0n1
    partitions:
    - mountpoint: /var/lib/etcd
      size: 20GB
```

## Common Cause 3: CPU Starvation

If the etcd process does not get enough CPU time, it cannot send heartbeats on schedule. This happens on undersized nodes or when other processes compete for CPU.

```bash
# Check CPU usage on the control plane node
talosctl -n 192.168.1.10 processes | head -20

# Look at etcd's CPU usage specifically
talosctl -n 192.168.1.10 processes | grep etcd
```

If the node is CPU-constrained, consider:

- Using larger instances for control plane nodes
- Reducing the number of non-essential pods on control plane nodes
- Tightening resource limits on other workloads to prevent CPU stealing

## Common Cause 4: Clock Skew

Raft relies on timeouts, which are sensitive to clock drift. If clocks between etcd members drift significantly, election behavior becomes unpredictable.

Talos Linux uses a time synchronization service, but verify it is working:

```bash
# Check time synchronization status
talosctl -n 192.168.1.10 time
talosctl -n 192.168.1.11 time
talosctl -n 192.168.1.12 time

# Compare timestamps across nodes - they should be within a few milliseconds
```

If time sync is broken, fix it in the Talos machine configuration:

```yaml
# Configure NTP servers
machine:
  time:
    servers:
      - time.cloudflare.com
      - pool.ntp.org
    bootTimeout: 2m0s
```

## Common Cause 5: Cluster Size Problems

A 2-member etcd cluster is inherently fragile. Losing one member means losing quorum because 2-member clusters need both members to agree. This is worse than a single-member cluster, which at least does not need consensus.

Always run etcd with an odd number of members: 1 (development), 3 (production), or 5 (large-scale production).

```bash
# Verify you have the right number of members
talosctl -n 192.168.1.10 etcd members

# If you see an even number, add or remove a member
```

## Adjusting Election Timeouts

If you are seeing elections due to brief network hiccups, you can increase the heartbeat interval and election timeout. However, this increases the time it takes to detect a genuinely failed leader, so adjust carefully:

```yaml
# Talos machine config patch
cluster:
  etcd:
    extraArgs:
      # Default heartbeat is 100ms
      heartbeat-interval: "200"
      # Default election timeout is 1000ms (1 second)
      election-timeout: "2000"
```

The election timeout should be at least 5x the round-trip time between etcd members and at least 5x the heartbeat interval.

## Recovering from a Split-Brain

In rare cases, a network partition can cause a split-brain where two parts of the cluster each elect their own leader. When the partition heals, one side will step down, but there might be data inconsistency.

```bash
# Check if members disagree on the leader
talosctl -n 192.168.1.10 etcd status
talosctl -n 192.168.1.11 etcd status
talosctl -n 192.168.1.12 etcd status

# If members report different leaders:
# 1. The minority side should have been read-only during the partition
# 2. After the partition heals, Raft will reconcile
# 3. Monitor logs for convergence
talosctl -n 192.168.1.10 logs etcd -f | grep -i "leader\|election\|campaign"
```

## Setting Up Alerts

Create alerts for leader election anomalies:

```yaml
# leader-election-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-leader-alerts
  namespace: monitoring
spec:
  groups:
  - name: etcd-leader
    rules:
    - alert: EtcdFrequentLeaderChanges
      expr: increase(etcd_server_leader_changes_seen_total[1h]) > 3
      labels:
        severity: critical
      annotations:
        summary: "etcd leader changed more than 3 times in the past hour"

    - alert: EtcdNoLeader
      expr: etcd_server_has_leader == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "etcd member reports no leader"

    - alert: EtcdHighProposalFailRate
      expr: rate(etcd_server_proposals_failed_total[5m]) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "etcd is experiencing frequent proposal failures"
```

## Summary

etcd leader election issues in Talos Linux typically stem from network problems, slow disks, CPU starvation, or clock skew. Use talosctl and Prometheus to diagnose the root cause. Focus on keeping network latency low between members, using fast dedicated storage, ensuring adequate CPU resources, and running an odd number of members. With proper monitoring and alerts, you can catch election instability early and address it before it impacts your Kubernetes workloads.
