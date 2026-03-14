# Fixing Baseline Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Baseline, Benchmarking

Description: How to fix baseline performance issues in Cilium by comparing pod-to-pod performance against host-to-host hardware baselines.

---

## Introduction

Baseline performance represents the maximum achievable throughput and minimum latency of your hardware without any CNI overhead. Every Cilium performance analysis should start with establishing this baseline, because it sets the upper bound for what is achievable.

Fixing baseline performance means configuring Cilium to minimize CNI overhead, bringing pod performance as close to host baseline as possible.

This guide provides the methodology and commands for baseline performance management in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Achieving Near-Baseline Pod Performance

```bash
# Optimal Cilium configuration for near-baseline performance
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set tunnel=disabled \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set ipv4NativeRoutingCIDR="10.0.0.0/8" \
  --set kubeProxyReplacement=true \
  --set bpf.masquerade=true \
  --set bpf.hostLegacyRouting=false \
  --set loadBalancer.acceleration=native \
  --set devices=eth0 \
  --set socketLB.enabled=true
```

## Kernel Tuning to Match Baseline

```bash
# Same sysctl values as used during host baseline measurement
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216
sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"
sysctl -w net.ipv4.tcp_congestion_control=bbr
sysctl -w net.core.netdev_max_backlog=5000
```

## Measuring Improvement

```bash
# After optimization, re-measure
POD_BPS=$(kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second')
HOST_BPS=<your_baseline>
EFFICIENCY=$(echo "scale=1; $POD_BPS * 100 / $HOST_BPS" | bc)
echo "Pod-to-host efficiency: ${EFFICIENCY}%"
echo "Target: > 95%"
```

## Verification

```bash
cilium status --verbose
echo "Compare pod throughput vs host baseline"
```

## Troubleshooting

- **Host baseline lower than expected**: Check NIC link speed, CPU governor, and kernel TCP tuning.
- **Pod performance much lower than host**: Check Cilium datapath mode -- tunnel mode adds significant overhead.
- **Inconsistent baseline measurements**: Increase test duration, check for background workloads.
- **Baseline changes after kernel update**: Re-run host baseline and update reference values.

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

Fixing baseline performance in Cilium establishes the reference point for all performance optimization. With optimal Cilium configuration (native routing, BPF host routing, XDP acceleration), pod-to-pod throughput should achieve 90-98% of host-to-host baseline, confirming minimal CNI overhead.
