# How to Handle Control Plane Failover in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Control Plane, Failover, High Availability, Kubernetes, etcd

Description: Understand and manage control plane failover in Talos Linux clusters, including etcd leader election, API server failover, and recovery procedures.

---

Control plane failover is the process by which your Kubernetes cluster continues operating when one or more control plane nodes become unavailable. In a properly configured Talos Linux cluster with multiple control plane nodes, failover happens automatically. But understanding how it works, what to expect during failover events, and how to recover afterward is essential knowledge for any cluster administrator. This guide digs into the mechanics of control plane failover in Talos Linux and provides practical procedures for handling various failure scenarios.

## How Control Plane Failover Works

When a control plane node fails, several things happen in sequence:

1. **etcd detects the member is unreachable** - The remaining etcd members notice missed heartbeats after the configured heartbeat timeout.
2. **etcd elects a new leader** - If the failed node was the etcd leader, a new leader election occurs among the remaining members.
3. **API server requests are redirected** - The load balancer or VIP detects the failed node's health check failure and routes traffic to healthy nodes.
4. **Controller manager and scheduler failover** - These components use Kubernetes leader election leases. When the lease expires (typically 15 seconds), a standby instance takes over.

The entire failover process typically completes within 30-60 seconds, during which API requests may briefly fail but running workloads continue operating normally.

## Configuring Failover Timeouts

Talos Linux lets you tune the failover behavior through machine configuration:

```yaml
# failover-config-patch.yaml
cluster:
  etcd:
    extraArgs:
      # Time between heartbeats (milliseconds)
      heartbeat-interval: "500"
      # Time to wait before triggering a leader election (milliseconds)
      election-timeout: "5000"

  apiServer:
    extraArgs:
      # Lease duration for leader election
      leader-elect-lease-duration: "15s"
      # Time between leader renewal attempts
      leader-elect-renew-deadline: "10s"
      # Time between leader election retries
      leader-elect-retry-period: "2s"

  controllerManager:
    extraArgs:
      leader-elect-lease-duration: "15s"
      leader-elect-renew-deadline: "10s"
      leader-elect-retry-period: "2s"
      # Faster node monitoring for quicker pod eviction
      node-monitor-period: "5s"
      node-monitor-grace-period: "20s"

  scheduler:
    extraArgs:
      leader-elect-lease-duration: "15s"
      leader-elect-renew-deadline: "10s"
      leader-elect-retry-period: "2s"
```

The election timeout must be at least 5 times the heartbeat interval. For cross-zone deployments with higher latency, increase both values proportionally.

## VIP Failover with Talos

If you are using Talos's built-in VIP feature, failover is handled through a lightweight election protocol among control plane nodes:

```yaml
# VIP configuration in machine config
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
        vip:
          ip: 192.168.1.100
          # The VIP will float to a healthy node
```

When the node holding the VIP fails, another control plane node claims it within seconds. You can monitor VIP ownership:

```bash
# Check which node holds the VIP
talosctl get addresses --nodes 192.168.1.10,192.168.1.11,192.168.1.12 | grep 192.168.1.100
```

## Handling Different Failure Scenarios

### Scenario 1: Single Control Plane Node Failure

This is the most common scenario. With three control plane nodes, losing one is handled automatically:

```bash
# Node cp-2 has failed. Verify cluster health:
talosctl etcd members --nodes 192.168.1.10

# Check that API server is responding
kubectl get nodes

# Check etcd health
talosctl etcd status --nodes 192.168.1.10,192.168.1.12
```

The cluster continues operating normally. Repair or replace the failed node as soon as practical.

### Scenario 2: etcd Leader Failure

When the etcd leader fails, election takes slightly longer because the remaining members need to agree on a new leader:

```bash
# Check the current etcd leader
talosctl etcd status --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# After leader failure, verify new leader election
talosctl etcd status --nodes 192.168.1.10,192.168.1.12
```

During leader election (typically 5-10 seconds), all write operations to etcd are paused. Read operations may also fail briefly. The API server retries automatically.

### Scenario 3: Network Partition

A network partition can split the cluster into groups that cannot communicate:

```bash
# Check if you can reach all nodes
talosctl -n 192.168.1.10 version
talosctl -n 192.168.1.11 version
talosctl -n 192.168.1.12 version
```

