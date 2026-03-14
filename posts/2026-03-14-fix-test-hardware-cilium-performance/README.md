# Fixing Test Hardware Issues in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Hardware, Optimization

Description: How to fix hardware configuration issues that limit Cilium performance, including NIC tuning, CPU governor settings, and NUMA alignment.

---

## Introduction

Fixing hardware issues for Cilium performance testing involves configuring hardware to its optimal state and ensuring Cilium is aware of hardware capabilities. Many hardware features are disabled by default to save power or for compatibility, but they can significantly impact performance.

The fixes range from simple sysfs writes to firmware updates and BIOS changes. Start with the software-configurable options before considering hardware replacements.

This guide provides the specific commands to optimize hardware configuration for Cilium performance testing.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI and `kubectl` access
- Node-level root access
- Prometheus monitoring (recommended)

## NIC Optimization

```bash
# Maximize queues
ethtool -L eth0 combined $(nproc)

# Enable all relevant offloads
ethtool -K eth0 rx-checksum on tx-checksum-ipv4 on
ethtool -K eth0 gro on gso on tso on

# Maximize ring buffers
ethtool -G eth0 rx 4096 tx 4096

# Set optimal RSS hash
ethtool -N eth0 rx-flow-hash tcp4 sdfn
```

## CPU Configuration

```bash
# Set performance governor on all CPUs
for gov in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
  echo performance > $gov
done

# Disable turbo boost for consistent results (optional)
echo 1 > /sys/devices/system/cpu/intel_pstate/no_turbo 2>/dev/null || true

# Disable deep C-states (add to kernel cmdline)
# intel_idle.max_cstate=1 processor.max_cstate=1
```

## NUMA Alignment

```bash
# Pin IRQs to the NIC's NUMA node
NIC_NUMA=$(cat /sys/class/net/eth0/device/numa_node)
CPUS=$(cat /sys/devices/system/node/node${NIC_NUMA}/cpulist)
echo "Pin workloads to CPUs: $CPUS"

# Set IRQ affinity
for IRQ in $(grep eth0 /proc/interrupts | awk -F: '{print $1}' | tr -d ' '); do
  echo $(cat /sys/devices/system/node/node${NIC_NUMA}/cpumap) > /proc/irq/$IRQ/smp_affinity
done
```

## DaemonSet for Persistent Configuration

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: hardware-tuner
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: hardware-tuner
  template:
    metadata:
      labels:
        app: hardware-tuner
    spec:
      hostNetwork: true
      hostPID: true
      initContainers:
      - name: tune
        image: busybox:1.36
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          for gov in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
            echo performance > $gov 2>/dev/null
          done
          ethtool -L eth0 combined $(nproc) 2>/dev/null || true
          ethtool -G eth0 rx 4096 tx 4096 2>/dev/null || true
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
```

## Verification

```bash
# Run the validation checks above
# All items should show PASS
cilium status --verbose
```

## Troubleshooting

- **Validation fails on specific nodes**: Check if nodes were provisioned from different images.
- **Kernel module load fails**: Verify the module is available for your kernel version.
- **Cilium status unhealthy**: Check agent logs with `kubectl logs -n kube-system ds/cilium`.
- **Tools missing in containers**: Use an image that includes the required tools or mount from host.

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

Properly fixing test hardware issues is essential for reliable Cilium performance testing. Each component plays a role in the accuracy and reproducibility of benchmark results.
