# Fixing 32-Process Performance Bottlenecks in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Multi-Process, Optimization

Description: Step-by-step fixes for 32-process workload performance issues in Cilium, covering NUMA alignment, BPF map optimization, and kernel tuning for high parallelism.

---

## Introduction

Fixing performance for 32-process workloads in Cilium requires addressing the scaling bottlenecks identified during diagnosis. At this level of parallelism, the fixes differ significantly from single-process or low-parallelism scenarios. The focus shifts to ensuring even distribution of work, eliminating shared resource contention, and optimizing for aggregate throughput rather than per-flow efficiency.

This guide covers the highest-impact fixes for 32-process Cilium performance, from NIC configuration through BPF tuning to NUMA optimization.

The changes should be applied incrementally, measuring after each one, because interactions between fixes can produce unexpected results.

## Prerequisites

- Diagnosed 32-process performance bottleneck
- Kubernetes cluster with Cilium v1.14+
- Nodes with 32+ CPU cores
- `helm`, `ethtool`, and node-level root access

## Maximizing NIC Queue Utilization

```bash
# Set NIC queues to match or exceed process count
ethtool -L eth0 combined 32

# Optimize RSS hash for maximum flow distribution
ethtool -N eth0 rx-flow-hash tcp4 sdfn
ethtool -N eth0 rx-flow-hash tcp6 sdfn
ethtool -N eth0 rx-flow-hash udp4 sdfn

# Increase ring buffers for burst absorption at high parallelism
ethtool -G eth0 rx 8192 tx 8192

# Enable GRO (Generic Receive Offload) for aggregation
ethtool -K eth0 gro on
```

## BPF Map Sizing for 32 Processes

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set bpf.ctGlobalTCPMax=1048576 \
  --set bpf.ctGlobalAnyMax=524288 \
  --set bpf.natMax=1048576 \
  --set bpf.policyMapMax=65536 \
  --set bpf.mapDynamicSizeRatio=0.0025
```

## NUMA Optimization

```bash
# Pin Cilium agent to the same NUMA node as the NIC
NIC_NUMA=$(cat /sys/class/net/eth0/device/numa_node)
NUMA_CPUS=$(cat /sys/devices/system/node/node${NIC_NUMA}/cpulist)

# Update Cilium DaemonSet with NUMA affinity
kubectl -n kube-system patch ds cilium --type=json -p='[
  {"op": "add", "path": "/spec/template/spec/containers/0/env/-",
   "value": {"name": "GOMAXPROCS", "value": "8"}}
]'
```

## Kernel Tuning for High Parallelism

```bash
sysctl -w net.core.netdev_max_backlog=50000
sysctl -w net.core.somaxconn=65535
sysctl -w net.core.rmem_max=134217728
sysctl -w net.core.wmem_max=134217728
sysctl -w net.ipv4.tcp_rmem="4096 87380 134217728"
sysctl -w net.ipv4.tcp_wmem="4096 65536 134217728"
sysctl -w net.ipv4.tcp_max_syn_backlog=65535
sysctl -w net.ipv4.ip_local_port_range="1024 65535"
sysctl -w net.ipv4.tcp_congestion_control=bbr
```

## Enable XDP for Ingress Acceleration

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set loadBalancer.acceleration=native \
  --set devices=eth0
```

## Verification

```bash
# Test scaling from 1 to 32 processes
for P in 1 8 16 32; do
  echo "=== $P processes ==="
  kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 -P $P -J | \
    jq '.end.sum_sent.bits_per_second / 1000000000' | xargs -I{} echo "{} Gbps"
done

# Verify NIC queues
ethtool -l eth0

# Verify BPF map sizes
cilium config view | grep bpf-ct

# Check NUMA alignment
numastat -p $(pgrep cilium-agent)
```

## Troubleshooting

- **NIC does not support 32 queues**: Use the maximum available and enable RPS for additional distribution.
- **BPF map resize causes agent restart**: Expect one restart. Monitor with `kubectl get pods -n kube-system -w`.
- **XDP not supported on NIC driver**: Fall back to `loadBalancer.acceleration=generic`.
- **Kernel tuning reverts on reboot**: Deploy via DaemonSet for persistence.

## Implementing Changes Safely

When applying performance fixes to a production Cilium cluster, follow a staged rollout approach to minimize risk:

```bash
# Step 1: Test on a single node first
kubectl cordon node-test-1
kubectl drain node-test-1 --ignore-daemonsets --delete-emptydir-data

# Step 2: Apply configuration changes
helm upgrade cilium cilium/cilium --namespace kube-system \
  --reuse-values \
  <your-changes-here>

# Step 3: Wait for the Cilium agent on the test node to restart
kubectl rollout status ds/cilium -n kube-system --timeout=120s

# Step 4: Run a quick benchmark on the test node
kubectl uncordon node-test-1
# Deploy test pods on the node and verify performance

# Step 5: If successful, roll out to remaining nodes
# Cilium DaemonSet will handle the rolling update
```

### Change Tracking

Document every change you make along with its measured impact. Create a log entry for each modification:

```bash
cat >> /tmp/perf-changes.log << LOG
Date: $(date)
Change: <description of change>
Before: <metric before change>
After: <metric after change>
Impact: <percentage improvement or regression>
LOG
```

This change log is invaluable for understanding which optimizations provide the most benefit and for reverting changes if unexpected regressions occur. It also helps when you need to apply the same optimizations to other clusters.

### Rolling Back Changes

If a change causes unexpected behavior, roll back immediately:

```bash
# Rollback to previous Helm release
helm rollback cilium -n kube-system

# Verify the rollback was successful
cilium status --verbose
kubectl rollout status ds/cilium -n kube-system
```

## Post-Fix Validation Checklist

After applying any fix, run through this validation checklist to ensure the fix is complete and has not introduced regressions:

```bash
#!/bin/bash
# post-fix-checklist.sh

echo "=== Post-Fix Validation Checklist ==="

# 1. Cilium agent health
echo "1. Cilium agent health:"
cilium status | grep -E "OK|error|degraded"

# 2. No agent restarts
echo "2. Agent restart count:"
kubectl get pods -n kube-system -l k8s-app=cilium -o json | \
  jq '.items[].status.containerStatuses[].restartCount'

# 3. No new drops
echo "3. Recent drops:"
cilium monitor --type drop | timeout 5 head -5 || echo "No drops in 5 seconds"

# 4. Endpoint health
echo "4. Endpoint health:"
cilium endpoint list | grep -c "ready"
cilium endpoint list | grep -c "not-ready"

# 5. Performance benchmark
echo "5. Quick performance check:"
kubectl exec perf-client -- iperf3 -c perf-server.monitoring -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000' | \
  xargs -I{} echo "{} Gbps"

echo "=== Checklist Complete ==="
```

### Monitoring for Regression

After applying fixes, monitor closely for 24-48 hours:

```bash
# Watch Cilium events for any errors
kubectl get events -n kube-system --watch --field-selector involvedObject.kind=Pod

# Monitor agent CPU and memory
watch -n5 "kubectl top pods -n kube-system -l k8s-app=cilium"
```

Document the fix, its impact, and any follow-up actions needed in your team's runbook or wiki.

## Conclusion

Fixing 32-process performance in Cilium requires scaling every component: NIC queues, BPF maps, kernel buffers, and NUMA alignment. The key is ensuring that the parallelism in your workload translates to parallelism in the infrastructure. Each fix targets a specific scaling bottleneck, and together they enable near-linear throughput scaling up to hardware limits.
