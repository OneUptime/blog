# Fixing Native Routing Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Native Routing, BPF, BGP

Description: How to fix native routing performance in Cilium, covering route configuration, BPF host routing, and BGP integration.

---

## Introduction

Native routing mode in Cilium eliminates tunnel encapsulation overhead by routing pod traffic directly through the underlying network. This provides the best possible throughput and latency, but requires proper route configuration between nodes.

Fixing native routing issues involves ensuring correct route advertisement, enabling BPF host routing, and configuring BGP when auto-direct routes are insufficient.

This guide provides the specific steps and commands for native routing performance management.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Enabling Optimal Native Routing

```bash
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set tunnel=disabled \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set ipv4NativeRoutingCIDR="10.0.0.0/8" \
  --set bpf.hostLegacyRouting=false \
  --set bpf.masquerade=true \
  --set kubeProxyReplacement=true
```

## Fixing Missing Routes

```bash
# If autoDirectNodeRoutes doesn't work (e.g., different subnets)
# Use BGP control plane
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set bgpControlPlane.enabled=true

# Configure BGP peering
kubectl apply -f - <<YAML
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPPeeringPolicy
metadata:
  name: bgp-peering
spec:
  virtualRouters:
  - localASN: 65000
    exportPodCIDR: true
    neighbors:
    - peerAddress: "10.0.0.1/32"
      peerASN: 65000
# Note: CiliumBGPPeeringPolicy (v2alpha1) is legacy.
# For new deployments, use CiliumBGPClusterConfig, CiliumBGPPeerConfig,
# and CiliumBGPAdvertisement resources instead.
YAML
```

## Fixing BPF Host Routing

```bash
# If host routing shows "Legacy"
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set bpf.hostLegacyRouting=false

# Verify after restart
cilium status --verbose | grep "Host Routing"
```

## Verification

```bash
cilium status --verbose | grep -E "DatapathMode|Host Routing|Routing"
ip route show | head -20
```

## Troubleshooting

- **Routes not appearing**: Check autoDirectNodeRoutes and ensure nodes are on the same L2 segment, or use BGP.
- **BPF host routing not activating**: Requires kubeProxyReplacement=true and compatible kernel (5.10+).
- **Asymmetric throughput**: Check for different NIC speeds or route path differences between nodes.
- **BGP peering not establishing**: Verify BGP ASN configuration and firewall rules for TCP port 179.

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

Native routing in Cilium provides the best possible network performance by eliminating tunnel overhead. Fixing native routing configuration ensures pods benefit from direct routing with BPF host routing acceleration, achieving 90%+ of bare-metal throughput.
