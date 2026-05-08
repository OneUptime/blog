# Troubleshooting WireGuard Throughput in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, WireGuard, Encryption, Troubleshooting, Performance

Description: Systematic troubleshooting guide for WireGuard throughput issues in Cilium, covering crypto bottlenecks, MTU problems, and peer connectivity failures.

---

## Introduction

When WireGuard throughput in Cilium falls below expectations, the issues can range from simple MTU misconfiguration to complex CPU contention between encryption processing and other workloads. Troubleshooting requires understanding the WireGuard packet flow through Cilium's datapath and identifying exactly where the throughput loss occurs.

This guide provides a systematic troubleshooting approach starting from basic connectivity verification through to deep performance analysis of the encryption path.

The most common issues are MTU fragmentation, CPU saturation from ChaCha20 encryption, deprecated WireGuard userspace fallback on older Cilium releases, and key rotation disruptions.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+ and WireGuard enabled
- `cilium`, `kubectl`, `helm`, `bpftool`, `tcpdump`, `iperf3`, `jq`, `perf`, `mpstat`
- Node-level access for kernel debugging

## Step 1: Verify WireGuard Is Active

```bash
# Check Cilium encryption status

cilium encryption status

# Verify WireGuard interface exists
kubectl exec -n kube-system ds/cilium -- ip link show cilium_wg0

# Check WireGuard peer details from the Cilium agent
kubectl exec -n kube-system ds/cilium -- cilium-dbg debuginfo --output json | jq .encryption

# Verify kernel WireGuard support. lsmod may be empty if WireGuard is built in.
grep -w CONFIG_WIREGUARD /boot/config-$(uname -r) 2>/dev/null || modinfo wireguard
# On Cilium versions that still support userspace fallback, also check whether
# wireguard.userspaceFallback / --enable-wireguard-userspace-fallback is enabled.
```

## Step 2: MTU Diagnosis

```bash
# Check MTU chain
kubectl exec -n kube-system ds/cilium -- ip link show cilium_wg0 | grep mtu
kubectl exec -n kube-system ds/cilium -- ip link show eth0 | grep mtu
kubectl exec -n kube-system ds/cilium -- sh -c 'ip -o link show | grep -E "cilium_|lxc|eth0"'

# Test for fragmentation
kubectl exec test-pod -- ping -M do -s 1350 $REMOTE_POD_IP
# Decrease size until it works - if < 1350, MTU is misconfigured

# Check for PMTUD issues
kubectl exec -n kube-system ds/cilium -- ip route show | grep mtu

# If using CNI chaining, verify Cilium is setting route MTU for chained Pods
helm get values cilium -n kube-system -a | grep -i enableRouteMTUForCNIChaining
```

## Step 3: CPU Analysis During Encrypted Transfer

```bash
# Run iperf3 and monitor CPU simultaneously
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30 -P 1 &

# On the node, check CPU usage
mpstat -P ALL 1 10

# Profile crypto operations
perf top -e cycles:pp -g --no-children -z

# Check for ChaCha20 or Poly1305 in the hot path
perf record -g -a -- sleep 10
perf report --stdio | grep -E "chacha|poly1305|wireguard"
```

## Step 4: Compare Encrypted vs Unencrypted

```bash
# Temporarily disable encryption (causes brief disruption)
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.enabled=false

# Wait for rollout
kubectl rollout status ds/cilium -n kube-system

# Run benchmark without encryption
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'

# Re-enable encryption
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=wireguard

# Run benchmark with encryption
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'

# Calculate overhead percentage
```

## Step 5: Check for Packet Drops

```bash
# WireGuard interface drop counters
kubectl exec -n kube-system ds/cilium -- ip -s link show cilium_wg0

# Kernel drop counters
kubectl exec -n kube-system ds/cilium -- cat /proc/net/snmp | grep -i udp

# Cilium drops related to encryption
kubectl exec -n kube-system ds/cilium -- cilium-dbg monitor --type drop | grep -i encrypt
```

## Troubleshooting Decision Tree

