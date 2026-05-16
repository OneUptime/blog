# How to Troubleshoot etcd Timeout Errors in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Timeout, Kubernetes, Performance, Troubleshooting

Description: Fix etcd timeout errors in Talos Linux clusters by identifying slow disks, network latency, oversized databases, and resource contention issues.

---

etcd timeout errors are among the most disruptive problems you can face in a Talos Linux cluster. When etcd times out, the Kubernetes API server cannot read or write cluster state, which means no new deployments, no scaling operations, and eventually existing workloads may be affected. This guide focuses specifically on timeout-related etcd issues and how to resolve them on Talos Linux.

## What etcd Timeouts Look Like

etcd timeout errors appear in several places:

In the etcd logs:

```text
{"level":"warn","msg":"etcdserver: request timed out"}
{"level":"warn","msg":"etcdserver: failed to send out heartbeat on time"}
{"level":"warn","msg":"apply request took too long (2.5s)"}
```

In the API server logs:

```text
etcdserver: request timed out
```

In kubectl output:

```text
Error from server: etcdserver: request timed out
```

## Understanding etcd Timing

etcd uses a leader-based consensus protocol. The leader sends heartbeats to followers at regular intervals (default 100ms). If a follower does not hear from the leader within the election timeout (default 1000ms), a new leader election happens. During elections, the cluster is temporarily unavailable.

Timeouts happen when:

1. The disk is too slow to write the WAL (Write-Ahead Log)
2. The network between control plane nodes has high latency
3. The etcd process is starved for CPU
4. The etcd database is too large
5. A follower node is overloaded

## Cause 1: Slow Disk I/O

This is the number one cause of etcd timeouts. etcd performs a synchronous disk write for every transaction, so disk latency directly impacts performance.

Check disk performance:

```bash
# Check etcd WAL sync duration from the metrics

# First, port-forward to etcd metrics
kubectl -n kube-system port-forward <etcd-pod> 2381:2381

# Then check the WAL fsync duration
curl -s http://localhost:2381/metrics | grep etcd_disk_wal_fsync_duration
```

If the WAL fsync duration consistently exceeds 10ms, your disk is too slow for etcd. On Talos Linux, etcd data lives on the ephemeral partition at `/var/lib/etcd`.

Solutions:

1. **Use SSDs.** This is the single most effective fix. NVMe drives are even better.
2. **Move etcd data to faster storage** by configuring the Talos `EPHEMERAL` volume, which contains `/var/lib/etcd`, on an SSD or NVMe disk before the volume is provisioned.
3. **Reduce disk contention** by not running I/O-heavy workloads on control plane nodes.

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
provisioning:
  diskSelector:
    match: disk.transport == "nvme"
```

## Cause 2: Network Latency

etcd members must communicate with low latency. Keep round-trip time between members low; etcd recommends setting the heartbeat interval around the measured RTT, and a 10ms RTT is a reasonable target for a healthy local control plane. Higher latency causes missed heartbeats.

Test network latency between control plane nodes:

```bash
# From a debug pod on one control plane node
kubectl run nettest --image=busybox --restart=Never --overrides='{"spec":{"nodeName":"<cp-1-name>"}}' -- sleep 3600

# Ping another control plane node
kubectl exec nettest -- ping -c 20 <cp-2-ip>
```

If latency is consistently high:

1. Make sure control plane nodes are in the same data center or availability zone
2. Check for network congestion between nodes
3. Verify that no traffic shaping or QoS policies are throttling etcd traffic

## Cause 3: Large etcd Database

The default etcd database size limit in Talos is 2 GiB. As the database grows, operations can take longer:

```bash
# Check etcd database size
talosctl -n <cp-ip> etcd status
```

If the database is larger than 100MB, consider whether you have too many resources stored in etcd. Common culprits:

- Large ConfigMaps or Secrets
- Thousands of CRD instances
- Event objects (cleaned up automatically but can accumulate)

Kubernetes automatically compacts the etcd database, but disk space is not actually freed until the database is defragmented. Defragment one member at a time:

```bash
# Defragment each member
talosctl -n <cp-1-ip> etcd defrag
talosctl -n <cp-2-ip> etcd defrag
talosctl -n <cp-3-ip> etcd defrag
```

Run defrag on one member at a time to avoid cluster disruption.

## Cause 4: CPU Starvation

If the control plane node is running CPU-intensive workloads alongside etcd, etcd may not get enough CPU time to process heartbeats:

```bash
# Check CPU usage on control plane nodes
kubectl top nodes

