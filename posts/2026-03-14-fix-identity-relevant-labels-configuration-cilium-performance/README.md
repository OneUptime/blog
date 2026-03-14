# Fixing Identity-Relevant Labels Configuration in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Configuration, Performance

Description: How to fix identity-relevant labels configuration issues in Cilium that impact performance and scalability.

---

## Introduction

The identity-relevant labels configuration in Cilium determines which Kubernetes labels are used to compute security identities. This configuration directly impacts the total number of identities, BPF map sizes, policy computation time, and ultimately network performance.

Fixing the configuration means selecting the minimal set of labels needed for network policies while excluding high-cardinality labels that cause identity explosion.

This guide provides the specific steps for managing identity-relevant labels configuration.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Configuring Optimal Label Selection

```bash
# For most clusters, these labels are sufficient:
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set labels="k8s:app k8s:io.kubernetes.pod.namespace k8s:io.cilium.k8s.policy"

# For clusters using additional labels in policies:
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set labels="k8s:app k8s:io.kubernetes.pod.namespace k8s:io.cilium.k8s.policy k8s:component k8s:tier"
```

## Verifying Policy Compatibility

```bash
# Before changing labels, check which labels are used in policies
kubectl get cnp --all-namespaces -o json | \
  jq '[.items[].spec | .. | .matchLabels? // empty | keys[]] | unique | sort'

# Ensure all policy-referenced labels are in the identity-relevant list
```

## Triggering Identity Regeneration

```bash
# After changing label configuration, restart agents
kubectl rollout restart ds/cilium -n kube-system
kubectl rollout status ds/cilium -n kube-system

# Verify identity count after regeneration
sleep 120  # Wait for GC
cilium identity list | wc -l
```

## Verification

```bash
cilium config view | grep labels
cilium identity list | wc -l
```

## Troubleshooting

- **Policies stop working after label change**: A required label was excluded. Add it back to the configuration.
- **Identity count not decreasing**: Restart Cilium agents and wait for GC cycle.
- **High-cardinality label needed for policy**: Consider restructuring policies to use namespace-level rules instead.
- **Configuration lost after upgrade**: Ensure labels are set in Helm values file, not just runtime config.

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

Fixing identity-relevant labels configuration is a critical scalability optimization in Cilium. The right label configuration can reduce identity count by orders of magnitude, directly improving policy computation performance and reducing BPF map pressure in large clusters.