```mermaid
graph TD
    A[Low WireGuard Throughput] --> B{Kernel WireGuard support available?}
    B -->|No| C[Install a kernel with WireGuard support or the WireGuard kernel module]
    B -->|Yes| D{MTU test passes at 1350?}
    D -->|No| E[Fix MTU: set to 1420 or lower]
    D -->|Yes| F{CPU saturated during test?}
    F -->|Yes| G[Check NUMA, enable jumbo frames, reduce streams]
    F -->|No| H{Encrypted < 60% of unencrypted?}
    H -->|Yes| I[Check for software fallback, profile crypto path]
    H -->|No| J[Performance is within expected WireGuard overhead]
```

## Verification

```bash
# After applying fixes, verify
cilium encryption status
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'

echo "Compare against the unencrypted baseline for the same hardware, MTU, routing mode, and stream count"
```

## Troubleshooting

- **Throughput under 50% of unencrypted**: Check for CPU saturation, MTU fragmentation, and the deprecated userspace WireGuard fallback on older Cilium versions. Use a kernel with WireGuard support (Linux 5.6+ or an out-of-tree WireGuard module on older kernels).
- **Intermittent throughput drops**: Key rotation may cause brief pauses. Check `cilium-dbg debuginfo --output json | jq .encryption` for recent handshake times.
- **One node pair slow**: Check if that specific node has a different kernel version, CPU features, NUMA placement, or IRQ affinity.
- **WireGuard interface missing**: Verify `encryption.type=wireguard` in Cilium config and check agent logs.

## Systematic Troubleshooting Approach

Follow a structured methodology to avoid wasting time on false leads:

### The Five Whys Method

Apply iterative root cause analysis:

```yaml
Problem: Throughput is 50% below baseline
Why 1: BPF programs are running slower (higher avg_ns)
Why 2: Conntrack lookups are taking longer
Why 3: Conntrack table is 90% full (hash collisions)
Why 4: Table size was not increased when cluster grew
Why 5: No monitoring on conntrack utilization
Root Cause: Missing capacity monitoring
```

### Data Collection During Issues

When troubleshooting active performance issues, collect data quickly before conditions change:

```bash
#!/bin/bash
# emergency-diag.sh - Run immediately when performance issues are reported
DIAG="/tmp/perf-issue-$(date +%s)"
mkdir -p $DIAG

# Quick data collection (runs in <30 seconds)
kubectl exec -n kube-system ds/cilium -- cilium-dbg status --verbose > $DIAG/status.txt &
kubectl exec -n kube-system ds/cilium -- cilium-dbg bpf ct list | wc -l > $DIAG/ct-count.txt &
kubectl top pods -n kube-system -l k8s-app=cilium > $DIAG/agent-resources.txt &
kubectl exec -n kube-system ds/cilium -- cilium-dbg metrics list > $DIAG/metrics.txt &
wait

# BPF program stats
bpftool prog show --json > $DIAG/bpf-progs.json 2>/dev/null

# Network stats
kubectl exec -n kube-system ds/cilium -- ip -s link show > $DIAG/interfaces.txt

echo "Emergency diagnostics saved to $DIAG"
```

### Escalation Path

If the issue cannot be resolved through standard troubleshooting:

1. Collect a Cilium bugtool report: `cilium-bugtool`
2. Check Cilium GitHub issues for similar problems
3. Post on the Cilium Slack channel with diagnostic data
4. Open a GitHub issue with the bugtool archive

Include the following in any escalation:
- Cilium version and configuration
- Kernel version
- Cluster size (nodes, pods, identities)
- Timeline of when the issue started
- Any recent changes to the cluster

## Conclusion

Troubleshooting WireGuard throughput in Cilium follows a systematic approach: verify WireGuard is active and using kernel support, check MTU for fragmentation, profile CPU for crypto overhead, and compare against unencrypted baseline. Most issues resolve by ensuring kernel WireGuard support is available, fixing MTU to account for WireGuard's 60-byte IPv4 or 80-byte IPv6 overhead, and ensuring CPUs have enough capacity for ChaCha20-Poly1305 operations.
