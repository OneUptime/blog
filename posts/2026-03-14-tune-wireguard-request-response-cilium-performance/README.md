# Tuning WireGuard Request/Response Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, WireGuard, Encryption, Latency, TCP_RR

Description: How to tune Cilium's WireGuard encryption for optimal request/response latency, minimizing per-transaction crypto overhead.

---

## Introduction

WireGuard encryption adds latency to every packet, which directly impacts request/response (TCP_RR) workloads. Each request and response must be encrypted and decrypted, adding CPU cycles to every transaction. For latency-sensitive microservices, this overhead can be significant.

Tuning WireGuard for TCP_RR performance focuses on minimizing the per-packet encryption cost rather than maximizing bulk throughput. The strategies differ: bulk throughput benefits from batching and large buffers, while request/response latency benefits from small buffers, fast crypto processing, and minimal queueing delay.

This guide covers the specific tuning steps to minimize WireGuard's impact on request/response latency in Cilium-managed clusters.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+ and WireGuard enabled
- Linux kernel 5.6+ with native WireGuard module
- `netperf` for TCP_RR testing
- `cilium` CLI and `helm`
- Baseline TCP_RR measurements

## Measuring WireGuard TCP_RR Impact

```bash
# First measure without encryption
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.enabled=false
kubectl rollout status ds/cilium -n kube-system

kubectl exec netperf-client -- \
  netperf -H $SERVER_IP -t TCP_RR -l 30 -- -r 1,1

# Then with WireGuard
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=wireguard
kubectl rollout status ds/cilium -n kube-system

kubectl exec netperf-client -- \
  netperf -H $SERVER_IP -t TCP_RR -l 30 -- -r 1,1
```

Typical overhead is 10-30% reduction in transactions per second.

## Optimizing for Low Latency

```bash
# Enable busy polling to reduce softirq latency
sysctl -w net.core.busy_read=50
sysctl -w net.core.busy_poll=50

# Disable interrupt coalescing for lower latency
ethtool -C eth0 rx-usecs 0 tx-usecs 0

# Set CPU governor to performance
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
  echo performance > $cpu 2>/dev/null
done

# Disable C-states for predictable latency
# Add to kernel cmdline: intel_idle.max_cstate=1
```

## Socket-Level BPF with WireGuard

Enable socket-level load balancing to reduce the datapath length before encryption:

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=wireguard \
  --set kubeProxyReplacement=true \
  --set socketLB.enabled=true \
  --set bpf.hostLegacyRouting=false
```

## WireGuard Queue Configuration

```bash
# Check WireGuard interface parameters
ip link show cilium_wg0

# Ensure the WireGuard interface uses optimal queue settings
# WireGuard processes packets in-line, so queue depth affects latency
ethtool -G cilium_wg0 tx 256 rx 256 2>/dev/null || echo "WG uses kernel defaults"
```

## NUMA Alignment for Crypto Processing

```bash
# Ensure crypto processing happens on the NIC's NUMA node
NIC_NUMA=$(cat /sys/class/net/eth0/device/numa_node)
echo "Pin latency-sensitive pods to NUMA node $NIC_NUMA"
```

## Verification

```bash
# Re-run TCP_RR benchmark
kubectl exec netperf-client -- \
  netperf -H $SERVER_IP -t TCP_RR -l 30 -- -r 1,1

# Verify WireGuard is active
cilium encrypt status

# Check CPU governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
```

## Troubleshooting

- **No improvement from busy polling**: Some NIC drivers do not support busy polling. Check driver documentation.
- **High variance in latency**: Disable interrupt coalescing and C-states for consistent results.
- **Socket LB not working with WireGuard**: Verify both features are enabled in `cilium status --verbose`.
- **Latency spikes during key rotation**: WireGuard key rotation is fast but can cause brief latency spikes. Monitor handshake times.

## Systematic Tuning Methodology

Performance tuning should follow a systematic approach to avoid chasing false leads:

### Step 1: Measure Before Tuning

Always establish a pre-tuning baseline with multiple runs:

```bash
#!/bin/bash
echo "=== Pre-Tuning Baseline ==="
for i in $(seq 1 5); do
  kubectl exec perf-client -- iperf3 -c perf-server -t 15 -P 1 -J | \
    jq '.end.sum_sent.bits_per_second / 1000000000' | \
    xargs -I{} echo "Run $i: {} Gbps"
  sleep 5
done
```

### Step 2: Change One Variable at a Time

Never apply multiple changes simultaneously. Each change should be:
1. Applied independently
2. Measured with the same benchmark methodology
3. Documented with before/after results
4. Reverted if it causes regression

### Step 3: Verify Improvements Are Real

A 2% improvement might be within measurement noise. Use statistical tests to confirm improvements are significant:

```bash
# Compare two sets of measurements
# Use the Welch's t-test threshold of p < 0.05
# In practice, require at least 5% improvement with CV < 5%
```

### Step 4: Document the Final Configuration

After all tuning is complete, document the full configuration as the new baseline:

```bash
# Export final Cilium configuration
helm get values cilium -n kube-system -o yaml > cilium-tuned-values-$(date +%Y%m%d).yaml

# Record final benchmark results
echo "Final tuned throughput: X Gbps"
echo "Improvement from baseline: Y%"
```

### Common Tuning Pitfalls

Avoid these common mistakes in performance tuning:

- **Cargo-cult tuning**: Applying settings from blog posts without understanding why they help
- **Over-tuning**: Making changes that help benchmarks but hurt real workloads
- **Ignoring tail latency**: Optimizing mean while p99 gets worse
- **Hardware-specific tuning**: Settings that work on one hardware platform may hurt on another

## Conclusion

Tuning WireGuard for request/response latency in Cilium requires a different approach than throughput tuning. The focus is on reducing per-packet processing time through busy polling, CPU frequency management, interrupt coalescing disabled, and socket-level BPF acceleration. With proper tuning, WireGuard's impact on TCP_RR latency can be kept below 20%, making transparent encryption practical for latency-sensitive microservices.