# Check which pods are consuming CPU
kubectl top pods -A --sort-by=cpu | head -20
```

Solutions:

1. Do not schedule regular workloads on control plane nodes (keep the default taint)
2. If you must run workloads on control plane nodes, set CPU resource limits
3. Increase the CPU allocation for the control plane VM

Check that the control plane taint is in place:

```bash
# Verify control plane taints
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
```

## Cause 5: Too Many Watchers

If many controllers or operators are watching etcd, the watch load can cause slowdowns:

```bash
# Check etcd watch count
curl -s http://localhost:2381/metrics | grep etcd_debugging_mvcc_watcher_total
```

A high watcher count (tens of thousands) can contribute to timeout issues. This is usually caused by having too many operators or CRDs in the cluster.

## Tuning etcd Timeouts

If you cannot immediately fix the underlying cause, you can increase etcd timeouts as a temporary measure:

```yaml
cluster:
  etcd:
    extraArgs:
      heartbeat-interval: "500"      # Increase from default 100ms
      election-timeout: "5000"       # Increase from default 1000ms
```

Apply this to all control plane nodes:

```bash
# Apply updated configuration
talosctl apply-config -n <cp-1-ip> --file controlplane.yaml
talosctl apply-config -n <cp-2-ip> --file controlplane.yaml
talosctl apply-config -n <cp-3-ip> --file controlplane.yaml
```

However, increasing timeouts means it takes longer to detect a failed leader, which means longer outages during leader elections.

## Monitoring etcd Performance

Set up ongoing monitoring to catch timeout issues before they become critical:

Key metrics to watch:

```bash
# Check these metrics regularly
# WAL fsync duration (should be < 10ms p99)
curl -s http://localhost:2381/metrics | grep etcd_disk_wal_fsync_duration_seconds

# Backend commit duration (should be < 25ms p99)
curl -s http://localhost:2381/metrics | grep etcd_disk_backend_commit_duration_seconds

# Network peer round trip time
curl -s http://localhost:2381/metrics | grep etcd_network_peer_round_trip_time_seconds

# Leader changes (should be rare)
curl -s http://localhost:2381/metrics | grep etcd_server_leader_changes_seen_total

# Proposal failures
curl -s http://localhost:2381/metrics | grep etcd_server_proposals_failed_total
```

## Emergency Response to etcd Timeouts

If etcd timeouts are causing a cluster outage right now:

```bash
# 1. Check which etcd member is the leader
talosctl -n <cp-ip> etcd status

# 2. Check if all members are healthy
talosctl -n <cp-1-ip> etcd status
talosctl -n <cp-2-ip> etcd status
talosctl -n <cp-3-ip> etcd status

# 3. If one member is causing issues and is still accessible, make it leave
talosctl -n <slow-cp-ip> etcd leave

# If the member is broken or inaccessible, remove it from a healthy member
talosctl -n <healthy-cp-ip> etcd remove-member <slow-member-id>

# 4. Fix the slow member (replace disk, fix network, etc.)

# 5. Re-add the member
talosctl -n <fixed-member-ip> reset --graceful=false
talosctl apply-config --insecure -n <fixed-member-ip> --file controlplane.yaml
```

Removing a slow member from a three-node cluster reduces fault tolerance (you now need both remaining members to stay healthy), so fix and re-add the member as quickly as possible.

## Prevention

The best approach to etcd timeouts is prevention:

1. Always use SSD storage for control plane nodes
2. Keep control plane nodes in the same network segment
3. Monitor etcd metrics continuously
4. Defragment etcd regularly (weekly or monthly)
5. Keep the etcd database small by cleaning up unused resources
6. Do not run I/O or CPU-intensive workloads on control plane nodes

etcd timeout errors are a signal that your infrastructure needs attention. They rarely happen on well-provisioned clusters with fast disks and low-latency networking.
