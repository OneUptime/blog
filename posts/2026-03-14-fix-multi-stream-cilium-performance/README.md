# Fixing Multi-Stream Performance Issues in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, Multi-Stream, Optimization

Description: Practical fixes for multi-stream TCP throughput bottlenecks in Cilium, including NIC queue tuning, RSS configuration, XDP acceleration, and BPF map optimization.

---

## Introduction

Multi-stream performance issues in Cilium typically stem from uneven distribution of work across CPU cores or contention on shared resources. Unlike single-stream fixes that focus on reducing per-packet cost on one core, multi-stream fixes are about parallelism: ensuring every core contributes equally to aggregate throughput.

This guide provides concrete fixes for the most common multi-stream bottlenecks, ordered from highest impact to lowest. Each fix is independent, so you can apply them incrementally and measure the improvement.

The target outcome is linear or near-linear throughput scaling as you add parallel streams, up to the physical limits of your NIC and PCIe bus.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- Diagnosed multi-stream bottleneck (see companion diagnostic guide)
- Node-level root access for NIC configuration
- `helm` for Cilium configuration changes
- Maintenance window for agent restarts

## Optimizing NIC Queue Configuration

The most common fix for multi-stream issues is ensuring enough NIC queues:

```bash
# Check current queue count
ethtool -l eth0

# Set queues to match CPU count
ethtool -L eth0 combined $(nproc)

# Verify RSS hash function is using all fields
ethtool -n eth0 rx-flow-hash tcp4
# Should show: sdfn (src/dst IP + src/dst port)

# If not, set it
ethtool -N eth0 rx-flow-hash tcp4 sdfn
```

Apply via a DaemonSet for persistence:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nic-tuner
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: nic-tuner
  template:
    metadata:
      labels:
        app: nic-tuner
    spec:
      hostNetwork: true
      initContainers:
      - name: tune
        image: busybox:1.36
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          # Get CPU count and set NIC queues
          CPUS=$(nproc)
          ethtool -L eth0 combined $CPUS 2>/dev/null || true
          ethtool -N eth0 rx-flow-hash tcp4 sdfn 2>/dev/null || true
          # Increase ring buffers for burst absorption
          ethtool -G eth0 rx 4096 tx 4096 2>/dev/null || true
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
```

## Enabling XDP Acceleration

Cilium's XDP (eXpress Data Path) mode processes packets before they enter the kernel networking stack, dramatically improving multi-stream performance:

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set loadBalancer.acceleration=native \
  --set devices=eth0
```

Verify XDP is active:

```bash
cilium status --verbose | grep "XDP"
# Should show: XDP Acceleration: Native

# Verify XDP programs are attached
ip link show eth0 | grep xdp
```

## Tuning BPF Map Configuration

Reduce contention on shared BPF maps:

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set bpf.ctGlobalTCPMax=1048576 \
  --set bpf.ctGlobalAnyMax=524288 \
  --set bpf.natMax=1048576 \
  --set bpf.mapDynamicSizeRatio=0.0025
```

The `mapDynamicSizeRatio` setting automatically scales map sizes based on total system memory.

## NUMA-Aware Pod Scheduling

Ensure test pods and Cilium agents are NUMA-aligned with the NIC:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: iperf-server
spec:
  containers:
  - name: iperf3
    image: networkstatic/iperf3
    args: ["-s"]
    resources:
      requests:
        cpu: "4"
        memory: "2Gi"
      limits:
        cpu: "4"
        memory: "2Gi"
  nodeSelector:
    kubernetes.io/hostname: node-1
  # Use topology manager for NUMA alignment
```

Enable topology manager on nodes:

```bash
# In kubelet config
cat >> /var/lib/kubelet/config.yaml << KUBELET
topologyManagerPolicy: single-numa-node
cpuManagerPolicy: static
KUBELET
systemctl restart kubelet
```

## Kernel Network Stack Tuning

Optimize kernel parameters for multi-stream workloads:

```bash
# Increase backlog for high packet rates
sysctl -w net.core.netdev_max_backlog=30000
sysctl -w net.core.somaxconn=65535

# Increase socket buffer sizes
sysctl -w net.core.rmem_max=67108864
sysctl -w net.core.wmem_max=67108864
sysctl -w net.ipv4.tcp_rmem="4096 87380 67108864"
sysctl -w net.ipv4.tcp_wmem="4096 65536 67108864"

# Enable busy polling for latency-sensitive flows
sysctl -w net.core.busy_read=50
sysctl -w net.core.busy_poll=50
```

## Verification

After applying fixes, validate improvements:

```bash
# Run progressive multi-stream tests
for STREAMS in 1 2 4 8 16 32; do
  echo "=== $STREAMS streams ==="
  kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30 -P $STREAMS -J | \
    jq '.end.sum_sent.bits_per_second / 1000000000' | \
    xargs -I{} echo "{} Gbps"
done

# Verify XDP attachment
cilium status --verbose | grep XDP

# Check CPU distribution during test
mpstat -P ALL 1 10
```

## Troubleshooting

- **XDP fails to attach**: Ensure the NIC driver supports native XDP. Fallback: use `loadBalancer.acceleration=generic`.
- **ethtool queue changes not persisting**: Use the DaemonSet approach above. NetworkManager may reset settings.
- **NUMA misalignment**: Use `numactl --hardware` and `cat /sys/class/net/eth0/device/numa_node` to verify alignment.
- **Throughput regression with XDP**: Some workloads with heavy L7 policy see regression. Profile with `bpftool prog show`.

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

## Conclusion

Fixing multi-stream performance in Cilium is primarily about removing parallelism bottlenecks. The highest-impact fixes are ensuring NIC queue count matches CPU count, enabling XDP acceleration, and configuring NUMA-aware scheduling. Each fix should produce measurable improvement that you can verify with progressive stream-count testing. The goal is linear throughput scaling up to your hardware limits.
