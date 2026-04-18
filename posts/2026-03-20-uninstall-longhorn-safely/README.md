# How to Uninstall Longhorn Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Uninstall, Maintenance

Description: A safe and complete process for uninstalling Longhorn from your Kubernetes cluster, including data migration, volume cleanup, and dependency removal.

## Introduction

Uninstalling Longhorn requires careful execution to avoid data loss. Unlike stateless applications, Longhorn manages persistent data, so you must ensure all data is either migrated or explicitly acknowledged for deletion before proceeding. This guide covers the complete uninstallation process with safety checks at each step.

## Pre-Uninstall Checklist

Before uninstalling Longhorn, complete these checks:

```bash
# 1. List all PVCs using Longhorn

kubectl get pvc --all-namespaces \
  -o json | \
  jq -r '.items[] | select(.spec.storageClassName == "longhorn") |
    "\(.metadata.namespace)/\(.metadata.name): \(.spec.resources.requests.storage)"'

# 2. Check if any PVCs are still in use
kubectl get pvc --all-namespaces \
  -o json | \
  jq -r '.items[] |
    select(.spec.storageClassName == "longhorn" and .status.phase == "Bound") |
    .metadata.namespace + "/" + .metadata.name'

# 3. Check backup status - ensure critical data is backed up externally
kubectl get backupvolumes.longhorn.io -n longhorn-system
kubectl get backups.longhorn.io -n longhorn-system
```

## Step 1: Migrate Data Away from Longhorn

Before uninstalling, migrate any data you need to keep to a different storage solution.

### Option A: Backup to External Storage

```bash
# Trigger backups for all Longhorn volumes via the UI
# Backup → Select all volumes → Create Backup
# Then download or restore these to your new storage

# Or trigger via kubectl:
kubectl get volumes.longhorn.io -n longhorn-system -o name | while read vol; do
  echo "Create backup for $vol"
done
```

### Option B: Copy Data to New PVCs

```yaml
# migration-pod.yaml - Copy data from Longhorn to new storage
apiVersion: v1
kind: Pod
metadata:
  name: migrate-data
spec:
  restartPolicy: Never
  containers:
    - name: migrator
      image: alpine
      command:
        - sh
        - -c
        - "cp -av /old/. /new/ && echo Migration complete"
      volumeMounts:
        - name: old-storage
          mountPath: /old
        - name: new-storage
          mountPath: /new
  volumes:
    - name: old-storage
      persistentVolumeClaim:
        claimName: my-longhorn-pvc     # Longhorn PVC
    - name: new-storage
      persistentVolumeClaim:
        claimName: my-new-storage-pvc  # New storage PVC
```

## Step 2: Scale Down All Workloads Using Longhorn Volumes

```bash
# Find all pods using Longhorn PVCs
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
    select(.spec.volumes[]?.persistentVolumeClaim.claimName != null) |
    .metadata.namespace + "/" + .metadata.name' 2>/dev/null

# Scale down deployments using Longhorn volumes
# Replace with your actual deployment names
kubectl scale deployment my-app --replicas=0 -n default
kubectl scale statefulset my-db --replicas=0 -n default
```

## Step 3: Delete PVCs and Volumes

```bash
# Delete all PVCs using Longhorn (WARNING: This deletes data if not backed up!)
# PVCs don't carry a storageClass label, so filter by the storageClassName field:
kubectl get pvc --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.storageClassName == "longhorn") |
    "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do kubectl delete pvc -n "$ns" "$name"; done

# Or delete them one by one for safety
kubectl get pvc -n default | grep longhorn
kubectl delete pvc my-app-data -n default
```

## Step 4: Change the Reclaim Policy (if needed)

If Longhorn PVs have a `Retain` policy, you need to handle them:

```bash
# Check PV reclaim policies
kubectl get pv | grep longhorn

# For Retain volumes, manually delete them after confirming data is migrated
kubectl delete pv <pv-name>
```

## Step 5: Uninstall Using the Longhorn Uninstall Job

Longhorn provides an official uninstall process that safely removes CRDs and data:

### Via Longhorn UI

1. Navigate to **Setting** → **General**
2. Click **Uninstall**
3. Type `Longhorn` to confirm
4. Click **Confirm**

This starts the Longhorn uninstaller that removes all Longhorn data from disks.

### Via kubectl (Helm Installation)

```bash
# Uninstall the Helm release
helm uninstall longhorn -n longhorn-system

# Wait for uninstall job to complete
kubectl get jobs -n longhorn-system
kubectl wait --for=condition=complete job/longhorn-uninstall \
  -n longhorn-system --timeout=300s
```

### Via kubectl (manifest Installation)

```bash
# Step 1: Deploy the uninstall job
kubectl create -f https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/uninstall/uninstall.yaml

# Step 2: Wait for the uninstall job to complete
kubectl get job/longhorn-uninstall -n longhorn-system -w

# Step 3: Delete the Longhorn deployment
kubectl delete -f https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/deploy/longhorn.yaml

# Step 4: Delete the uninstall job
kubectl delete -f https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/uninstall/uninstall.yaml
```

## Step 6: Remove Longhorn Namespace and CRDs

```bash
# Delete the longhorn-system namespace
kubectl delete namespace longhorn-system

# Remove Longhorn CRDs (use with caution)
kubectl get crd | grep longhorn | awk '{print $1}' | \
  xargs kubectl delete crd

# Verify all Longhorn CRDs are removed
kubectl get crd | grep longhorn
```

## Step 7: Remove Data from Node Disks

Longhorn stores replica data on node disks. Clean this up manually:

```bash
# SSH to each node and remove Longhorn data
rm -rf /var/lib/longhorn/replicas/
rm -rf /var/lib/longhorn/engine-binaries/
rm -rf /var/lib/longhorn/longhorn-disk.cfg

# If you used custom disk paths, clean those too
rm -rf /mnt/longhorn-disk1/replicas/
```

## Step 8: Remove the Storage Class

```bash
# Delete the Longhorn storage class
kubectl delete storageclass longhorn
kubectl delete storageclass longhorn-static  # If it exists
```

## Step 9: Verify Complete Removal

```bash
# Verify no Longhorn resources remain
kubectl get all -n longhorn-system 2>&1
# Should show: "No resources found in longhorn-system namespace"

kubectl get crd | grep longhorn
# Should show no results

kubectl get storageclass | grep longhorn
# Should show no results

kubectl get pvc --all-namespaces | grep longhorn
# Should show no results
```

## Conclusion

Uninstalling Longhorn safely requires discipline and careful execution to prevent data loss. By following the sequence - migrate data first, scale down workloads, delete volumes, run the official uninstaller, then clean up remaining resources - you can completely remove Longhorn while maintaining control over your data. Never skip the data backup/migration step, as Longhorn data on local disks will not be recoverable once it is deleted.
