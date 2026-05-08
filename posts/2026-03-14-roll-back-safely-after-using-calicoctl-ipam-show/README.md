# Rolling Back Safely After Using calicoctl ipam show

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Rollback, Kubernetes

Description: Safe procedures for reverting changes or recovering from issues after using calicoctl ipam show.

---

## Introduction

The `calicoctl ipam show` command is read-only and does not modify any cluster state. There is nothing to roll back from running this command itself. However, actions taken in response to its output (such as releasing IP addresses or modifying IP pools) may need to be rolled back if they cause issues.

## Prerequisites

- Knowledge of the cluster state before the operation
- `calicoctl` and `kubectl` access
- Backup of IPAM state if available

## Recovery Procedures

### If the Command Modified State

For commands that modify IPAM state, recovery depends on the specific operation:

```bash
# Check current IPAM state

calicoctl ipam show
calicoctl ipam check

# If IPs used by live endpoints were incorrectly released, affected pods
# may need to be recreated so they receive valid IP allocations
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

### If the Command Was Read-Only

Read-only IPAM commands do not modify state, so no rollback is needed. Focus on interpreting and acting on the information correctly.

### Restoring IPAM State

```bash
# IPAM health depends on Calico IPAM datastore records, running endpoints,
# and IP pool configuration staying consistent
# To restore healthy state:

# 1. Verify IP pools are correct
calicoctl get ippools -o yaml

# 2. Run IPAM check to find inconsistencies
calicoctl ipam check

# 3. Clean up any issues
# (Follow specific remediation for each issue type)

# 4. Verify recovery
calicoctl ipam show
```

## Verification

```bash
# Confirm IPAM is healthy after recovery
calicoctl ipam check
calicoctl ipam show

# Test pod creation
kubectl run recovery-test --image=busybox --restart=Never -- sleep 10
kubectl get pod recovery-test -o wide
kubectl delete pod recovery-test --force --grace-period=0
```

## Troubleshooting

- **Cannot restore previous IP assignments**: IP addresses are dynamically allocated. Previous assignments cannot generally be exactly restored, but new allocations should work correctly after IPAM consistency issues are resolved.
- **IPAM check shows persistent issues**: Some issues require manual cleanup of IPAM block resources. See the IPAM check troubleshooting guide.

## Conclusion

Since `calicoctl ipam show` is a read-only command, no rollback is needed for the command itself. Focus on correctly interpreting its output before taking any remediation actions, and always back up IPAM state before making changes based on its findings.
