# How to Handle Split-Brain Scenarios in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Split Brain, High Availability, etcd, Kubernetes, Networking

Description: Learn how to prevent, detect, and recover from split-brain scenarios in Talos Linux clusters where network partitions create isolated node groups.

---

A split-brain scenario occurs when a network partition divides your cluster into two or more groups of nodes that can communicate within their group but not across groups. Each group may believe it is the sole surviving portion of the cluster and attempt to operate independently, potentially leading to conflicting state changes and data corruption. In a Talos Linux cluster, the primary risk is with etcd, which uses quorum to prevent exactly this kind of problem. But understanding the full picture, including application-level split-brain risks, is critical for operating a reliable cluster.

This guide covers how split-brain happens, how Talos Linux and Kubernetes protect against it, and what to do when it occurs.

## How Split-Brain Happens

Split-brain is caused by network partitions. Common causes include:

- Switch or router failure that isolates one rack from another
- Firewall misconfiguration that blocks traffic between nodes
- Cable failure (physical or virtual network disconnection)
- Cloud provider network issues between availability zones
- Software bugs in the network stack

In a 3-node control plane cluster, a partition might split nodes into groups of 2+1 or 1+1+1. The behavior depends on which group has etcd quorum.

## etcd's Protection Against Split-Brain

etcd's Raft consensus algorithm is specifically designed to prevent split-brain. Here is how it works:

```
Scenario: 3-node cluster partitioned into 2+1

Group A (2 nodes): Has quorum (2 >= 2)
  - Can elect a leader
  - Can process read and write operations
  - Continues normal operation

Group B (1 node): Does NOT have quorum (1 < 2)
  - Cannot elect a leader
  - Rejects all write operations
  - May serve stale reads (if leader lease has not expired)
  - API server on this node returns errors
```

This guarantees that only one group can make authoritative changes to the cluster state. The partition might cause unavailability on the minority side, but it prevents data inconsistency.

## Verifying etcd Quorum During a Partition

If you suspect a network partition:

```bash
# Check etcd status from different nodes
talosctl etcd status --nodes 192.168.1.10
talosctl etcd status --nodes 192.168.1.11
talosctl etcd status --nodes 192.168.1.12

# Check etcd member connectivity
talosctl etcd members --nodes 192.168.1.10

# On the majority side, you should see a healthy cluster
# On the minority side, you will see errors or missing members
```

From the Kubernetes perspective:

```bash
# Nodes in the minority partition will show as NotReady
kubectl get nodes

# Check node conditions for network-related issues
kubectl describe node <node-name> | grep -A 5 "Conditions"
```

## Application-Level Split-Brain Risks

While etcd prevents control-plane split-brain, applications can still experience split-brain at the data level. Consider this scenario:

```
Before partition:
  - PostgreSQL primary on Node A (Zone 1)
  - PostgreSQL replica on Node B (Zone 2)
  - Application pods in both zones

During partition:
  - Zone 1: Application writes to primary (normal)
  - Zone 2: Application cannot reach primary
    - If using auto-failover (Patroni), replica may be promoted
    - Now TWO primaries exist (split-brain)
```

To prevent application-level split-brain:

### Fencing with Kubernetes Leases

Use Kubernetes leases for distributed locking. Since leases are stored in etcd, they respect quorum:

```yaml
# leader-lease-check.yaml
apiVersion: coordination.k8s.io/v1
kind: Lease
metadata:
  name: app-leader
  namespace: default
spec:
  holderIdentity: "pod-primary"
  leaseDurationSeconds: 15
  renewTime: "2024-01-01T00:00:00Z"
```

Applications should check the lease before performing critical operations:

```python
# Check Kubernetes lease before processing
from kubernetes import client, config

config.load_incluster_config()
v1 = client.CoordinationV1Api()

def am_i_leader(pod_name, namespace="default"):
    try:
        lease = v1.read_namespaced_lease("app-leader", namespace)
        return lease.spec.holder_identity == pod_name
    except Exception:
        # If we cannot reach the API server, assume we are not the leader
        return False
```

### Database Fencing with Patroni

Patroni uses etcd for leader election, so it naturally respects quorum:

```yaml
# patroni-config with proper fencing
bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    master_start_timeout: 300
    postgresql:
      use_pg_rewind: true
      parameters:
        synchronous_commit: "on"
        synchronous_standby_names: "*"
```

