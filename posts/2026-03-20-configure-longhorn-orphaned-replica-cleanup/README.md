# How to Configure Longhorn Orphaned Replica Cleanup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Maintenance, Orphaned Replicas, Cleanup

Description: Configure Longhorn to automatically detect and clean up orphaned replica directories on nodes that waste disk space from deleted or failed volumes.

## Introduction

Orphaned replica directories are leftover data directories on Longhorn nodes that are no longer associated with any active Longhorn volume. They can accumulate over time as volumes are deleted, nodes are replaced, or unexpected failures occur. Left unmanaged, these directories can consume significant disk space. Longhorn provides settings to automatically detect and clean up these orphaned directories.

## What Causes Orphaned Replicas?

Orphaned replicas can result from:
- Volumes deleted while a node was offline
- Node failures during replica deletion
- Manual deletion of Kubernetes resources without proper cleanup
- Longhorn upgrades that changed storage directory structure
- Incomplete volume deletion due to bugs

## Detecting Orphaned Replicas

### Via Longhorn UI

1. Open the Longhorn UI
2. Navigate to **Node**
3. Look for any nodes showing orphaned data
4. Navigate to **Volume** and look for any orphaned resources

### Via kubectl

```bash
# Check for orphaned replicas in Longhorn

kubectl get orphans.longhorn.io -n longhorn-system

# Get details about orphaned resources
kubectl describe orphans.longhorn.io -n longhorn-system
```

### Manually Check Node Disks

```bash
# SSH to a node and check for replica directories
ls -la /var/lib/longhorn/replicas/

# Compare with active replicas in Kubernetes
kubectl get replicas.longhorn.io -n longhorn-system \
  -o jsonpath='{.items[*].spec.dataDirectoryName}' | tr ' ' '\n'

# Find directories not in the Kubernetes replica list
diff \
  <(ls /var/lib/longhorn/replicas/ | sort) \
  <(kubectl get replicas.longhorn.io -n longhorn-system \
    -o jsonpath='{.items[*].spec.dataDirectoryName}' | tr ' ' '\n' | sort)
```

## Configuring Automatic Orphan Cleanup

### Enable Automatic Orphan Cleanup

```bash
# Enable automatic orphaned replica cleanup
kubectl patch settings.longhorn.io orphan-resource-auto-deletion \
  -n longhorn-system \
  --type merge \
  -p '{"value": "true"}'

# Verify the setting
kubectl get settings.longhorn.io orphan-resource-auto-deletion \
  -n longhorn-system -o yaml
```

When enabled, Longhorn automatically removes detected orphaned replicas after a configurable wait period.

### Via Longhorn UI

1. Navigate to **Setting** → **Orphan**
2. Toggle **Auto Deletion** to enabled
3. Click **Save**

## Manual Orphan Cleanup

### Listing Orphaned Resources

```bash
# List all orphaned resources detected by Longhorn
kubectl get orphans.longhorn.io -n longhorn-system

# Get detailed information about each orphan
kubectl get orphans.longhorn.io -n longhorn-system \
  -o custom-columns="NAME:.metadata.name,NODE:.spec.nodeID,TYPE:.spec.orphanType,DISK:.spec.parameters.DiskName,PATH:.spec.parameters.DiskPath,DATA:.spec.parameters.DataName"
```

### Deleting Specific Orphans

```bash
# Delete a specific orphan (removes the directory from the node)
kubectl delete orphan.longhorn.io <orphan-name> -n longhorn-system

# Delete all orphans (careful!)
kubectl delete orphans.longhorn.io --all -n longhorn-system
```

### Via Longhorn UI

1. Navigate to **Volume** or **Node** section
2. Look for the "Orphan" tab or section
3. Select orphans to delete
4. Click **Delete**

## Configuring Orphan Detection Interval

```bash
# Check the orphan detection configuration
kubectl get settings.longhorn.io -n longhorn-system | grep orphan
```

## Safe Manual Cleanup Script

If you need to manually clean up orphaned directories (use with caution):

```bash
#!/bin/bash
# safe-orphan-cleanup.sh - Safely identify and optionally remove orphaned replicas

echo "=== Longhorn Orphan Detection ==="

# Get all active replica directory names from Kubernetes
ACTIVE_PATHS=$(kubectl get replicas.longhorn.io -n longhorn-system \
  -o jsonpath='{.items[*].spec.dataDirectoryName}' 2>/dev/null | tr ' ' '\n')

# Check each disk directory on this node
DISK_PATH="/var/lib/longhorn/replicas"

echo "Checking replica directories in $DISK_PATH..."
for dir in "$DISK_PATH"/*/; do
  dirname=$(basename "$dir")
  if echo "$ACTIVE_PATHS" | grep -q "$dirname"; then
    echo "ACTIVE: $dirname"
  else
    SIZE=$(du -sh "$dir" 2>/dev/null | cut -f1)
    echo "ORPHANED: $dirname (Size: $SIZE)"
    echo "  → Delete with: rm -rf $dir"
  fi
done
```

## Preventing Orphan Accumulation

### Best Practices

1. **Always delete volumes properly** via the Longhorn UI or by deleting PVCs
2. **Ensure nodes are online** before deleting volumes
3. **Monitor disk usage** - sudden drops in available space may indicate orphan accumulation
4. **Enable auto-deletion** in production environments

## Monitoring for Orphaned Data

```bash
# Create a simple monitoring script
cat << 'EOF' > check-orphans.sh
#!/bin/bash
ORPHAN_COUNT=$(kubectl get orphans.longhorn.io -n longhorn-system \
  --no-headers 2>/dev/null | wc -l)

if [ "$ORPHAN_COUNT" -gt 0 ]; then
  echo "WARNING: $ORPHAN_COUNT orphaned replica(s) detected!"
  kubectl get orphans.longhorn.io -n longhorn-system
else
  echo "No orphaned replicas detected."
fi
EOF
chmod +x check-orphans.sh
./check-orphans.sh
```

## Conclusion

Orphaned replica cleanup is an important maintenance task for keeping Longhorn storage healthy and preventing unnecessary disk space consumption. By enabling automatic orphan deletion and setting up monitoring for orphan accumulation, you can maintain a clean storage environment with minimal manual intervention. Always verify an orphan is truly orphaned before deleting it - Longhorn's orphan detection is reliable, but a brief review before bulk deletion is good practice in production environments.
