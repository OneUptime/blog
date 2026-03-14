# Fixing Including Labels in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Performance, Configuration

Description: How to fix label inclusion configuration issues in Cilium that affect identity computation and network policy matching.

---

## Introduction

Including the right labels in Cilium's identity computation is a balancing act: too few labels and network policies cannot differentiate between workloads; too many labels and identity count explodes, degrading performance.

Fixing label inclusion means analyzing which labels your policies need and configuring exactly that set, no more and no less.

This guide provides the specific steps for managing label inclusion in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- Understanding of Cilium identity system
- Access to Cilium configuration

## Adding Required Labels

```bash
# Include labels needed by your network policies
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set labels="k8s:app k8s:io.kubernetes.pod.namespace k8s:io.cilium.k8s.policy k8s:component k8s:tier"
```

## Systematic Label Selection

```bash
#!/bin/bash
# find-required-labels.sh
# Analyzes policies to determine which labels must be included

echo "Analyzing CiliumNetworkPolicies..."
LABELS=$(kubectl get cnp --all-namespaces -o json | \
  jq -r '[.items[].spec | .. | .matchLabels? // empty | keys[]] | unique | .[]')

echo "Analyzing NetworkPolicies..."
K8S_LABELS=$(kubectl get networkpolicy --all-namespaces -o json | \
  jq -r '[.items[].spec | .. | .matchLabels? // empty | keys[]] | unique | .[]')

ALL_LABELS=$(echo -e "$LABELS\n$K8S_LABELS" | sort | uniq)

echo "Required labels for policies:"
echo "$ALL_LABELS"
echo ""

# Generate Helm set command
HELM_LABELS=$(echo "$ALL_LABELS" | sed 's/^/k8s:/' | tr '\n' ' ')
echo "Helm configuration:"
echo "--set labels="$HELM_LABELS""
```

## Applying Label Changes

```bash
# Apply the change
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set labels="$HELM_LABELS"

# Wait for rollout
kubectl rollout status ds/cilium -n kube-system

# Verify identity count changed
sleep 120
cilium identity list | wc -l
```

## Verification

```bash
cilium config view | grep labels
cilium identity list | wc -l
```

## Troubleshooting

- **Policies not matching after label change**: A required label was not included. Check policy selectors.
- **Identity count still high after filtering**: Check for high-cardinality labels in the include list.
- **Cannot determine which labels policies need**: Use the analysis script to extract labels from all policies.
- **Label config not persisting**: Ensure it is in the Helm values file, not just set via `cilium config`.

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

Fixing label inclusion in Cilium is crucial for maintaining the balance between policy expressiveness and performance. The right configuration includes only the labels needed for network policies, keeping identity count low and policy computation fast.
