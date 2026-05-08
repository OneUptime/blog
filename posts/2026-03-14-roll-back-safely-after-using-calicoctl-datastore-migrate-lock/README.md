# Rolling Back Safely After Using calicoctl datastore migrate lock

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Rollback, Kubernetes

Description: Safe rollback procedures when calicoctl datastore migrate lock encounters issues during Calico datastore migration.

---

## Introduction

Datastore migration is a multi-step process, and issues at any step require careful rollback. The rollback strategy depends on which step failed and whether the migration was partially completed. Having a clear rollback plan is essential before starting any migration.

## Prerequisites

- Backup of all Calico resources (taken before migration)
- Access to the original datastore
- `calicoctl` configured for the source datastore

## Rollback Strategy

### Before Migration Was Finalized

If the Kubernetes datastore has not been unlocked after import, you can still roll back to the original etcd datastore:

```bash
# Lock the Kubernetes datastore so imported resources do not affect the cluster
export DATASTORE_TYPE=kubernetes
calicoctl datastore migrate lock

# Remove Calico resources imported into the Kubernetes datastore
kubectl delete $(kubectl get crds -o name | grep projectcalico.org)

# Reconfigure Calico to read from the original etcd datastore
# Replace this with the Calico manifest for your original etcd-backed install
kubectl apply -f calico-etcd.yaml

# Reconnect calicoctl to the original datastore and unlock it
export DATASTORE_TYPE=etcdv3
calicoctl datastore migrate unlock
```

### If Data Was Partially Migrated

```bash
# If resources were imported into Kubernetes but the datastore was not unlocked,
# delete the imported Kubernetes datastore resources and return to etcd.
export DATASTORE_TYPE=kubernetes
calicoctl datastore migrate lock
kubectl delete $(kubectl get crds -o name | grep projectcalico.org)

kubectl apply -f calico-etcd.yaml

export DATASTORE_TYPE=etcdv3
calicoctl datastore migrate unlock
```

### Emergency: Restore from Full Backup

```bash
#!/bin/bash
# emergency-restore.sh
BACKUP_DIR="${1:?Usage: $0 <backup-dir>}"

echo "=== Emergency Restoration ==="
echo "Restoring from $BACKUP_DIR"

# Apply all YAML or JSON resource manifests in the backup directory
calicoctl apply -f "$BACKUP_DIR"

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
kubectl delete pod rollback-test --now
```

## Troubleshooting

- **Cannot connect to original datastore**: Verify the DATASTORE_TYPE and connection parameters match the original configuration.
- **Some resources cannot be restored**: Check for schema version differences. Some resources may need manual adjustment.
- **Cluster networking disrupted during rollback**: Verify Calico is configured to read from the original datastore and wait for the calico-node DaemonSet rollout to complete.

## Conclusion

The most important aspect of migration rollback is having complete backups taken before the migration started. With proper backups, you can restore Calico configuration, but the documented datastore rollback path is only available before the Kubernetes datastore has been unlocked.
