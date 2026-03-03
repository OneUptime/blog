# How to Restore Individual Resources from Backup on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Backup Recovery, Velero, Resource Restoration

Description: Learn how to selectively restore individual Kubernetes resources from backups on Talos Linux for precise disaster recovery.

---

Full namespace or cluster restores are the nuclear option. Most real-world recovery scenarios are more targeted: someone accidentally deleted a deployment, a ConfigMap got overwritten with wrong values, or a single service needs to be rolled back to yesterday's state. Being able to surgically restore individual resources from a backup saves time and avoids disrupting the rest of your cluster.

On Talos Linux, where the immutable OS ensures node-level stability, most recovery operations focus on Kubernetes resources. This guide covers techniques for restoring individual resources from Velero backups and other backup sources on a Talos Linux cluster.

## Understanding Velero's Restore Filtering

Velero provides several filters that let you narrow down what gets restored from a backup:

- **--include-resources**: Only restore specific resource types
- **--exclude-resources**: Restore everything except specific types
- **--include-namespaces**: Only restore from specific namespaces
- **--selector**: Only restore resources matching label selectors
- **--namespace-mappings**: Restore to a different namespace

These filters can be combined for precise targeting.

## Listing Backup Contents

Before restoring, examine what is in the backup.

```bash
# List all backups
velero backup get

# Describe a specific backup to see what it contains
velero backup describe daily-full-20240115020000 --details

# View the backup logs
velero backup logs daily-full-20240115020000
```

For a more detailed inventory, download and inspect the backup.

```bash
# Download the backup contents
velero backup download daily-full-20240115020000

# Extract and examine the contents
tar -xzf daily-full-20240115020000-data.tar.gz
ls resources/

# List all resources in the backup
find resources/ -name "*.json" | head -50

# View a specific resource
cat resources/deployments.apps/namespaces/production/my-app.json | jq '.metadata.name, .spec.replicas'
```

## Restoring a Single Deployment

```bash
# Restore only Deployment resources from a specific namespace
velero restore create restore-deployment \
  --from-backup daily-full-20240115020000 \
  --include-namespaces production \
  --include-resources deployments.apps \
  --wait

# If you need a specific deployment, use label selectors
velero restore create restore-my-app \
  --from-backup daily-full-20240115020000 \
  --include-namespaces production \
  --include-resources deployments.apps \
  --selector app=my-app \
  --wait

# Check the restore status
velero restore describe restore-my-app
```

## Restoring a ConfigMap or Secret

Accidentally overwritten configurations are one of the most common recovery scenarios.

```bash
# Restore a specific ConfigMap
velero restore create restore-config \
  --from-backup daily-full-20240115020000 \
  --include-namespaces production \
  --include-resources configmaps \
  --selector app=my-app \
  --wait

# Restore secrets
velero restore create restore-secrets \
  --from-backup daily-full-20240115020000 \
  --include-namespaces production \
  --include-resources secrets \
  --selector app=my-app \
  --wait
```

If the resource already exists and you want to overwrite it with the backup version, you need to delete it first. By default, Velero skips resources that already exist.

```bash
# Delete the current (broken) configmap
kubectl delete configmap app-config -n production

# Then restore it from backup
velero restore create restore-config \
  --from-backup daily-full-20240115020000 \
  --include-namespaces production \
  --include-resources configmaps \
  --selector app=my-app \
  --wait

# Verify the restored configmap
kubectl get configmap app-config -n production -o yaml
```

## Restoring a Service and Its Endpoints

```bash
# Restore a service
velero restore create restore-service \
  --from-backup daily-full-20240115020000 \
  --include-namespaces production \
  --include-resources services,endpoints \
  --selector app=my-app \
  --wait
```

## Restoring PersistentVolumeClaims and Data

Restoring persistent data is more complex because it involves both the PVC resource and the actual volume data.

```bash
# Restore PVCs and their data
velero restore create restore-pvc \
  --from-backup daily-full-20240115020000 \
  --include-namespaces production \
  --include-resources persistentvolumeclaims,persistentvolumes \
  --selector app=database \
  --restore-volumes \
  --wait

# Check the PVC status
kubectl get pvc -n production -l app=database

# Verify the pod can mount the restored volume
kubectl get pods -n production -l app=database
```

If the PVC already exists, you might need to delete it and the associated PV first.

```bash
# Scale down the application that uses the volume
kubectl scale deployment database -n production --replicas=0

# Delete the existing PVC
kubectl delete pvc database-data -n production

# Wait for the PV to be released
kubectl get pv | grep database-data

# Restore the PVC and data from backup
velero restore create restore-db-data \
  --from-backup daily-full-20240115020000 \
  --include-namespaces production \
  --include-resources persistentvolumeclaims \
  --selector app=database \
  --restore-volumes \
  --wait

# Scale the application back up
kubectl scale deployment database -n production --replicas=1
```

## Restoring RBAC Resources

```bash
# Restore roles and role bindings
velero restore create restore-rbac \
  --from-backup daily-full-20240115020000 \
  --include-namespaces production \
  --include-resources roles,rolebindings \
  --wait

# For cluster-scoped RBAC resources
velero restore create restore-cluster-rbac \
  --from-backup daily-full-20240115020000 \
  --include-resources clusterroles,clusterrolebindings \
  --selector managed-by=team-alpha \
  --wait
```

