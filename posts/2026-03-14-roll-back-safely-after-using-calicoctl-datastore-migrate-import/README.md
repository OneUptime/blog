# Rolling Back Safely After Using calicoctl datastore migrate import

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Rollback, Kubernetes

Description: Safe rollback procedures when calicoctl datastore migrate import encounters issues during Calico datastore migration.

---

## Introduction

Datastore migration is a multi-step process, and issues at any step require careful rollback. The rollback strategy depends on which step failed and whether the migration was partially completed. Having a clear rollback plan is essential before starting any migration.

## Prerequisites

- Backup of all Calico resources (taken before migration)
- Access to the original datastore
- `calicoctl` configured for the source datastore

## Rollback Strategy

### Before Migration Was Finalized

If the migration has not been finalized (lock step not completed):

```bash
# Reconnect to the original datastore
export DATASTORE_TYPE=etcdv3  # Or kubernetes, depending on your original

# Verify the original data is still intact
calicoctl get nodes
calicoctl get ippools

# Resume using the original datastore
# No further action needed - the original datastore was not modified
```

### If Data Was Partially Migrated

```bash
# Apply resources from backup to restore the original state
BACKUP_DIR="migration-backup-*"

for r in globalnetworkpolicies networkpolicies bgpconfigurations bgppeers ippools felixconfigurations; do
  if [ -f "$BACKUP_DIR/$r.yaml" ]; then
    echo "Restoring $r..."
    calicoctl apply -f "$BACKUP_DIR/$r.yaml"
  fi
done
```

### Emergency: Restore from Full Backup

```bash
#!/bin/bash
# emergency-restore.sh
BACKUP_DIR="${1:?Usage: $0 <backup-dir>}"

echo "=== Emergency Restoration ==="
echo "Restoring from $BACKUP_DIR"

# Restore in dependency order
for r in ippools felixconfigurations bgpconfigurations bgppeers globalnetworkpolicies networkpolicies; do
  if [ -f "$BACKUP_DIR/$r.yaml" ]; then
    echo "Restoring $r..."
    calicoctl apply -f "$BACKUP_DIR/$r.yaml" 2>&1
  fi
done

# Verify
echo ""
echo "Restoration complete. Verifying..."
calicoctl get nodes
calicoctl get ippools
```

## Verification

After rollback:

```bash
# Verify all resources are restored
calicoctl get nodes -o wide
calicoctl get ippools
calicoctl get globalnetworkpolicies

# Test connectivity
kubectl run rollback-test --image=busybox --restart=Never -- sleep 10
kubectl get pod rollback-test -o wide
kubectl delete pod rollback-test --grace-period=0
```

## Troubleshooting

- **Cannot connect to original datastore**: Verify the DATASTORE_TYPE and connection parameters match the original configuration.
- **Some resources cannot be restored**: Check for schema version differences. Some resources may need manual adjustment.
- **Cluster networking disrupted during rollback**: Restart calico-node pods to force reconnection to the correct datastore.

## Conclusion

The most important aspect of migration rollback is having complete backups taken before the migration started. With proper backups, you can always restore the original Calico configuration regardless of what went wrong during the migration process.
