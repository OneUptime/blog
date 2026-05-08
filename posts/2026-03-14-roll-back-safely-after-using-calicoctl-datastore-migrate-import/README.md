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
- `calicoctl` configured for the datastore you are operating on

## Rollback Strategy

### Before Migration Was Finalized

If the migration has not been finalized (the Kubernetes datastore has not been unlocked):

```bash
# If resources were imported into the Kubernetes datastore, lock it first
export DATASTORE_TYPE=kubernetes
calicoctl datastore migrate lock

# Remove the Calico CRDs that were imported into the Kubernetes datastore
kubectl delete $(kubectl get crds -o name | grep projectcalico.org)

# Reconfigure Calico to read from the original etcd datastore
kubectl apply -f calico.yaml

# Reconnect calicoctl to the original datastore
export DATASTORE_TYPE=etcdv3
# Also set ETCD_ENDPOINTS and any required TLS options for your original datastore

# Verify the original data is still intact
calicoctl get nodes
calicoctl get ippools

# Unlock the original datastore
calicoctl datastore migrate unlock
```

### If Data Was Partially Migrated

```bash
# Rollback is only supported if the Kubernetes datastore has not been unlocked
export DATASTORE_TYPE=kubernetes
calicoctl datastore migrate lock

# Remove partially imported Calico resources from the Kubernetes datastore
kubectl delete $(kubectl get crds -o name | grep projectcalico.org)

# Reconfigure Calico and calicoctl to use the original etcd datastore
kubectl apply -f calico.yaml
export DATASTORE_TYPE=etcdv3
# Also set ETCD_ENDPOINTS and any required TLS options for your original datastore

calicoctl datastore migrate unlock
```

If you also need to restore saved Calico resources from backup after reconnecting to the original datastore:

```bash
# Apply resources from backup to restore the original state
BACKUP_DIR="${1:?Usage: $0 <backup-dir>}"

for r in ippools felixconfigurations bgpconfigurations bgppeers globalnetworkpolicies globalnetworksets networkpolicies networksets hostendpoints profiles tiers nodes kubecontrollersconfigurations; do
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
for r in ippools felixconfigurations bgpconfigurations bgppeers globalnetworkpolicies globalnetworksets networkpolicies networksets hostendpoints profiles tiers nodes kubecontrollersconfigurations; do
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
kubectl run rollback-test --image=busybox --restart=Never --command -- sleep 10
kubectl get pod rollback-test -o wide
kubectl delete pod rollback-test --ignore-not-found
```

## Troubleshooting

- **Cannot connect to original datastore**: Verify the DATASTORE_TYPE and connection parameters match the original configuration.
- **Some resources cannot be restored**: Check for schema version differences. Some resources may need manual adjustment.
- **Cluster networking disrupted during rollback**: After reconfiguring Calico for the original datastore, restart calico-node pods or wait for the DaemonSet rollout so the nodes reconnect to the correct datastore.

## Conclusion

The most important aspect of migration rollback is having complete backups taken before the migration started. Calico datastore migration can be rolled back only while the original etcd datastore still exists and the Kubernetes datastore has not been unlocked. With proper backups, you can restore the original Calico configuration if you need to recover resources after returning to the original datastore.