## Restoring CronJobs and Jobs

```bash
# Restore a specific CronJob
velero restore create restore-cronjob \
  --from-backup daily-full-20240115020000 \
  --include-namespaces production \
  --include-resources cronjobs \
  --selector app=report-generator \
  --wait
```

## Manual Resource Extraction from Backup

Sometimes you want to inspect or modify a resource before restoring it. You can extract individual resources from a Velero backup.

```bash
# Download the backup
velero backup download daily-full-20240115020000

# Extract the backup contents
mkdir backup-contents
tar -xzf daily-full-20240115020000-data.tar.gz -C backup-contents

# Find the specific resource you need
find backup-contents/resources -name "*.json" | grep "my-app"

# Extract and convert the resource to YAML
cat backup-contents/resources/deployments.apps/namespaces/production/my-app.json | \
  jq 'del(.metadata.resourceVersion, .metadata.uid, .metadata.creationTimestamp, .metadata.generation, .status)' | \
  yq eval -P - > my-app-restored.yaml

# Review the resource before applying
cat my-app-restored.yaml

# Apply the modified resource
kubectl apply -f my-app-restored.yaml
```

## Comparing Backup vs Current State

Before restoring, compare the backup version with what is currently running.

```bash
# Extract the backup version of a deployment
velero backup download daily-full-20240115020000
tar -xzf daily-full-20240115020000-data.tar.gz
cat resources/deployments.apps/namespaces/production/my-app.json | \
  jq 'del(.metadata.resourceVersion, .metadata.uid, .metadata.creationTimestamp, .metadata.generation, .metadata.managedFields, .status)' > backup-version.json

# Get the current version
kubectl get deployment my-app -n production -o json | \
  jq 'del(.metadata.resourceVersion, .metadata.uid, .metadata.creationTimestamp, .metadata.generation, .metadata.managedFields, .status)' > current-version.json

# Compare them
diff <(jq -S . backup-version.json) <(jq -S . current-version.json)
```

## Building a Restore Helper Script

Create a utility script that simplifies common restore operations.

```bash
#!/bin/bash
# restore-resource.sh - Helper for restoring individual resources

BACKUP_NAME=$1
NAMESPACE=$2
RESOURCE_TYPE=$3
RESOURCE_NAME=$4

if [ -z "$BACKUP_NAME" ] || [ -z "$NAMESPACE" ] || [ -z "$RESOURCE_TYPE" ]; then
  echo "Usage: $0 <backup-name> <namespace> <resource-type> [resource-name]"
  echo ""
  echo "Examples:"
  echo "  $0 daily-full-20240115 production deployment my-app"
  echo "  $0 daily-full-20240115 production configmap"
  echo "  $0 daily-full-20240115 production secret my-secret"
  exit 1
fi

RESTORE_NAME="restore-$(date +%s)"

# Build the restore command
CMD="velero restore create ${RESTORE_NAME} \
  --from-backup ${BACKUP_NAME} \
  --include-namespaces ${NAMESPACE} \
  --include-resources ${RESOURCE_TYPE}"

# Add label selector if resource name is provided
if [ -n "$RESOURCE_NAME" ]; then
  # Check if the resource exists and warn
  kubectl get "${RESOURCE_TYPE}" "${RESOURCE_NAME}" -n "${NAMESPACE}" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "WARNING: ${RESOURCE_TYPE}/${RESOURCE_NAME} already exists in ${NAMESPACE}"
    echo "Velero will skip it unless you delete it first."
    read -p "Delete existing resource? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      kubectl delete "${RESOURCE_TYPE}" "${RESOURCE_NAME}" -n "${NAMESPACE}"
      echo "Deleted. Proceeding with restore..."
    fi
  fi
fi

echo "Running: $CMD"
eval "$CMD --wait"

# Show results
echo ""
echo "Restore status:"
velero restore describe "${RESTORE_NAME}"
```

## Handling Restore Conflicts

When restoring resources that already exist, Velero follows these rules:

- **Existing resources are skipped by default**
- **There is no built-in overwrite option**
- **You must delete the existing resource first if you want to restore from backup**

For a safe restore workflow:

```bash
# 1. Back up the current (broken) state first
kubectl get deployment my-app -n production -o yaml > my-app-current.yaml

# 2. Delete the current resource
kubectl delete deployment my-app -n production

# 3. Restore from the known-good backup
velero restore create fix-my-app \
  --from-backup daily-full-20240115020000 \
  --include-namespaces production \
  --include-resources deployments.apps \
  --selector app=my-app \
  --wait

# 4. If the restore does not work, you can revert to the saved current state
# kubectl apply -f my-app-current.yaml
```

## Wrapping Up

The ability to restore individual resources from backup is one of the most practical disaster recovery skills you can have. On Talos Linux, where the OS is immutable and reliable, most incidents involve Kubernetes resource misconfiguration or accidental deletion rather than node failures. Velero's filtering capabilities let you surgically restore exactly what you need without touching the rest of the cluster. Practice these techniques before you need them - run through scenarios like restoring a deleted deployment, recovering an overwritten ConfigMap, or bringing back a corrupted persistent volume. When an actual incident happens, you will be able to respond quickly and confidently.
