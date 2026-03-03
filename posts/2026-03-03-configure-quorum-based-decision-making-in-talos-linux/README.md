# How to Configure Quorum-Based Decision Making in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Quorum, etcd, Consensus, High Availability, Kubernetes

Description: Understand and configure quorum-based decision making in Talos Linux clusters to ensure consistent and reliable cluster state management.

---

Quorum-based decision making is the mechanism that allows distributed systems to maintain consistency even when some nodes fail. In a Talos Linux cluster, quorum is primarily governed by etcd, the distributed key-value store that holds all Kubernetes cluster state. Understanding quorum is essential for making informed decisions about cluster sizing, handling failures, and performing maintenance operations safely.

This guide explains how quorum works in Talos Linux, how to configure it for your requirements, and how to operate your cluster in a way that always maintains quorum.

## What Is Quorum?

Quorum is the minimum number of members that must agree for a decision to be valid. In etcd, which uses the Raft consensus algorithm, quorum is defined as a strict majority of cluster members:

```text
Quorum = (N / 2) + 1

Where N is the total number of etcd members:
- 1 member: quorum = 1 (no fault tolerance)
- 3 members: quorum = 2 (tolerates 1 failure)
- 5 members: quorum = 3 (tolerates 2 failures)
- 7 members: quorum = 4 (tolerates 3 failures)
```

This means with a 3-node control plane, if 2 nodes are healthy, the cluster continues operating. If 2 nodes fail, the remaining single node cannot form quorum and the cluster becomes read-only.

## Why Quorum Matters

Without quorum, etcd refuses to process write operations. This means:

- No new pods can be scheduled
- No deployments can be updated
- No services can be created or modified
- No configuration changes can be applied
- Existing running workloads continue operating (data plane is independent)

Quorum prevents split-brain scenarios where two groups of nodes independently make conflicting decisions about the cluster state.

## Choosing Your Cluster Size

The number of control plane nodes directly determines your quorum requirements:

```text
Nodes | Quorum | Fault Tolerance | Recommended For
------+--------+-----------------+------------------
  1   |   1    |       0         | Development only
  3   |   2    |       1         | Most production clusters
  5   |   3    |       2         | Critical production clusters
  7   |   4    |       3         | Rarely needed
```

Three nodes is the sweet spot for most production deployments. Five nodes are justified when you need to tolerate simultaneous failures during maintenance windows (for example, upgrading one node while another unexpectedly fails).

Going beyond five nodes is generally not recommended because each additional etcd member increases the latency of write operations since more members need to acknowledge each write.

## Configuring etcd for Quorum Management

Talos Linux configures etcd through the machine configuration. Here are the settings that affect quorum behavior:

```yaml
# quorum-config-patch.yaml
cluster:
  etcd:
    extraArgs:
      # How often the leader sends heartbeats to followers
      heartbeat-interval: "500"

      # How long a follower waits before triggering a new election
      # Must be at least 5x heartbeat-interval
      election-timeout: "5000"

      # Number of committed transactions to trigger a snapshot
      snapshot-count: "10000"

      # Maximum number of inflight requests
      max-request-bytes: "1572864"

      # Automatic compaction to manage database size
      auto-compaction-mode: periodic
      auto-compaction-retention: "5m"

      # Log level for debugging quorum issues
      log-level: "warn"
```

Apply this to all control plane nodes:

```bash
talosctl apply-config --patch @quorum-config-patch.yaml \
  --nodes 192.168.1.10,192.168.1.11,192.168.1.12
```

## Monitoring Quorum Health

Set up monitoring to detect quorum issues before they cause problems:

```bash
# Check etcd member list and their status
talosctl etcd members --nodes 192.168.1.10

# Check etcd health including leader information
talosctl etcd status --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# Run a full health check
talosctl health --nodes 192.168.1.10
```

Create Prometheus alerts for quorum-related metrics:

```yaml
# quorum-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-quorum-alerts
  namespace: monitoring
spec:
  groups:
    - name: etcd-quorum
      rules:
        # Alert when etcd cluster size drops below quorum threshold
        - alert: EtcdQuorumLost
          expr: count(etcd_server_has_leader == 1) < 2
          for: 10s
          labels:
            severity: critical
          annotations:
            summary: "etcd cluster has lost quorum"
            description: "Fewer than 2 etcd members have a leader. Cluster writes are blocked."

        # Alert when cluster is at minimum quorum (one failure away from losing quorum)
        - alert: EtcdQuorumAtRisk
          expr: count(etcd_server_has_leader == 1) == 2 and count(up{job="etcd"}) == 3
          for: 30s
          labels:
            severity: warning
          annotations:
            summary: "etcd quorum is at minimum - one more failure will cause outage"

        # Alert on frequent leader elections (sign of instability)
        - alert: EtcdFrequentLeaderElections
          expr: increase(etcd_server_leader_changes_seen_total[1h]) > 3
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Frequent etcd leader elections detected"

        # Alert when etcd database is getting large
        - alert: EtcdDatabaseSizeLarge
          expr: etcd_mvcc_db_total_size_in_bytes > 6e+09
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "etcd database size exceeds 6GB"
```

