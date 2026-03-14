# Fixing Single-Stream Performance Issues in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, Single-Stream, Tuning

Description: Step-by-step guide to fixing single-stream TCP throughput bottlenecks in Cilium, covering datapath mode changes, BPF tuning, and kernel-level optimizations.

---

## Introduction

Once you have diagnosed a single-stream throughput issue in Cilium, the next step is to apply targeted fixes. Single-stream performance is a useful proxy for per-flow efficiency because it exercises a single CPU core's ability to push packets through the entire Cilium eBPF datapath. Fixes generally fall into three categories: Cilium configuration changes, kernel tuning, and hardware-level adjustments.

This guide assumes you have already identified the bottleneck using diagnostic tools like `iperf3`, `bpftool`, and CPU profiling. Each section below addresses a specific class of performance limiter and provides the exact configuration changes needed to resolve it.

The key insight for single-stream fixes is that you cannot scale horizontally across cores since by definition one TCP flow is handled by one core. Every optimization must reduce the per-packet cost on that single core.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI and `helm` installed
- `kubectl` admin access
- Diagnosed bottleneck (see the companion diagnostic guide)
- Maintenance window for Cilium agent restarts

## Switching to Native Routing Mode

If Cilium is running in tunnel mode (VXLAN or Geneve), the encapsulation overhead reduces single-stream throughput by 10-20%. Switch to native routing:

```bash
# Check current mode
cilium config view | grep tunnel

# Upgrade Cilium with native routing via Helm
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set tunnel=disabled \
  --set ipam.mode=kubernetes \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set ipv4NativeRoutingCIDR="10.0.0.0/8"
```

Ensure your underlying network can route pod CIDRs between nodes. If using a cloud provider, configure the cloud routes appropriately.

## Enabling BPF Host Routing

BPF host routing bypasses the kernel's iptables and netfilter stack, significantly reducing per-packet processing:

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set bpf.masquerade=true \
  --set kubeProxyReplacement=true \
  --set bpf.hostLegacyRouting=false
```

Verify it is active:

```bash
cilium status --verbose | grep "Host Routing"
# Should show: Host Routing: BPF
```

## Tuning BPF Map Sizes and Conntrack

Conntrack table pressure causes hash collisions that slow lookups:

```bash
# Increase conntrack table sizes
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set bpf.ctGlobalTCPMax=524288 \
  --set bpf.ctGlobalAnyMax=262144 \
  --set bpf.natMax=524288
```

Also tune the conntrack garbage collection interval:

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set bpf.ctTCPTimeoutEstablished=21600
```

## Kernel-Level Optimizations

### IRQ Affinity and RPS

Pin NIC interrupts and enable Receive Packet Steering for better CPU utilization:

```bash
# On each node, set IRQ affinity
# First, find the IRQ numbers for your NIC
grep eth0 /proc/interrupts | awk '{print $1}' | tr -d ':' | while read irq; do
  echo 2 > /proc/irq/$irq/smp_affinity
done

# Enable RPS
echo "ff" > /sys/class/net/eth0/queues/rx-0/rps_cpus

# Increase ring buffer sizes
ethtool -G eth0 rx 4096 tx 4096
```

### TCP Stack Tuning

Optimize the kernel TCP stack for throughput:

```bash
# Apply TCP tuning on each node
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216
sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"
sysctl -w net.core.netdev_max_backlog=5000
sysctl -w net.ipv4.tcp_congestion_control=bbr
```

To make these persistent, add them to a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: sysctl-tuner
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: sysctl-tuner
  template:
    metadata:
      labels:
        app: sysctl-tuner
    spec:
      hostNetwork: true
      hostPID: true
      initContainers:
      - name: sysctl
        image: busybox:1.36
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          sysctl -w net.core.rmem_max=16777216
          sysctl -w net.core.wmem_max=16777216
          sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
          sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"
          sysctl -w net.ipv4.tcp_congestion_control=bbr
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
```

## Disabling Unnecessary Features

If you do not need L7 policy, encryption, or bandwidth management, disable them to reduce per-packet cost:

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set l7Proxy=false \
  --set encryption.enabled=false \
  --set bandwidthManager.enabled=false
```

## Verification

After applying fixes, re-run your benchmark:

```bash
# Single-stream iperf3 test
kubectl exec iperf-client-pod -- iperf3 -c $SERVER_IP -t 60 -P 1 -J

# Compare pre and post fix numbers
# Expect 10-30% improvement depending on which fixes applied

# Verify BPF host routing is active
cilium status --verbose | grep "Host Routing"

# Verify native routing
cilium status --verbose | grep "DatapathMode"
```

## Troubleshooting

- **No improvement after native routing switch**: Verify routes exist between nodes with `ip route show`. Check cloud provider route tables.
- **Agent crashes after BPF map size increase**: Reduce map sizes or increase memory limits on the Cilium agent DaemonSet.
- **BBR not available**: Load the module with `modprobe tcp_bbr` and verify with `sysctl net.ipv4.tcp_available_congestion_control`.
- **Performance regression after disabling L7 proxy**: Some services may depend on Envoy for traffic management. Re-enable selectively.

## Conclusion

Fixing single-stream performance in Cilium is about reducing per-packet overhead on a single CPU core. The highest-impact changes are switching from tunnel to native routing mode, enabling BPF host routing, and tuning the kernel TCP stack. Each change is incremental and measurable, so apply them one at a time and benchmark after each. With proper tuning, Cilium's eBPF datapath can achieve near-line-rate single-stream throughput on modern hardware.
