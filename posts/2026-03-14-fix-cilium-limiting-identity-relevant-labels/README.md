# Fixing Cilium Limiting Identity-Relevant Labels

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Scalability, Performance

Description: How to fix issues with Cilium's identity-relevant labels configuration, which directly impacts scalability and policy computation performance.

---

## Introduction

Cilium's security identity system assigns a unique numeric identity to each distinct set of security-relevant labels. When too many labels are identity-relevant, the number of unique identities can explode, causing increased memory usage, slower policy computation, and larger BPF maps.

Fixing identity label issues means configuring which labels Cilium considers for identity assignment, reducing the total number of unique identities without breaking network policies.

This guide provides the specific steps for managing identity-relevant labels in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, `kubectl`, and access to `cilium-dbg` in the Cilium agent pods
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Configuring Identity-Relevant Labels

```bash
# Limit which labels are used for identity

helm upgrade cilium cilium/cilium --namespace kube-system \
  --set-string labels='app$'
```

This tells Cilium to include the `app` label pattern for identity computation. When at least one inclusive label pattern is configured, Cilium only considers matching labels plus its default inclusive patterns, which include the pod namespace and Cilium policy labels.

## Step-by-Step Migration

```bash
# Step 1: Check current identity count
kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg identity list | wc -l

# Step 2: Identify unnecessary labels
kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg identity list -o json | \
  jq -r '.[].labels[]' | grep -v -E "app|namespace|policy" | sort | uniq -c | sort -rn

# Step 3: Apply label restriction
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set-string labels='app$'

# Step 4: Restart agents so existing endpoints get identities from the new label patterns
kubectl rollout restart -n kube-system ds/cilium
kubectl rollout status -n kube-system ds/cilium --timeout=5m
# If the Cilium Operator manages identities, restart it too
kubectl rollout restart -n kube-system deployment/cilium-operator
kubectl rollout status -n kube-system deployment/cilium-operator --timeout=5m

# Step 5: Verify identity count reduced
kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg identity list | wc -l
```

## Including Custom Labels

```bash
# If you need specific labels for policy, include them
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set-string labels='app$ team$ environment$'
```

## Verification

```bash
kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg identity list | wc -l
cilium config view | grep labels
```

## Troubleshooting

- **Identity count not decreasing after label change**: Restart Cilium agents so existing endpoints are regenerated, then wait for old identities to be garbage collected.
- **Policies broken after label restriction**: Add the missing label to the identity-relevant list.
- **Cannot reduce below certain count**: Pod namespace and Cilium default inclusive labels remain identity-relevant.
- **Agent memory still high**: Identity reduction takes effect gradually as endpoints regenerate.

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
timeout 5 kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg monitor --type drop | head -5 || echo "No drops in 5 seconds"

# 4. Endpoint health
echo "4. Endpoint health:"
kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg endpoint list | grep -c "ready"
kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg endpoint list | grep -c "not-ready"

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

Fixing Cilium's identity-relevant labels is essential for scalability. By carefully selecting which labels contribute to security identities, you can reduce identity count by 10x or more in large clusters, directly improving policy computation time and reducing resource consumption.
