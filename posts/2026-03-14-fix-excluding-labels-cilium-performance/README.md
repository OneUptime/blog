# Fixing Excluding Labels in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Exclusion, Performance, Scalability

Description: How to fix label exclusion issues in Cilium that cause identity explosion and performance degradation.

---

## Introduction

Label exclusion in Cilium allows you to remove specific high-cardinality labels from identity computation while keeping all other labels identity-relevant. This is particularly useful for labels like `pod-template-hash` that are automatically added by Kubernetes controllers and have unique values per ReplicaSet.

Preventing label exclusion issues requires default exclusion of known high-cardinality labels, automated cardinality monitoring, and identity growth alerting.

This guide provides the specific steps for managing label exclusion in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- Understanding of Cilium identity system
- Access to Cilium configuration

## Excluding High-Cardinality Labels

```bash
# Exclude common high-cardinality labels
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set labels="k8s:!pod-template-hash k8s:!controller-revision-hash k8s:!pod-template-generation"
```

This approach is useful when you want most labels to remain identity-relevant but need to exclude specific problematic ones.

## Combining Include and Exclude

```bash
# You can also use the include approach for more control
# This is often cleaner for large clusters
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set labels="k8s:app k8s:io.kubernetes.pod.namespace k8s:io.cilium.k8s.policy"
```

## Verifying Exclusion

```bash
# After applying exclusion, verify identities no longer use excluded labels
kubectl rollout restart ds/cilium -n kube-system
kubectl rollout status ds/cilium -n kube-system
sleep 120

# Check that excluded labels don't appear in identities
cilium identity list -o json | jq '.[].labels[]' | grep "pod-template-hash" | wc -l
# Should be 0

# Verify identity count decreased
cilium identity list | wc -l
```

## Automated Exclusion Discovery

```bash
#!/bin/bash
# auto-exclude.sh - Find labels that should be excluded

echo "Labels with >50 unique values (candidates for exclusion):"
kubectl get pods --all-namespaces -o json | \
  jq -r '[.items[].metadata.labels | to_entries[]] | group_by(.key) | .[] | {
    label: .[0].key,
    unique_values: ([.[].value] | unique | length),
    total_pods: length
  } | select(.unique_values > 50) | "\(.label): \(.unique_values) unique values across \(.total_pods) pods"'
```

## Verification

```bash
cilium config view | grep labels
cilium identity list | wc -l
cilium identity list -o json | jq '.[0:3] | .[].labels'
```

## Troubleshooting

- **Excluded label needed for policy**: Remove it from the exclusion list and add to include list instead.
- **Identity count unchanged after exclusion**: Restart Cilium agents and wait for GC.
- **New Deployment creates identities rapidly**: Its pod-template-hash may not be excluded.
- **Exclusion syntax wrong**: Use `k8s:!label-name` format with the exclamation mark prefix.

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

Fixing label exclusion in Cilium addresses one of the most common sources of identity explosion. By excluding automatically-generated high-cardinality labels like pod-template-hash and controller-revision-hash, you can reduce identity count by 50% or more in typical Kubernetes clusters, directly improving policy computation performance and reducing BPF map pressure.
