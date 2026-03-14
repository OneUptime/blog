# Fixing Encryption Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Encryption, WireGuard, IPsec, Performance

Description: How to fix encryption performance in Cilium, covering both WireGuard and IPsec overhead analysis and optimization.

---

## Introduction

Encryption in Cilium adds CPU overhead to every packet, reducing throughput and increasing latency compared to unencrypted networking. The magnitude of the overhead depends on the encryption protocol (WireGuard vs IPsec), hardware crypto support, and the workload characteristics.

Fixing encryption performance involves choosing the optimal protocol for your hardware, configuring MTU correctly, and tuning kernel parameters for crypto operations.

This guide covers the specific steps for managing encryption performance in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Choosing the Right Protocol

```bash
# Check hardware crypto support
grep -c aes /proc/cpuinfo  # For IPsec AES-GCM
grep -c -E "avx|ssse3" /proc/cpuinfo  # For WireGuard ChaCha20

# If AES-NI: consider IPsec for possible hardware offload
# If no AES-NI: WireGuard is likely faster
```

## Optimizing WireGuard

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=wireguard \
  --set tunnel=disabled \
  --set routingMode=native \
  --set MTU=1380
```

## Optimizing IPsec

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=ipsec \
  --set encryption.ipsec.keyFile=/etc/ipsec/keys

# Check for hardware offload
ip xfrm state | grep -i offload
ethtool -k eth0 | grep esp
```

## Kernel Tuning for Encryption

```bash
sysctl -w net.core.rmem_max=26214400
sysctl -w net.core.wmem_max=26214400
for gov in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
  echo performance > $gov
done
```

## Verification

```bash
cilium encrypt status
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'
```

## Troubleshooting

- **Encryption not active**: Verify Cilium helm values include encryption.enabled=true.
- **Overhead > 40%**: Check for userspace WireGuard or missing AES-NI for IPsec.
- **Some nodes not encrypted**: Check Cilium agent logs for key exchange errors.
- **Performance varies by node pair**: Different hardware capabilities across nodes.

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

Fixing encryption performance in Cilium ensures that the security benefits of transparent encryption come with acceptable performance overhead. With proper protocol selection, hardware utilization, and continuous monitoring, encryption overhead can be kept below 20-30%, making it practical for production deployments.
