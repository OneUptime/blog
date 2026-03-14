# Rolling Back Safely After Using calicoctl ipam check

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, IPAM, Rollback, Kubernetes

Description: Understand that calicoctl ipam check is read-only and learn how to safely revert any remediation actions taken based on its findings.

---

## Introduction

The `calicoctl ipam check` command is read-only and does not modify any cluster state. However, actions taken in response to its findings (such as releasing IP addresses or cleaning up block affinities) can be destructive and may need to be rolled back.

## Prerequisites

- Understanding of what actions were taken after the check
- Access to calicoctl and kubectl

## Reverting IP Release Actions

If you mistakenly released an IP that was still in use:

```bash
# The released IP will be reallocated when a new pod needs it
# The original pod may need to be restarted to get a new IP
kubectl delete pod <affected-pod> -n <namespace>

# The pod's controller (Deployment, StatefulSet, etc.) will recreate it with a new IP
```

Unfortunately, a released IP cannot be "un-released." The IP returns to the pool and may be allocated to a different pod.

## Reverting Block Affinity Cleanup

If you removed a block affinity that was still needed:

```bash
# Check current block affinities
kubectl get blockaffinities.crd.projectcalico.org

# If a node lost its block affinity, the Calico node process
# will automatically re-claim blocks when pods are scheduled
# Restart calico-node on the affected node to force reinitialization
kubectl delete pod -n calico-system -l k8s-app=calico-node --field-selector spec.nodeName=<node>
```

## Prevention: Dry-Run Before Actions

Always check before releasing:

```bash
#!/bin/bash
# safe-ipam-cleanup.sh
# Performs a dry-run before any cleanup actions

echo "=== IPAM Cleanup Dry Run ==="
echo ""

# Show what would be cleaned up
calicoctl ipam check

echo ""
echo "Proposed actions:"

# Check for orphaned nodes
VALID_NODES=$(calicoctl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')
echo "$VALID_NODES" | while read -r node; do
  echo "  Valid node: $node"
done

echo ""
echo "Review the above. To proceed with cleanup, run with --execute flag."
```

## Verification

After any rollback:

```bash
calicoctl ipam check
calicoctl ipam show
kubectl get pods --all-namespaces -o wide | grep -v Running | grep -v Completed
```

## Troubleshooting

- **Pod lost its IP after release**: The pod needs to be restarted. Its controller will schedule a new instance.
- **Node cannot allocate IPs after block cleanup**: Restart the calico-node pod on that node to force IPAM reinitialization.

## Conclusion

Since `calicoctl ipam check` is read-only, the rollback concern is about actions taken in response to its findings. Always validate findings before acting, use dry-run approaches, and understand that IP releases are irreversible but recoverable through pod recreation.
