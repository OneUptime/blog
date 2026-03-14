# Fixing Single-Process Performance Bottlenecks in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, Single-Process, CPU Pinning

Description: Practical fixes for single-process workload performance issues in Cilium, including CPU affinity management, IRQ steering, and cgroup configuration.

---

## Introduction

After diagnosing that a single-process workload suffers from CPU contention with Cilium's eBPF datapath processing, the next step is applying targeted fixes. The core problem is that a single CPU must handle both the application's work and the network packet processing, leading to contention.

The fixes fall into two categories: separating the workload from network processing onto different cores, and reducing the per-packet cost of Cilium's processing. Both approaches are complementary and should be applied together for maximum effect.

This guide provides concrete configurations for CPU pinning, IRQ affinity, Kubernetes resource management, and Cilium tuning specifically for single-process workloads.

## Prerequisites

- Diagnosed single-process CPU contention issue
- Kubernetes cluster with Cilium v1.14+
- CPU Manager enabled on kubelet
- Node-level access for IRQ configuration

## Enabling CPU Manager for Static Assignment

Configure kubelet to use static CPU management:

```bash
# Edit kubelet config on each node
# /var/lib/kubelet/config.yaml
cat >> /var/lib/kubelet/config.yaml << KUBEEOF
cpuManagerPolicy: static
cpuManagerReconcilePeriod: 10s
reservedSystemCPUs: "0-1"
KUBEEOF

# Restart kubelet
systemctl restart kubelet
```

Deploy the application with guaranteed QoS and integer CPU requests:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
  - name: app
    image: my-app:latest
    resources:
      requests:
        cpu: "2"
        memory: "1Gi"
      limits:
        cpu: "2"
        memory: "1Gi"
```

With static CPU Manager, the pod gets exclusive access to 2 CPUs, preventing contention.

## IRQ Affinity Steering

Steer NIC interrupts away from the application's CPUs:

```bash
#!/bin/bash
# steer-irqs.sh - Run on each node

# Get CPUs assigned to Cilium and system work (not application CPUs)
# Assume CPUs 0-1 are reserved, 2-3 are for the app, 4+ for IRQs
IRQ_MASK="f0"  # CPUs 4-7

# Set all NIC IRQs to non-application CPUs
for IRQ in $(grep -E "eth|ens" /proc/interrupts | awk -F: '{print $1}' | tr -d ' '); do
  echo $IRQ_MASK > /proc/irq/$IRQ/smp_affinity
done

# Disable irqbalance from overriding
systemctl stop irqbalance
systemctl disable irqbalance
```

Deploy as a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: irq-affinity
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: irq-affinity
  template:
    metadata:
      labels:
        app: irq-affinity
    spec:
      hostNetwork: true
      hostPID: true
      initContainers:
      - name: configure
        image: busybox:1.36
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          # Steer IRQs to CPUs 4+
          for IRQ in $(cat /proc/interrupts | grep -E "eth|ens" | awk -F: '{print $1}' | tr -d ' '); do
            echo f0 > /proc/irq/$IRQ/smp_affinity 2>/dev/null || true
          done
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
```

## Configuring RPS for Controlled Steering

```bash
# Instead of processing packets on the IRQ CPU,
# steer them to specific CPUs using RPS
echo "0c" > /sys/class/net/eth0/queues/rx-0/rps_cpus
# This steers to CPUs 2-3, matching the app's allocated cores
# Adjust based on your CPU manager allocation
```

## Cilium Tuning for Single-Process

Reduce Cilium's per-packet overhead:

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set bpf.hostLegacyRouting=false \
  --set socketLB.enabled=true \
  --set bpf.masquerade=true
```

## Application-Level Fixes

```bash
# If the application supports it, enable SO_BUSY_POLL
# In application code or via sysctl:
sysctl -w net.core.busy_read=50
sysctl -w net.core.busy_poll=50

# Set the application's scheduling priority
chrt -f -p 50 $APP_PID

# Enable NUMA-local memory allocation
numactl --membind=0 --cpunodebind=0 -- <application command>
```

## Verification

```bash
# Verify CPU assignment (cgroup v2)
kubectl exec my-app -- cat /sys/fs/cgroup/cpuset.cpus
# Should show specific CPUs like "2-3"
# Note: On cgroup v1, the path is /sys/fs/cgroup/cpuset/cpuset.cpus

# Verify no throttling (cgroup v2)
kubectl exec my-app -- cat /sys/fs/cgroup/cpu.stat
# Note: On cgroup v1, the path is /sys/fs/cgroup/cpu/cpu.stat
# nr_throttled should be 0

# Run benchmark and check CPU distribution
mpstat -P ALL 1 10
# Application CPUs should show user-space load
# IRQ CPUs should show softirq load
# No single CPU at 100%
```

## Troubleshooting

- **CPU Manager not assigning exclusive CPUs**: Ensure the pod has Guaranteed QoS (requests == limits) and integer CPU values.
- **IRQ affinity resets**: irqbalance may be overriding. Disable it or configure its policy file.
- **RPS causing higher latency**: RPS adds inter-processor interrupts. Only use when IRQ CPU is overloaded.
- **Application still slow after CPU isolation**: Profile the application itself -- the bottleneck may be in application code, not networking.

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

Fixing single-process performance in Cilium is fundamentally about CPU isolation: ensuring the application's core is not shared with network packet processing. The combination of Kubernetes CPU Manager for exclusive CPU allocation, IRQ affinity steering to non-application cores, and Cilium's socket-level BPF acceleration provides the best results. After applying these fixes, verify with both CPU monitoring and application-level benchmarks to confirm the contention is resolved.
