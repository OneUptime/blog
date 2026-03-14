# Fixing WireGuard vs IPsec Performance Differences in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, WireGuard, IPsec, Encryption, Performance

Description: How to fix performance issues when choosing between WireGuard and IPsec in Cilium, including protocol-specific optimizations and migration strategies.

---

## Introduction

Once you have diagnosed whether WireGuard or IPsec performs better for your hardware, the next step is optimizing whichever protocol you choose. Each has specific tuning options that can significantly improve performance beyond the default configuration.

If you need to switch protocols, this guide also covers the migration path between WireGuard and IPsec with minimal disruption. The key is ensuring the transition does not leave nodes with mismatched encryption configurations.

This guide provides optimization steps for both protocols and the migration procedure between them.

## Prerequisites

- Diagnosed encryption performance difference
- Kubernetes cluster with Cilium v1.14+
- `helm` and `kubectl` access
- Maintenance window for protocol switch

## Optimizing WireGuard

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=wireguard \
  --set tunnel=disabled \
  --set routingMode=native \
  --set bpf.hostLegacyRouting=false \
  --set MTU=1380
```

Kernel tuning for WireGuard:
```bash
sysctl -w net.core.rmem_max=26214400
sysctl -w net.core.wmem_max=26214400
```

## Optimizing IPsec

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.enabled=true \
  --set encryption.type=ipsec \
  --set encryption.ipsec.keyFile=/etc/ipsec/keys \
  --set tunnel=disabled \
  --set routingMode=native

# Verify hardware offload is active
ip xfrm state | grep -i offload
```

Kernel tuning for IPsec:
```bash
# Increase xfrm state hash table
sysctl -w net.core.xfrm_acq_expires=30
```

## Migrating Between Protocols

```bash
# Step 1: Cordon nodes one at a time
kubectl cordon node-1

# Step 2: Update Cilium config
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set encryption.type=wireguard  # or ipsec

# Step 3: Wait for rollout
kubectl rollout status ds/cilium -n kube-system

# Step 4: Uncordon
kubectl uncordon node-1

# Step 5: Verify all nodes use the new protocol
cilium encrypt status
```

## Verification

```bash
cilium encrypt status
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'
```

## Troubleshooting

- **Performance regression after switch**: Allow 5 minutes for key establishment and re-benchmark.
- **Nodes with mixed encryption**: Rolling update may cause temporary mixed state. Wait for full rollout.
- **IPsec key management issues**: Ensure key file is consistent across all nodes.
- **WireGuard peer not established**: Check firewall rules allow UDP port 51871.

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

Fixing WireGuard vs IPsec performance issues involves protocol-specific optimization and, if needed, migration to the better-performing protocol. Both WireGuard and IPsec can be tuned significantly beyond defaults. If migration is needed, the rolling update approach ensures minimal disruption while transitioning the entire cluster to the optimal encryption protocol.
