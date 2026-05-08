# Rolling Back Safely After Using calicoctl ipam check

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Rollback, Kubernetes

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
# Releasing an IP does not remove it from any existing endpoint that is using it.
# It only makes the address available for assignment again.

# If the address was released while still in use, restart the affected pod
# so it receives an IP that is allocated in Calico IPAM.
kubectl delete pod <affected-pod> -n <namespace>

# The pod's controller (Deployment, StatefulSet, etc.) will recreate it.
```

Unfortunately, a released IP cannot be "un-released." The IP returns to the pool and may be allocated to another endpoint.

## Reverting Block Affinity Cleanup

If you removed a block affinity that was still needed:

```bash
# Check current block affinities
kubectl get blockaffinities.crd.projectcalico.org

# If a node lost its block affinity, Calico IPAM can claim new blocks
# when pods are scheduled.
# Restart calico-node on the affected node to force reinitialization
kubectl delete pod -n calico-system -l k8s-app=calico-node --field-selector spec.nodeName=<node>
```

## Prevention: Dry-Run Before Actions

Always check before releasing:

```bash
#!/bin/bash
# safe-ipam-cleanup.sh
# Generates and reviews an IPAM check report before any cleanup actions

echo "=== IPAM Cleanup Dry Run ==="
echo ""

# Prevent IPAM data from changing while the report is generated and reviewed
calicoctl datastore migrate lock
trap 'calicoctl datastore migrate unlock' EXIT

# Generate a report that can be reviewed before any release action
calicoctl ipam check -o report.json

echo ""
echo "Proposed actions:"

# Check for orphaned nodes
VALID_NODES=$(calicoctl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')
echo "$VALID_NODES" | while read -r node; do
  echo "  Valid node: $node"
done

echo ""
echo "Review report.json and the node list above before running any cleanup commands."
echo "If the leaked IP findings are valid, release them with:"
echo "  calicoctl ipam release --from-report report.json"
```

## Verification

After any rollback:

```bash
calicoctl ipam check
calicoctl ipam show
kubectl get pods --all-namespaces -o wide | grep -v Running | grep -v Completed
```

## Troubleshooting

- **IP was released while still in use**: Restart the affected pod so its recreated instance receives an IP that is allocated in Calico IPAM.
- **Node cannot allocate IPs after block cleanup**: Restart the calico-node pod on that node to force IPAM reinitialization.

## Conclusion

Since `calicoctl ipam check` is read-only, the rollback concern is about actions taken in response to its findings. Always validate findings before acting, use dry-run approaches, and understand that IP releases are irreversible but recoverable through pod recreation.
