# Fixing Test Environment Issues in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Testing, Environment Setup

Description: How to fix test environment issues that affect Cilium performance benchmarking accuracy and reliability.

---

## Introduction

Fixing test environment issues in Cilium performance testing means creating a controlled, reproducible environment where only the variable you are testing changes between runs. This requires standardizing node configurations, isolating test workloads, and eliminating background noise.

The fixes range from simple (cordoning test nodes) to comprehensive (dedicated test clusters with consistent hardware). The level of investment depends on how critical accurate performance data is to your organization.

This guide provides actionable fixes for the most common test environment issues.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- Multiple worker nodes for testing
- `kubectl`, `cilium` CLI, and node-level access
- Understanding of your hardware specifications

## Standardizing Node Configuration

```bash
# Apply consistent configuration to all test nodes
for node in $(kubectl get nodes -o name); do
  echo "=== $node ===" 

done

# Set kernel parameters

for node in node-1 node-2; do
  ssh $node "sysctl -w net.core.rmem_max=16777216; echo performance > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"
done
```

## Isolating Test Workloads

```bash
# Cordon and drain test nodes
kubectl cordon node-perf-1 node-perf-2
kubectl drain node-perf-1 --ignore-daemonsets --delete-emptydir-data

# Uncordon only for test pods
kubectl uncordon node-perf-1 node-perf-2
kubectl taint nodes node-perf-1 node-perf-2 dedicated=perf-testing:NoSchedule
```

## Standardizing Cilium Configuration

```bash

# Document the exact Cilium config for reproducibility
helm get values cilium -n kube-system -o yaml > cilium-test-config.yaml



```

## Verification

```bash
# Verify isolation
kubectl get pods --all-namespaces --field-selector spec.nodeName=node-perf-1
```

## Troubleshooting

- **Cannot drain DaemonSet pods**: Use --ignore-daemonsets flag. DaemonSet pods are expected.
- **Other teams scheduling on test nodes**: Add taints and ensure team policies restrict access.
- **Taint prevents monitoring pods**: Add tolerations to monitoring DaemonSets.

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


## Best Practices Summary

Following these best practices ensures long-term success with your Cilium deployment:

- Always measure before and after changes to quantify impact accurately
- Use version-controlled configuration files to prevent drift and enable rollback
- Automate recurring tasks like benchmarking and validation with CronJobs
- Keep kernel, Cilium, and tooling versions consistent across all nodes in the cluster
- Document every performance-related decision and its measured outcome for future reference
- Review performance metrics weekly as part of your operational routine to catch slow regressions


## Conclusion

Fixing test environment issues involves standardizing node configurations, isolating test workloads through cordoning and tainting, and documenting the exact Cilium configuration for reproducibility.
