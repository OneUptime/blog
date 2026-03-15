# Fixing Tunneling Performance Issues in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Tunneling, VXLAN, GENEVE, Native Routing

Description: How to fix tunneling-related performance issues in Cilium, covering VXLAN/Geneve overhead, MTU configuration, and native routing alternatives.

---

## Introduction

Tunneling (VXLAN or Geneve) in Cilium adds encapsulation overhead to every cross-node packet. This overhead includes additional headers (50-60 bytes), extra processing for encapsulation/decapsulation, and potential MTU-related fragmentation. Fixing these issues is critical for achieving optimal network performance.

The most impactful fix is switching to native routing mode, which eliminates tunnel overhead entirely. When tunneling is required, MTU optimization and BPF host routing minimize the impact.

This guide provides the specific steps for each aspect of tunnel performance management.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Switching to Native Routing

```bash
# The most impactful fix: disable tunneling entirely
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set ipv4NativeRoutingCIDR="10.0.0.0/8"
```

Ensure your network can route pod CIDRs between nodes. For cloud providers:

```bash
# AWS: Use VPC CNI routing or configure route tables
# GCP: Use alias IPs or configure custom routes
# Azure: Use Azure CNI routing mode
# On-prem: Configure BGP with Cilium's BGP control plane
```

## If Tunneling Is Required

```bash
# Use Geneve over VXLAN (better extensibility, similar overhead)
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set tunnelProtocol=geneve

# Optimize MTU for tunnel
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set mtu=1450  # For VXLAN/Geneve on 1500 MTU network

# If jumbo frames are available
# Physical MTU: 9000
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set mtu=8900  # Accounting for tunnel overhead
```

## Enable BPF Host Routing with Tunnel

```bash
# Even in tunnel mode, BPF host routing helps
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set bpf.hostLegacyRouting=false \
  --set kubeProxyReplacement=true
```

## Verification

```bash
cilium status --verbose | grep -E "Tunnel|DatapathMode"
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'
```

## Troubleshooting

- **Cannot switch to native routing**: Cloud provider may require specific network configuration. Check provider documentation.
- **MTU too low causes poor performance**: Verify with ping -M do and adjust MTU in Cilium config.
- **Fragmentation despite correct MTU**: Check for nested encapsulation (tunnel inside tunnel).
- **Native routing breaks cross-node**: Ensure node routes are configured correctly.

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

Fixing tunneling performance in Cilium is essential for optimal cross-node communication. Native routing eliminates tunnel overhead entirely and should be the default choice when the network supports it. When tunneling is required, proper MTU configuration and BPF host routing minimize the performance impact.
