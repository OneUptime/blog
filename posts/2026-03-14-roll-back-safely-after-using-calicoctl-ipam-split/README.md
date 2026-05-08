# Rolling Back Safely After Using calicoctl ipam split

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Rollback, Kubernetes

Description: Safe procedures for reverting changes or recovering from issues after using calicoctl ipam split.

---

## Introduction

Understanding how to recover from unexpected results when using `calicoctl ipam split` is an important operational skill. Whether the command produced unintended side effects or revealed issues that require remediation, having a clear rollback strategy ensures you can recover quickly.

## Prerequisites

- Knowledge of the cluster state before the operation
- `calicoctl` and `kubectl` access
- Backup of the Calico datastore or IPPool manifests if available

## Recovery Procedures

### If the Command Modified State

`calicoctl ipam split` modifies state by replacing one IP pool with smaller IP pools. Recovery depends on the specific change:

```bash
# Check current IPAM state

calicoctl ipam show
calicoctl ipam check

# If addresses were incorrectly released during cleanup, affected pods
# may need to be restarted to get new IP allocations
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

### If Only Validation Commands Were Run

Read-only validation commands such as `calicoctl ipam show` and `calicoctl ipam check` do not modify state, so no rollback is needed. Focus on interpreting and acting on the information correctly.

### Restoring IPAM State

```bash
# calicoctl ipam split and report-based IPAM cleanup should be run
# while the Calico datastore is locked.
calicoctl datastore migrate lock

# To inspect and restore a healthy state:

# 1. Verify IP pools are correct
calicoctl get ippools -o yaml

# 2. Run IPAM check to find inconsistencies
calicoctl ipam check -o report.json

# 3. Clean up any issues
# For leaked addresses, review the report and release only addresses
# that are no longer used by real endpoints.
calicoctl ipam release --from-report report.json

# 4. Unlock the datastore to restore normal IPAM operation
calicoctl datastore migrate unlock

# 5. Verify recovery
calicoctl ipam show
```

## Verification

```bash
# Confirm IPAM is healthy after recovery
calicoctl ipam check
calicoctl ipam show

# Test pod creation
kubectl run recovery-test --image=busybox --restart=Never --command -- sleep 10
kubectl get pod recovery-test -o wide
kubectl delete pod recovery-test --ignore-not-found
```

## Troubleshooting

- **Cannot restore previous IP assignments**: IP addresses are dynamically allocated. Previous assignments cannot be exactly restored without restoring the underlying Calico datastore from backup, but new allocations will work correctly once IPAM is healthy.
- **Need to undo the split exactly**: There is no `calicoctl ipam merge` rollback command. Restore a known-good datastore backup or carefully recreate the intended IPPool resources after confirming no allocations will be orphaned.
- **IPAM check shows persistent issues**: Some issues require reviewing the IPAM report and releasing leaked addresses with `calicoctl ipam release --from-report`. See the IPAM check troubleshooting guide.

## Conclusion

Recovery from `calicoctl ipam split` operations starts with confirming the resulting IP pools are correct and using the Calico datastore lock appropriately during remediation. For read-only validation commands, focus on correct interpretation. For state-modifying recovery work, verify IPAM health and remediate issues using the check, release, and show commands.
