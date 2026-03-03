# How to Back Up and Restore Namespaces on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Backup, Namespace Management, Velero

Description: Learn how to back up and restore individual Kubernetes namespaces on Talos Linux for granular disaster recovery and migration.

---

Full cluster backups are important, but sometimes you need more granular control. Maybe you need to restore a single application after an accidental deletion, migrate a namespace between clusters, or create a snapshot before a risky deployment. Namespace-level backup and restore gives you this flexibility without the overhead of a full cluster operation.

On Talos Linux, where the OS layer is stateless and rebuilt from configuration, the valuable data lives in your Kubernetes namespaces. This guide covers practical approaches to backing up and restoring individual namespaces, using both Velero and native kubectl techniques.

## Namespace Backup with Velero

Velero is the standard tool for Kubernetes backups, and it supports namespace-level operations out of the box.

### Backing Up a Single Namespace

```bash
# Back up the entire production namespace
velero backup create production-backup \
  --include-namespaces production \
  --wait

# Back up multiple specific namespaces
velero backup create team-backup \
  --include-namespaces team-alpha,team-beta \
  --wait

# Check the backup details
velero backup describe production-backup --details
```

### Including Persistent Volumes

To back up the data in persistent volumes, you need to configure the node agent (formerly Restic).

```bash
# Back up a namespace with all its persistent volumes
velero backup create production-full-backup \
  --include-namespaces production \
  --default-volumes-to-fs-backup \
  --wait

# Or selectively back up volumes using pod annotations
```

Add annotations to pods to specify which volumes to include.

```yaml
# annotated-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-database
  namespace: production
spec:
  template:
    metadata:
      annotations:
        # Include these specific volumes in backups
        backup.velero.io/backup-volumes: pgdata
        # Exclude temporary volumes
        backup.velero.io/backup-volumes-excludes: tmp,cache
    spec:
      containers:
        - name: postgres
          image: postgres:15
          volumeMounts:
            - name: pgdata
              mountPath: /var/lib/postgresql/data
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /var/cache
      volumes:
        - name: pgdata
          persistentVolumeClaim:
            claimName: postgres-data
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
```

### Restoring a Namespace

```bash
# Restore the namespace from backup
velero restore create production-restore \
  --from-backup production-backup \
  --wait

# Check restore status
velero restore describe production-restore

# View restore logs for any issues
velero restore logs production-restore
```

### Restoring to a Different Namespace

You can restore a namespace under a different name, which is useful for testing or creating staging environments from production data.

```bash
# Restore production namespace as staging
velero restore create staging-from-prod \
  --from-backup production-backup \
  --namespace-mappings production:staging \
  --wait

# Verify the resources were created in the new namespace
kubectl get all -n staging
```

### Restoring Specific Resources from a Namespace Backup

```bash
# Restore only deployments and services from the backup
velero restore create partial-restore \
  --from-backup production-backup \
  --include-resources deployments,services \
  --wait

# Restore only resources with a specific label
velero restore create labeled-restore \
  --from-backup production-backup \
  --selector app=my-critical-service \
  --wait
```

## Native kubectl Backup Approach

For quick namespace backups without Velero, you can export resources using kubectl.

### Exporting All Resources

```bash
# Export all resources from a namespace
kubectl get all,configmaps,secrets,pvc,ingress,networkpolicies,serviceaccounts,roles,rolebindings \
  -n production \
  -o yaml > production-backup.yaml

# For a more thorough export, specify the resource types explicitly
kubectl api-resources --namespaced=true -o name | \
  xargs -I {} kubectl get {} -n production -o yaml 2>/dev/null > production-complete-backup.yaml
```

### Cleaning Up the Export

The exported YAML contains runtime fields that prevent clean restoring. You need to strip these out.

```bash
# Use yq to clean up the exported resources
# Remove status fields, resourceVersion, uid, and other runtime data
yq eval 'del(.items[].metadata.resourceVersion,
             .items[].metadata.uid,
             .items[].metadata.creationTimestamp,
             .items[].metadata.generation,
             .items[].metadata.managedFields,
             .items[].status)' production-backup.yaml > production-clean-backup.yaml
```

Or use a script for more thorough cleanup.

