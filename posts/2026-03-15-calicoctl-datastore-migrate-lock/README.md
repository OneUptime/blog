# How to Use calicoctl datastore migrate lock with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore, Migration, Kubernetes, etcd, Lock, DevOps

Description: Learn how to use calicoctl datastore migrate lock to prevent changes during a Calico datastore migration.

---

## Introduction

When migrating Calico data between datastores, it is critical to prevent configuration changes from taking effect during the migration window. The `calicoctl datastore migrate lock` command marks the Calico datastore as not ready for migration, ensuring that new or updated Calico resources do not affect the cluster while you export and import data.

Without locking the datastore, changes made after the export but before the import completes could affect the running cluster but be missing from the imported target datastore. This could result in missing network policies, stale IP allocations, or inconsistent BGP configurations in the target datastore.

This guide covers how to use `calicoctl datastore migrate lock` as part of a safe migration workflow.

## Prerequisites

- `calicoctl` configured with datastore access
- Admin-level access to the Calico datastore
- A planned maintenance window for the migration
- All cluster operators notified of the migration lock

## Locking the Datastore

Lock the datastore to prevent new changes from affecting the cluster:

```bash
calicoctl datastore migrate lock
```

Successful output:

```text
Datastore locked.
```

Once locked, new or updated Calico resources can still be written to the datastore, but they do not take effect in the cluster until the migration is completed and the datastore is unlocked:

```bash
calicoctl apply -f new-policy.yaml
```

```text
Successfully applied 1 'GlobalNetworkPolicy' resource(s)
```

## Unlocking the Datastore

After migration is complete and verified, unlock the datastore:

```bash
calicoctl datastore migrate unlock
```

Output:

```text
Datastore unlocked.
```

## Understanding Lock Behavior

When the datastore is locked:

- New or updated Calico resources do not affect the cluster until the datastore is unlocked
- `calicoctl apply`, `calicoctl create`, `calicoctl replace`, and `calicoctl delete` can still update the datastore
- Read operations like `calicoctl get` continue to work normally
- The Calico control plane continues to enforce existing dataplane state
- New pods will not be started until the lock is released
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
echo "   IPPools: $(calicoctl get ippools | tail -n +2 | wc -l)"
echo "   GlobalNetworkPolicies: $(calicoctl get globalnetworkpolicies | tail -n +2 | wc -l)"
echo "   NetworkPolicies: $(calicoctl get networkpolicies -A | tail -n +2 | wc -l)"
echo "   BGPPeers: $(calicoctl get bgppeers | tail -n +2 | wc -l)"

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
echo "IPPools: $(calicoctl get ippools | tail -n +2 | wc -l)"
echo "Policies: $(calicoctl get globalnetworkpolicies | tail -n +2 | wc -l)"

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
calicoctl get clusterinformation default -o yaml
```

Look for the `spec.datastoreReady` field:

```yaml
spec:
  datastoreReady: false
```

## Handling Lock Emergencies

If the migration must be aborted and the datastore needs to be unlocked immediately:

```bash
# Emergency unlock
calicoctl datastore migrate unlock

# Verify write operations work
calicoctl get ippools -o yaml | head -5
```

For a Kubernetes API datastore, you can also verify the `ClusterInformation` resource with `kubectl`:

```bash
kubectl get clusterinformation default -o yaml
```

## Verification

After completing the migration and unlocking:

```bash
# Verify datastore is writable
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
calicoctl delete globalnetworkpolicy migration-test

echo "Datastore is writable. Migration lock successfully released."
```

## Troubleshooting

- **Cannot lock**: Verify `calicoctl` has access to the datastore and can update the `ClusterInformation` resource.
- **Cannot unlock**: Verify `calicoctl` has admin-level access to the datastore. If `calicoctl` is unreachable, restore access to the datastore before attempting to unlock it.
- **Pods failing after lock**: The lock prevents new policy changes from affecting the cluster but does not affect existing dataplane state. If pods are failing, check Calico component logs.
- **Lock persists after crash**: If the migration process crashed without unlocking, manually run `calicoctl datastore migrate unlock` to restore write access.

## Conclusion

The `calicoctl datastore migrate lock` command is a critical safety mechanism that ensures new Calico resources do not affect the cluster during Calico datastore migrations. Always lock the datastore before exporting data, verify the import in the target datastore, and only unlock after confirming the migration was successful. Having an emergency unlock procedure documented ensures you can recover quickly if the migration process is interrupted.