The group with etcd majority (2 out of 3 nodes) continues operating. The isolated node(s) will see etcd errors and their local API server will stop serving requests. When the partition heals, the isolated nodes automatically rejoin.

### Scenario 4: Two Nodes Fail Simultaneously

With three control plane nodes, losing two means losing etcd quorum. The cluster becomes read-only at the etcd level:

```bash
# If only one node remains, etcd is in read-only mode
# Verify the situation
talosctl etcd status --nodes 192.168.1.10

# API server may report errors
kubectl get nodes
```

This is a critical situation. Your running workloads continue operating but no new scheduling or state changes can occur. Recovery requires either bringing back at least one failed node or performing etcd disaster recovery.

## Recovery Procedures

### Recovering a Failed Node

If the node comes back online (after a reboot, hardware fix, etc.), it automatically rejoins:

```bash
# After the node restarts, check that it rejoined etcd
talosctl etcd members --nodes 192.168.1.100

# Verify the node is Ready in Kubernetes
kubectl get nodes
```

### Replacing a Failed Node

If the node cannot be recovered, replace it:

```bash
# Remove the old etcd member
talosctl etcd remove-member --nodes 192.168.1.10 <failed-member-id>

# Apply config to the replacement node
talosctl apply-config --insecure --nodes 192.168.1.14 \
  --file _out/controlplane.yaml \
  --config-patch @cp-common-patch.yaml
```

The new node automatically joins the etcd cluster and begins participating as a control plane member.

### Disaster Recovery from etcd Snapshot

If all control plane nodes are lost, recover from a backup:

```bash
# On a new node, bootstrap from the etcd snapshot
talosctl bootstrap --nodes 192.168.1.10 \
  --recover-from=/path/to/etcd-snapshot.db
```

This restores the cluster state from the snapshot. Any changes made after the snapshot was taken will be lost.

## Automating Failover Response

Set up alerts and automated response for failover events:

```yaml
# failover-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: control-plane-failover
  namespace: monitoring
spec:
  groups:
    - name: failover
      rules:
        - alert: ControlPlaneNodeDown
          expr: |
            kube_node_status_condition{
              condition="Ready",
              status="true",
              node=~"cp-.*"
            } == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Control plane node {{ $labels.node }} is down"
            runbook: "Check node health, verify etcd quorum, prepare replacement if needed"

        - alert: EtcdQuorumAtRisk
          expr: |
            count(etcd_server_has_leader == 1) < 2
          for: 30s
          labels:
            severity: critical
          annotations:
            summary: "etcd quorum is at risk - fewer than 2 healthy members"

        - alert: LeaderElectionDuration
          expr: |
            rate(leader_election_master_status[5m]) > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Frequent leader elections detected"
```

## Testing Failover

Regularly test your failover procedures:

```bash
# Test 1: Graceful control plane node reboot
talosctl reboot --nodes 192.168.1.11
# Verify cluster remains available during reboot
kubectl get nodes -w

# Test 2: Simulate sudden failure (shutdown without drain)
talosctl shutdown --nodes 192.168.1.11
# Monitor failover
kubectl get events -A --watch

# Test 3: Verify recovery after bringing node back
talosctl boot --nodes 192.168.1.11
# Verify the node rejoins
talosctl etcd members --nodes 192.168.1.10
```

## Performance During Failover

During a control plane failover, you can expect:

- **Running pods** continue operating normally
- **New pod creation** pauses for 30-60 seconds
- **kubectl commands** may timeout briefly
- **Service discovery** continues working (CoreDNS uses cached data)
- **Ingress** continues routing to existing pods

The key takeaway is that the data plane (running workloads) is independent of the control plane. Even during a complete control plane outage, existing pods continue running and serving traffic.

## Conclusion

Control plane failover in Talos Linux is largely automatic, but understanding the mechanics helps you prepare for various failure scenarios and recover quickly when things go wrong. By tuning timeouts, setting up proper monitoring, regularly testing failover, and having clear recovery procedures, you can handle control plane failures with confidence. The immutable nature of Talos Linux means every control plane node is identical, which simplifies replacement and eliminates the risk of configuration inconsistencies during recovery.