## Safe Maintenance Operations

When performing maintenance on control plane nodes, always maintain quorum. Never take down more than one control plane node at a time in a 3-node cluster:

```bash
# Correct: upgrade nodes one at a time
# Step 1: Upgrade cp-1
talosctl upgrade --nodes 192.168.1.10 --image ghcr.io/siderolabs/installer:v1.7.0

# Step 2: Wait for cp-1 to fully rejoin
talosctl etcd members --nodes 192.168.1.11
# Verify all 3 members are healthy before proceeding

# Step 3: Upgrade cp-2
talosctl upgrade --nodes 192.168.1.11 --image ghcr.io/siderolabs/installer:v1.7.0

# Step 4: Wait for cp-2 to rejoin, then upgrade cp-3
talosctl etcd members --nodes 192.168.1.10
talosctl upgrade --nodes 192.168.1.12 --image ghcr.io/siderolabs/installer:v1.7.0
```

For a 5-node cluster, you can upgrade two nodes simultaneously since 3 remaining nodes still form quorum. But this requires care:

```bash
# With 5 nodes, upgrade 2 at a time (carefully)
# Only proceed if all 5 members are healthy first
talosctl etcd members --nodes 192.168.1.10

# Upgrade two nodes in parallel
talosctl upgrade --nodes 192.168.1.10 --image ghcr.io/siderolabs/installer:v1.7.0 &
talosctl upgrade --nodes 192.168.1.11 --image ghcr.io/siderolabs/installer:v1.7.0 &
wait

# Wait for both to rejoin before continuing
talosctl etcd members --nodes 192.168.1.12
```

## Handling Quorum Loss

If quorum is lost (for example, 2 of 3 nodes failed simultaneously), the remaining node cannot process writes. Here is how to recover:

### Option 1: Bring Back a Failed Node

The fastest recovery is to bring back at least one of the failed nodes:

```bash
# Try to reboot the failed node
talosctl reboot --nodes 192.168.1.11

# If it comes back, quorum is restored automatically
talosctl etcd members --nodes 192.168.1.10
```

### Option 2: Remove Failed Members

If nodes cannot be recovered, remove them from the etcd cluster. This requires using the etcd unsafe member removal:

```bash
# On the surviving node, check member IDs
talosctl etcd members --nodes 192.168.1.10

# Remove the failed members (this is a disruptive operation)
talosctl etcd remove-member --nodes 192.168.1.10 <failed-member-id-1>
talosctl etcd remove-member --nodes 192.168.1.10 <failed-member-id-2>

# The surviving single-node etcd cluster can now accept writes
# Add replacement nodes to restore redundancy
```

### Option 3: Restore from Backup

If all nodes are lost:

```bash
# Bootstrap a new cluster from etcd snapshot
talosctl bootstrap --recover-from=/path/to/snapshot --nodes 192.168.1.10
```

## Quorum in Kubernetes Leader Election

Beyond etcd, Kubernetes components use lease-based leader election that depends on etcd quorum. The controller manager and scheduler both have only one active instance at a time:

```bash
# Check current leaders
kubectl get lease -n kube-system

# View leader election details
kubectl get lease kube-controller-manager -n kube-system -o yaml
kubectl get lease kube-scheduler -n kube-system -o yaml
```

These leases are stored in etcd, so they depend on etcd quorum. When etcd quorum is lost, leader election cannot renew leases, and the active leader eventually steps down.

## Testing Quorum Boundaries

Regularly test your cluster's behavior at quorum boundaries:

```bash
# Test with one node down (should still work)
talosctl shutdown --nodes 192.168.1.12
kubectl create deployment test-quorum --image=nginx
kubectl delete deployment test-quorum
talosctl boot --nodes 192.168.1.12

# Verify recovery
talosctl etcd members --nodes 192.168.1.10
```

## Conclusion

Quorum-based decision making is fundamental to the reliability of your Talos Linux cluster. By understanding how quorum works, sizing your cluster appropriately, monitoring etcd health, and following safe maintenance procedures, you can operate a cluster that maintains consistency even through node failures. The key rules are simple: always maintain a majority of etcd members, never take down more nodes than your fault tolerance allows, and always verify quorum is healthy before and after maintenance operations.