```bash
#!/bin/bash
# backup-namespace.sh - Clean namespace backup script

NAMESPACE=$1
OUTPUT_DIR="./backups/${NAMESPACE}-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$OUTPUT_DIR"

# Resource types to back up
RESOURCES=(
  "deployments"
  "statefulsets"
  "daemonsets"
  "services"
  "configmaps"
  "secrets"
  "persistentvolumeclaims"
  "ingresses"
  "networkpolicies"
  "serviceaccounts"
  "roles"
  "rolebindings"
  "horizontalpodautoscalers"
  "poddisruptionbudgets"
  "cronjobs"
  "jobs"
)

for resource in "${RESOURCES[@]}"; do
  echo "Backing up $resource..."
  kubectl get "$resource" -n "$NAMESPACE" -o yaml 2>/dev/null | \
    yq eval 'del(.items[].metadata.resourceVersion,
                  .items[].metadata.uid,
                  .items[].metadata.creationTimestamp,
                  .items[].metadata.generation,
                  .items[].metadata.managedFields,
                  .items[].metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"],
                  .items[].status,
                  .metadata.resourceVersion)' - > "${OUTPUT_DIR}/${resource}.yaml"
done

echo "Backup saved to $OUTPUT_DIR"
```

```bash
chmod +x backup-namespace.sh
./backup-namespace.sh production
```

### Restoring with kubectl

```bash
# Restore all resources
kubectl apply -f production-clean-backup.yaml

# Or restore from the directory
for f in ./backups/production-*/*.yaml; do
  kubectl apply -f "$f"
done
```

## Automated Namespace Backup with CronJobs

Create a CronJob that backs up specific namespaces on a schedule.

```yaml
# namespace-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: namespace-backup
  namespace: backup-system
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-operator
          containers:
            - name: backup
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  NAMESPACES="production staging team-alpha"
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)

                  for ns in $NAMESPACES; do
                    echo "Backing up namespace: $ns"

                    # Create a Velero backup for each namespace
                    velero backup create "${ns}-${TIMESTAMP}" \
                      --include-namespaces "$ns" \
                      --default-volumes-to-fs-backup \
                      --ttl 168h \
                      --wait

                    STATUS=$(velero backup get "${ns}-${TIMESTAMP}" -o json | jq -r '.status.phase')
                    echo "Backup ${ns}-${TIMESTAMP}: $STATUS"

                    if [ "$STATUS" != "Completed" ]; then
                      echo "WARNING: Backup for $ns did not complete successfully"
                    fi
                  done
          restartPolicy: OnFailure
```

## Cross-Cluster Namespace Migration

You can use namespace backups to migrate workloads between Talos Linux clusters.

```bash
# On the source cluster: create the backup
velero backup create migration-backup \
  --include-namespaces app-to-migrate \
  --default-volumes-to-fs-backup \
  --wait

# Both clusters must use the same backup storage location (S3 bucket)
# On the target cluster: restore the backup
velero restore create migration-restore \
  --from-backup migration-backup \
  --wait

# Verify all resources are present
kubectl get all -n app-to-migrate
```

For clusters that do not share a backup storage location:

```bash
# Export from source cluster
kubectl get all,configmaps,secrets,pvc -n app-to-migrate -o yaml > migration.yaml

# Clean up the export
yq eval 'del(.items[].metadata.resourceVersion,
             .items[].metadata.uid,
             .items[].metadata.creationTimestamp,
             .items[].status)' migration.yaml > migration-clean.yaml

# Switch kubectl context to the target cluster
kubectl config use-context target-cluster

# Create the namespace and apply
kubectl create namespace app-to-migrate
kubectl apply -f migration-clean.yaml -n app-to-migrate
```

## Verifying Namespace Backups

Always verify your backups by testing the restore process.

```bash
# Create a test restore in a different namespace
velero restore create test-restore \
  --from-backup production-backup \
  --namespace-mappings production:restore-test \
  --wait

# Compare resource counts
echo "Original namespace:"
kubectl get all -n production --no-headers | wc -l

echo "Restored namespace:"
kubectl get all -n restore-test --no-headers | wc -l

# Check specific resources
kubectl get deployments -n production -o name | sort > /tmp/original.txt
kubectl get deployments -n restore-test -o name | sort > /tmp/restored.txt
diff /tmp/original.txt /tmp/restored.txt

# Clean up the test namespace
kubectl delete namespace restore-test
```

## Handling Namespace Dependencies

Some namespaces have dependencies on cluster-scoped resources like ClusterRoles, StorageClasses, or CRDs. Document these dependencies and include them in your backup plan.

```bash
# Find ClusterRoleBindings that reference the namespace
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.subjects[]? | .namespace == "production") | .metadata.name'

# Find PersistentVolumes bound to PVCs in the namespace
kubectl get pv -o json | \
  jq -r '.items[] | select(.spec.claimRef.namespace == "production") | .metadata.name'
```

## Wrapping Up

Namespace-level backup and restore on Talos Linux gives you the granularity needed for practical disaster recovery scenarios. Whether you use Velero for its robust scheduling and volume backup capabilities, or kubectl for quick exports, the key is to back up regularly, test your restores, and document namespace dependencies. On Talos Linux, your Kubernetes namespaces contain all the valuable state - the OS layer can be rebuilt from configuration, but your application data and Kubernetes resources need proper backup protection.
