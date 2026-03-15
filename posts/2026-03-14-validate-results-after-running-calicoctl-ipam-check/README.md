# Validating Results After Running calicoctl ipam check

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Validation, Kubernetes

Description: Interpret calicoctl ipam check results accurately, distinguish between real issues and false positives, and validate that remediation actions resolved the problems.

---

## Introduction

The output of `calicoctl ipam check` requires careful interpretation. Not every reported issue needs immediate action, and some findings may be transient conditions that resolve on their own. Understanding how to validate the results ensures you take appropriate action without unnecessary changes.

## Prerequisites

- Output from `calicoctl ipam check`
- Access to kubectl for cross-referencing
- Understanding of pod lifecycle and IPAM mechanics

## Interpreting Results

### Leaked IPs: Real vs Transient

```bash
# An IP may appear leaked if a pod is in the process of terminating
# Wait 2 minutes and recheck
sleep 120
calicoctl ipam check

# Cross-reference with actual pods
LEAKED_IP="10.244.1.67"
kubectl get pods --all-namespaces -o wide | grep "$LEAKED_IP"
kubectl get pods --all-namespaces --field-selector=status.phase=Running -o wide | grep "$LEAKED_IP"
```

If the IP does not belong to any running or terminating pod after waiting, it is genuinely leaked.

### Orphaned Blocks: Verify Node Status

```bash
# A block may appear orphaned during node maintenance
# Check if the node is temporarily unavailable
kubectl get nodes | grep "NotReady"

# Only act on blocks for permanently removed nodes
ORPHANED_NODE="old-worker-05"
kubectl get node "$ORPHANED_NODE" 2>/dev/null || echo "Node does not exist - block is truly orphaned"
```

## Validation Script

```bash
#!/bin/bash
# validate-ipam-check.sh
# Validates IPAM check results and distinguishes real issues from transient ones

echo "=== IPAM Check Validation ==="
echo "First check:"
FIRST=$(calicoctl ipam check 2>&1)
echo "$FIRST"

FIRST_ISSUES=$(echo "$FIRST" | grep -cE "leaked|orphan" || echo 0)

if [ "$FIRST_ISSUES" -eq 0 ]; then
  echo "CLEAN: No issues found."
  exit 0
fi

echo ""
echo "Waiting 2 minutes for transient issues to resolve..."
sleep 120

echo "Second check:"
SECOND=$(calicoctl ipam check 2>&1)
echo "$SECOND"

SECOND_ISSUES=$(echo "$SECOND" | grep -cE "leaked|orphan" || echo 0)

echo ""
echo "=== Validation ==="
echo "First check issues: $FIRST_ISSUES"
echo "Second check issues: $SECOND_ISSUES"

if [ "$SECOND_ISSUES" -eq 0 ]; then
  echo "RESOLVED: Issues were transient."
elif [ "$SECOND_ISSUES" -lt "$FIRST_ISSUES" ]; then
  echo "IMPROVING: Some issues resolved, $SECOND_ISSUES remain."
  echo "ACTION: Investigate persistent issues."
  exit 1
else
  echo "PERSISTENT: $SECOND_ISSUES issues require attention."
  exit 1
fi
```

## Verification

```bash
./validate-ipam-check.sh
```

## Troubleshooting

- **Transient leaks from StatefulSet restarts**: StatefulSet pods maintain IP affinity. Brief leaks during rolling updates are normal.
- **Check results differ on each run**: This indicates active pod churn. Run during quiet periods for stable results.
- **Cannot determine if block is truly orphaned**: Check the Kubernetes node list, cloud provider console, and recent cluster operations logs.

## Conclusion

Validating `calicoctl ipam check` results prevents unnecessary remediation actions on transient issues. By running the check twice with a delay and cross-referencing with actual pod and node states, you accurately identify real IPAM issues that need attention.
