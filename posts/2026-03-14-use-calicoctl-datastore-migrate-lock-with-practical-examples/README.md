# Using calicoctl datastore migrate lock with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Kubernetes, etcd

Description: Use calicoctl datastore migrate lock to prevent changes to the Calico datastore during migration, ensuring data consistency throughout the process.

---

## Introduction

Migrating Calico's datastore is a critical operation when transitioning between etcd and Kubernetes API datastore backends. The `calicoctl datastore migrate lock` command plays a key role in this process, enabling you to safely move Calico configuration data between datastore types.

Datastore migration is most commonly performed when moving from a standalone etcd deployment to the Kubernetes API datastore (KDD mode), which simplifies operations by eliminating the need to maintain a separate etcd cluster for Calico.

This guide provides practical examples and step-by-step procedures for using `calicoctl datastore migrate lock` effectively.

## Prerequisites

- A Calico cluster with the source datastore configured
- `calicoctl` v3.25+ installed
- Access to both source and target datastores
- A maintenance window (migration requires cluster coordination)
- Backup of all Calico resources

## Basic Usage

```bash
# Lock the datastore to prevent changes during migration
calicoctl datastore migrate lock
```

This sets a lock flag in the Calico datastore that prevents other calicoctl operations from modifying resources. It is a critical safety step during migration to ensure data consistency.

## Understanding the Lock Mechanism

The datastore lock:
- Prevents `calicoctl apply`, `calicoctl create`, `calicoctl delete`, and `calicoctl replace` operations
- Does not affect read operations (`calicoctl get`, `calicoctl ipam show`)
- Does not affect Calico runtime (Felix, BIRD continue to operate based on existing config)
- Must be explicitly unlocked after migration completes

## Step-by-Step Lock Usage

### Step 1: Verify Pre-Lock State

```bash
# Ensure all Calico resources are in the desired state before locking
calicoctl get nodes -o wide
calicoctl get ippools
calicoctl get globalnetworkpolicies

# Verify no pending changes
echo "Datastore is about to be locked."
```

### Step 2: Apply the Lock

```bash
# Lock the datastore
calicoctl datastore migrate lock

# Verify the lock is active
calicoctl datastore migrate lock --check 2>/dev/null || echo "Datastore is locked"
```

### Step 3: Verify Lock is Effective

```bash
# Attempting to modify resources should fail
echo "Testing lock..."
calicoctl apply -f test-resource.yaml 2>&1 | grep -i "locked\|migration"
echo "Lock is effective if the above shows a lock/migration message."
```

### Step 4: Proceed with Migration

```bash
# With the lock in place, export the data
calicoctl datastore migrate export > calico-export.yaml

# Then switch to target datastore and import
export DATASTORE_TYPE=kubernetes
calicoctl datastore migrate import -f calico-export.yaml
```

### Step 5: Unlock After Migration

```bash
# After successful migration and verification, unlock
calicoctl datastore migrate unlock

# Verify the unlock
calicoctl get nodes  # Should work normally now
```

## Safety Considerations

```bash
#!/bin/bash
# safe-lock.sh
# Locks the datastore with safety checks

echo "=== Pre-Lock Safety Checks ==="

# Ensure no active deployments
PENDING=$(kubectl get pods --all-namespaces --field-selector=status.phase=Pending --no-headers | wc -l)
if [ "$PENDING" -gt 0 ]; then
  echo "WARNING: $PENDING pods in Pending state. These may need IPAM changes."
  read -p "Continue with lock? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then exit 1; fi
fi

# Take final backup
echo "Taking pre-lock backup..."
BACKUP="pre-lock-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
for r in nodes ippools globalnetworkpolicies felixconfigurations bgpconfigurations; do
  calicoctl get "$r" -o yaml > "$BACKUP/$r.yaml" 2>/dev/null
done

# Apply lock
echo "Locking datastore..."
calicoctl datastore migrate lock

echo ""
echo "Datastore is now LOCKED."
echo "Backup saved to $BACKUP"
echo "IMPORTANT: Remember to unlock after migration with: calicoctl datastore migrate unlock"
```


## Verification

After running `calicoctl datastore migrate lock`:

```bash
# Verify Calico version and connectivity
calicoctl version

# Check node status
calicoctl get nodes -o wide

# Verify resources are intact
calicoctl get globalnetworkpolicies
calicoctl get ippools
calicoctl get bgpconfigurations
```

## Troubleshooting

- **Permission errors**: Ensure calicoctl has read/write access to both source and target datastores.
- **Connection timeouts**: Verify network connectivity to both etcd and Kubernetes API server.
- **Resource conflicts**: If resources already exist in the target datastore, use the `--allow-version-mismatch` flag cautiously.
- **Incomplete migration**: Always verify resource counts match between source and target.

## Conclusion

`calicoctl datastore migrate lock` is a critical part of the Calico datastore migration workflow. By following proper procedures, validating at each step, and maintaining backups, you can safely migrate your Calico configuration between datastore types with minimal risk.
