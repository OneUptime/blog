# How to Use calicoctl datastore migrate lock with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Datastore, Migration, Kubernetes, etcd, Lock, DevOps

Description: Learn how to use calicoctl datastore migrate lock to prevent changes during a Calico datastore migration.

---

## Introduction

When migrating Calico data between datastores, it is critical to prevent any configuration changes during the migration window. The `calicoctl datastore migrate lock` command puts the Calico datastore into a read-only mode, ensuring that no new resources are created, modified, or deleted while you export and import data.

Without locking the datastore, changes made after the export but before the import completes would be lost. This could result in missing network policies, stale IP allocations, or inconsistent BGP configurations in the target datastore.

This guide covers how to use `calicoctl datastore migrate lock` as part of a safe migration workflow.

## Prerequisites

- `calicoctl` configured with datastore access
- Admin-level access to the Calico datastore
- A planned maintenance window for the migration
- All cluster operators notified of the migration lock

## Locking the Datastore

Lock the datastore to prevent modifications:

```bash
calicoctl datastore migrate lock
```

Successful output:

```
Datastore locked for migration.
All write operations are now blocked.
```

Once locked, any attempt to modify Calico resources will fail:

```bash
calicoctl apply -f new-policy.yaml
```

```
Error: datastore is locked for migration. Unlock with 'calicoctl datastore migrate unlock'.
```

## Unlocking the Datastore

After migration is complete and verified, unlock the datastore:

```bash
calicoctl datastore migrate unlock
```

Output:

```
Datastore unlocked. Write operations are now permitted.
```

## Understanding Lock Behavior

When the datastore is locked:

- All `calicoctl apply`, `calicoctl create`, `calicoctl replace`, and `calicoctl delete` operations are rejected
- Read operations like `calicoctl get` continue to work normally
- The Calico control plane (Felix, BIRD, Typha) continues to enforce existing policies
- No new pods will receive Calico network policies until the lock is released
- Existing pod connectivity is not affected

## Pre-Lock Checklist

Before locking, verify the cluster is in a stable state:

```bash
#!/bin/bash
echo "=== Pre-Lock Checklist ==="

echo "1. Checking Calico component health..."
kubectl get pods -n calico-system --no-headers | grep -v Running
UNHEALTHY=$?
if [ $UNHEALTHY -eq 0 ]; then
  echo "   WARNING: Some Calico pods are not Running"
else
  echo "   All Calico pods are Running"
fi

echo ""
echo "2. Checking for pending changes..."
kubectl get events -n calico-system --field-selector reason=Updated --no-headers | tail -5

echo ""
echo "3. Current resource counts..."
echo "   IPPools: $(calicoctl get ippools --no-headers | wc -l)"
echo "   GlobalNetworkPolicies: $(calicoctl get gnp --no-headers | wc -l)"
echo "   NetworkPolicies: $(calicoctl get np -A --no-headers | wc -l)"
echo "   BGPPeers: $(calicoctl get bgppeers --no-headers | wc -l)"

echo ""
echo "4. IPAM consistency..."
calicoctl ipam check

echo ""
read -p "Proceed with datastore lock? (y/n) " CONFIRM
if [ "$CONFIRM" = "y" ]; then
  calicoctl datastore migrate lock
  echo "Datastore is now locked."
else
  echo "Lock cancelled."
fi
```

## Complete Migration Workflow with Lock

The lock is used as part of the full migration process:

```bash
#!/bin/bash
set -e

echo "========================================="
echo "  Calico Datastore Migration"
echo "========================================="

# Phase 1: Pre-flight checks
echo ""
echo "Phase 1: Pre-flight checks"
calicoctl node status
calicoctl ipam check

# Phase 2: Lock the source datastore
echo ""
echo "Phase 2: Locking datastore"
calicoctl datastore migrate lock
echo "Datastore locked at $(date)"

# Phase 3: Export all data
echo ""
echo "Phase 3: Exporting data"
EXPORT_FILE="calico-migration-$(date +%Y%m%d-%H%M%S).yaml"
calicoctl datastore migrate export > "$EXPORT_FILE"
echo "Exported to $EXPORT_FILE"
grep "^kind:" "$EXPORT_FILE" | sort | uniq -c

# Phase 4: Switch to target datastore and import
echo ""
echo "Phase 4: Importing to target datastore"
# Save source config
SOURCE_DATASTORE_TYPE=$DATASTORE_TYPE

# Configure target
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/path/to/target-kubeconfig

calicoctl datastore migrate import -f "$EXPORT_FILE"

# Phase 5: Verify import
echo ""
echo "Phase 5: Verifying import"
echo "IPPools: $(calicoctl get ippools --no-headers | wc -l)"
echo "Policies: $(calicoctl get gnp --no-headers | wc -l)"

# Phase 6: Unlock source (or switch to target)
echo ""
echo "Phase 6: Post-migration"
echo "Migration data exported and imported successfully."
echo "Verify the target cluster before unlocking the source."
echo "Run: calicoctl datastore migrate unlock"
```

## Monitoring Lock Status

Check whether the datastore is currently locked:

```bash
calicoctl datastore migrate lock --check 2>&1 || echo "Checking lock status..."
```

You can also verify by attempting a dry-run operation:

```bash
# This will fail if the datastore is locked
calicoctl get ippools -o yaml | calicoctl apply -f - 2>&1 | head -1
```

## Handling Lock Emergencies

If the migration must be aborted and the datastore needs to be unlocked immediately:

```bash
# Emergency unlock
calicoctl datastore migrate unlock

# Verify write operations work
calicoctl get ippools -o yaml | head -5
```

If `calicoctl` cannot reach the datastore to unlock it, you may need to directly modify the lock in the datastore:

For etcd:

```bash
etcdctl del /calico/migration/lock \
  --endpoints=https://10.0.1.10:2379 \
  --cacert=/etc/calico/certs/ca.pem \
  --cert=/etc/calico/certs/cert.pem \
  --key=/etc/calico/certs/key.pem
```

For Kubernetes API datastore, the lock is stored as a ConfigMap:

```bash
kubectl delete configmap calico-migration-lock -n kube-system
```

## Verification

After completing the migration and unlocking:

```bash
# Verify datastore is unlocked
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: migration-test
spec:
  selector: migration-test == "true"
  types:
  - Ingress
EOF

# Clean up test resource
calicoctl delete gnp migration-test

echo "Datastore is writable. Migration lock successfully released."
```

## Troubleshooting

- **Cannot lock**: Another migration may be in progress. Check for existing locks and ensure no other operator is performing a migration.
- **Cannot unlock**: Verify `calicoctl` has admin-level access to the datastore. If `calicoctl` is unreachable, use the emergency direct datastore access methods described above.
- **Pods failing after lock**: The lock prevents new policy creation but does not affect existing policies. If pods are failing, the issue is likely unrelated to the lock. Check Calico component logs.
- **Lock persists after crash**: If the migration process crashed without unlocking, manually run `calicoctl datastore migrate unlock` to restore write access.

## Conclusion

The `calicoctl datastore migrate lock` command is a critical safety mechanism that ensures data consistency during Calico datastore migrations. Always lock the datastore before exporting data, verify the import in the target datastore, and only unlock after confirming the migration was successful. Having an emergency unlock procedure documented ensures you can recover quickly if the migration process is interrupted.
