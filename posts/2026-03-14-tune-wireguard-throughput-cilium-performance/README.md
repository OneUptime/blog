# Tuning WireGuard Throughput in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, WireGuard, Encryption, Performance, Throughput

Description: How to tune Cilium's WireGuard encryption for maximum throughput, including kernel configuration, CPU allocation, and hardware offload options.

---

## Introduction

Cilium supports WireGuard for transparent encryption of pod-to-pod traffic across nodes. WireGuard is significantly faster than IPsec due to its modern cryptographic primitives and lean kernel implementation, but it still adds CPU overhead for encryption and decryption operations that can reduce throughput compared to unencrypted networking.

Tuning WireGuard throughput in Cilium involves optimizing the kernel's WireGuard module, ensuring efficient CPU utilization for crypto operations, and configuring Cilium to minimize overhead in the encryption path.

This guide covers the specific tuning steps to maximize encrypted throughput with Cilium's WireGuard integration.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- Linux kernel 5.6+ (native WireGuard support)
- `cilium` CLI and `helm`
- Node-level access for kernel configuration
- Baseline throughput measurements with and without encryption

## Enabling WireGuard in Cilium

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=wireguard \
  --set encryption.wireguard.userspaceFallback=false
```

Verify WireGuard is active:

```bash
cilium encrypt status
# Should show: Encryption: WireGuard
# Keys should be listed for each node

# Verify WireGuard interfaces exist on nodes
kubectl exec -n kube-system ds/cilium -- ip link show cilium_wg0
```

## Kernel WireGuard Tuning

```bash
# Ensure native WireGuard module is loaded (not wireguard-go)
lsmod | grep wireguard

# Check if AESNI/AVX is available for ChaCha20
grep -E "aes|avx|ssse3" /proc/cpuinfo | head -3

# Increase UDP buffer sizes (WireGuard uses UDP)
sysctl -w net.core.rmem_max=26214400
sysctl -w net.core.wmem_max=26214400
sysctl -w net.core.rmem_default=1048576
sysctl -w net.core.wmem_default=1048576
```

## CPU Affinity for WireGuard Processing

WireGuard processes packets in the context of the sending/receiving thread. Ensure efficient CPU assignment:

```bash
# Check which CPUs handle WireGuard
perf record -g -e 'crypto:*' -a -- sleep 10
perf report --stdio | head -20

# Ensure WireGuard threads are on the same NUMA node as the NIC
NIC_NUMA=$(cat /sys/class/net/eth0/device/numa_node)
echo "NIC on NUMA node: $NIC_NUMA"
```

## MTU Optimization

WireGuard adds 80 bytes of overhead (32-byte message header + 40-byte outer IP header + 8-byte UDP header). Adjust MTU to avoid fragmentation:

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set MTU=1420  # 1500 - 80 for WireGuard overhead
```

Alternatively, if your network supports jumbo frames:

```bash
# Set physical MTU to 9000
ip link set eth0 mtu 9000

# Set Cilium MTU for WireGuard
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set MTU=8870  # 9000 - 80 - 50 (WireGuard + potential VXLAN tunnel)
```

## Enabling BPF Host Routing with WireGuard

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=wireguard \
  --set tunnel=disabled \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set bpf.hostLegacyRouting=false \
  --set bpf.masquerade=true
```

## Verification

```bash
# Benchmark encrypted throughput
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'

# Verify encryption is in use
cilium encrypt status

# Check WireGuard interface stats
kubectl exec -n kube-system ds/cilium -- wg show cilium_wg0

# Compare encrypted vs unencrypted
echo "Expected: 70-90% of unencrypted throughput"
```

## Troubleshooting

- **Very low throughput (< 50% of baseline)**: Check `lsmod | grep wireguard` -- if using userspace fallback, performance will be poor.
- **MTU-related packet drops**: Check `kubectl exec -n kube-system ds/cilium -- ip -s link show cilium_wg0` for errors.
- **WireGuard not encrypting traffic**: Verify with `tcpdump -i eth0 -n udp port 51871` that UDP WireGuard packets are visible.
- **CPU saturation on one core**: WireGuard is processed per-flow; ensure RSS distributes flows across cores.

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

Tuning WireGuard throughput in Cilium involves ensuring the kernel module is native (not userspace), optimizing UDP buffer sizes, configuring correct MTU, and using BPF host routing to minimize datapath overhead before and after encryption. With proper tuning, WireGuard typically achieves 70-90% of unencrypted throughput, making it a practical choice for transparent cluster encryption.