The `synchronous_commit: "on"` setting ensures that writes are confirmed on the replica before being acknowledged to the client. This prevents data loss during failover but increases write latency.

## Detecting Split-Brain

Set up monitoring to detect network partitions early:

```yaml
# split-brain-detection.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: split-brain-detection
spec:
  groups:
    - name: split-brain
      rules:
        # Detect when nodes cannot communicate
        - alert: NodeNetworkPartition
          expr: |
            kube_node_status_condition{condition="Ready", status="true"} == 0
            and
            kube_node_status_condition{condition="NetworkUnavailable", status="true"} == 1
          for: 30s
          labels:
            severity: critical
          annotations:
            summary: "Possible network partition affecting {{ $labels.node }}"

        # Detect etcd communication failures
        - alert: EtcdPeerCommunicationFailure
          expr: |
            increase(etcd_server_proposals_failed_total[5m]) > 5
          labels:
            severity: warning
          annotations:
            summary: "etcd proposal failures indicate possible partition"

        # Detect when etcd members disagree on the leader
        - alert: EtcdLeaderDisagreement
          expr: |
            count(count by (leader_id) (etcd_server_is_leader == 0)) > 1
          labels:
            severity: critical
          annotations:
            summary: "etcd members report different leaders - possible split-brain"
```

## Network Partition Prevention

While you cannot completely prevent network partitions, you can reduce their likelihood:

### Redundant Network Paths

Configure Talos Linux with bonded network interfaces:

```yaml
# bond-config.yaml
machine:
  network:
    interfaces:
      - interface: bond0
        bond:
          mode: 802.3ad
          lacpRate: fast
          interfaces:
            - eth0
            - eth1
        dhcp: true
        vip:
          ip: 192.168.1.100
```

### Network Health Monitoring

Deploy continuous network testing between nodes:

```yaml
# network-health-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: network-health
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: network-health
  template:
    metadata:
      labels:
        app: network-health
    spec:
      containers:
        - name: checker
          image: alpine:latest
          command:
            - sh
            - -c
            - |
              apk add --no-cache curl
              while true; do
                for node in $(getent hosts kubernetes.default.svc); do
                  if ! curl -sk --connect-timeout 2 https://kubernetes.default.svc/healthz > /dev/null 2>&1; then
                    echo "$(date) WARN: Cannot reach API server"
                  fi
                done
                sleep 5
              done
```

## Recovering from Split-Brain

When a network partition heals, the minority side needs to resynchronize:

### Automatic Recovery

In most cases, recovery is automatic:

```bash
# After network is restored, check etcd members
talosctl etcd members --nodes 192.168.1.10

# Verify all members are connected and in sync
talosctl etcd status --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# Check that all nodes show as Ready
kubectl get nodes
```

etcd automatically brings the previously-isolated member up to date through log replication.

### Manual Recovery

If automatic recovery fails (for example, the isolated node's etcd data has diverged too much):

```bash
# Remove the problematic member
talosctl etcd remove-member --nodes 192.168.1.10 <member-id>

# Reset the node
talosctl reset --nodes 192.168.1.12 --graceful

# Re-apply the configuration to rejoin
talosctl apply-config --insecure --nodes 192.168.1.12 \
  --file _out/controlplane.yaml
```

### Application Data Reconciliation

For applications that experienced data divergence during the partition, you need application-specific recovery:

```bash
# For PostgreSQL with Patroni, check replication status
kubectl exec postgres-ha-0 -- patronictl list

# If a former primary has conflicting data, reinitialize it
kubectl exec postgres-ha-1 -- patronictl reinit postgres-ha postgres-ha-1
```

## Best Practices Summary

1. Always use an odd number (3 or 5) of control plane nodes
2. Distribute control plane nodes across different failure domains
3. Use bonded network interfaces where possible
4. Configure applications to use Kubernetes leases for leader election
5. Use synchronous replication for critical databases
6. Monitor for early signs of network issues
7. Test partition recovery procedures regularly
8. Document application-specific split-brain recovery steps

## Conclusion

Split-brain scenarios are one of the most dangerous failure modes in distributed systems, but Talos Linux and Kubernetes provide strong protections through etcd's quorum-based consensus. The key is understanding that while the control plane is protected by design, applications need their own split-brain prevention mechanisms. By combining proper cluster sizing, network redundancy, application-level fencing, and comprehensive monitoring, you can build a Talos Linux cluster that handles network partitions gracefully and recovers automatically when connectivity is restored.
