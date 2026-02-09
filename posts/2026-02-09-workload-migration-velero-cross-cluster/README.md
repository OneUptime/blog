# How to Implement Workload Migration Between Clusters with Velero Cross-Cluster Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Backup, Migration, Disaster Recovery

Description: Learn how to migrate workloads between Kubernetes clusters using Velero's backup and restore capabilities for disaster recovery, cluster upgrades, and cloud migrations.

---

Migrating workloads between Kubernetes clusters is essential for disaster recovery, cluster upgrades, and multi-cloud strategies. Velero provides a powerful backup and restore mechanism that captures not just application state but also Kubernetes resources, persistent volumes, and custom configurations.

In this guide, you'll learn how to use Velero to migrate complete workloads between clusters, ensuring data integrity and minimizing downtime.

## Understanding Velero Architecture

Velero consists of a server component running in your cluster and a CLI tool for operations. It backs up Kubernetes resources to object storage and copies persistent volume snapshots. For cross-cluster migration, you back up from a source cluster and restore to a target cluster using shared object storage.

The workflow involves installing Velero in both clusters, creating a backup in the source cluster, and restoring from that backup in the target cluster. Velero handles resource transformations needed for the new cluster environment.

## Installing Velero in Source and Target Clusters

Install Velero CLI:

```bash
wget https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz
tar -xvf velero-v1.12.0-linux-amd64.tar.gz
sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/
```

Install Velero in the source cluster with AWS S3 backend:

```bash
# Create S3 bucket for backups
aws s3 mb s3://velero-backups-migration --region us-east-1

# Create IAM user with S3 permissions
cat > velero-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObject",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": "arn:aws:s3:::velero-backups-migration/*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::velero-backups-migration"
        }
    ]
}
EOF

aws iam create-user --user-name velero
aws iam put-user-policy --user-name velero --policy-name velero --policy-document file://velero-policy.json
aws iam create-access-key --user-name velero > velero-keys.json

# Create credentials file
cat > credentials-velero <<EOF
[default]
aws_access_key_id=<access-key-id>
aws_secret_access_key=<secret-access-key>
EOF

# Install Velero in source cluster
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket velero-backups-migration \
    --backup-location-config region=us-east-1 \
    --snapshot-location-config region=us-east-1 \
    --secret-file ./credentials-velero \
    --use-volume-snapshots=true \
    --context source-cluster
```

Install Velero in the target cluster using the same configuration:

```bash
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket velero-backups-migration \
    --backup-location-config region=us-east-1 \
    --snapshot-location-config region=us-east-1 \
    --secret-file ./credentials-velero \
    --use-volume-snapshots=true \
    --context target-cluster
```

Verify Velero installation:

```bash
velero version --context source-cluster
velero backup-location get --context source-cluster
```

## Creating a Backup of the Workload

Create a comprehensive backup including all resources:

```bash
velero backup create production-migration \
    --include-namespaces production \
    --storage-location default \
    --snapshot-volumes \
    --context source-cluster
```

Monitor backup progress:

```bash
velero backup describe production-migration --context source-cluster
velero backup logs production-migration --context source-cluster
```

For more selective backups, use label selectors:

```bash
velero backup create app-migration \
    --selector app=myapp \
    --include-namespaces production \
    --context source-cluster
```

Create a scheduled backup for ongoing protection:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-production-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    includedNamespaces:
    - production
    snapshotVolumes: true
    storageLocation: default
    ttl: 720h  # 30 days retention
```

## Restoring to the Target Cluster

List available backups from the target cluster:

```bash
velero backup get --context target-cluster
```

You should see the backup created in the source cluster because both clusters share the same object storage.

Restore the entire backup:

```bash
velero restore create production-restore \
    --from-backup production-migration \
    --context target-cluster
```

Monitor restore progress:

```bash
velero restore describe production-restore --context target-cluster
velero restore logs production-restore --context target-cluster
```

Check that resources were restored:

```bash
kubectl get all -n production --context target-cluster
kubectl get pvc -n production --context target-cluster
```

## Handling Namespace Mapping

Restore to a different namespace:

```bash
velero restore create staging-restore \
    --from-backup production-migration \
    --namespace-mappings production:staging \
    --context target-cluster
```

This restores production namespace resources into the staging namespace.

## Excluding Resources from Restore

Exclude certain resources that don't need migration:

```bash
velero restore create selective-restore \
    --from-backup production-migration \
    --exclude-resources pods,replicasets \
    --include-resources deployments,services,configmaps,secrets,persistentvolumeclaims \
    --context target-cluster
```

## Transforming Resources During Restore

Use restore hooks to modify resources during restore:

```yaml
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: production-restore-with-hooks
  namespace: velero
spec:
  backupName: production-migration
  hooks:
    resources:
    - name: update-image-registry
      includedNamespaces:
      - production
      includedResources:
      - deployments
      - statefulsets
      postHooks:
      - exec:
          container: app
          command:
          - /bin/sh
          - -c
          - sed -i 's/old-registry.io/new-registry.io/g' /etc/config/app.yaml
          onError: Continue
          timeout: 5m
```

## Migrating Persistent Volumes

For cross-cloud migrations where volume snapshots don't work, use Velero with Restic:

```bash
# Install Velero with Restic
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket velero-backups-migration \
    --backup-location-config region=us-east-1 \
    --use-restic \
    --context source-cluster
```

Annotate pods to backup volumes with Restic:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        backup.velero.io/backup-volumes: data-volume,config-volume
    spec:
      containers:
      - name: app
        image: myapp:v1
        volumeMounts:
        - name: data-volume
          mountPath: /data
        - name: config-volume
          mountPath: /config
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: myapp-data
      - name: config-volume
        persistentVolumeClaim:
          claimName: myapp-config
```

Create backup with Restic:

```bash
velero backup create myapp-with-volumes \
    --include-namespaces production \
    --default-volumes-to-restic \
    --context source-cluster
```

## Validating Migration Success

Create a validation script:

```bash
#!/bin/bash
# validate-migration.sh

SOURCE_CONTEXT="source-cluster"
TARGET_CONTEXT="target-cluster"
NAMESPACE="production"

echo "Comparing deployments..."
SOURCE_DEPLOYS=$(kubectl get deployments -n $NAMESPACE --context $SOURCE_CONTEXT -o jsonpath='{.items[*].metadata.name}')
TARGET_DEPLOYS=$(kubectl get deployments -n $NAMESPACE --context $TARGET_CONTEXT -o jsonpath='{.items[*].metadata.name}')

if [ "$SOURCE_DEPLOYS" != "$TARGET_DEPLOYS" ]; then
    echo "WARNING: Deployment mismatch detected"
    echo "Source: $SOURCE_DEPLOYS"
    echo "Target: $TARGET_DEPLOYS"
else
    echo "✓ Deployments match"
fi

echo "Comparing services..."
SOURCE_SVCS=$(kubectl get services -n $NAMESPACE --context $SOURCE_CONTEXT -o jsonpath='{.items[*].metadata.name}')
TARGET_SVCS=$(kubectl get services -n $NAMESPACE --context $TARGET_CONTEXT -o jsonpath='{.items[*].metadata.name}')

if [ "$SOURCE_SVCS" != "$TARGET_SVCS" ]; then
    echo "WARNING: Service mismatch detected"
else
    echo "✓ Services match"
fi

echo "Checking PVC status..."
TARGET_PVC_STATUS=$(kubectl get pvc -n $NAMESPACE --context $TARGET_CONTEXT -o jsonpath='{.items[*].status.phase}')
if [[ "$TARGET_PVC_STATUS" == *"Pending"* ]]; then
    echo "WARNING: Some PVCs are pending"
else
    echo "✓ All PVCs bound"
fi

echo "Checking pod readiness..."
TOTAL_PODS=$(kubectl get pods -n $NAMESPACE --context $TARGET_CONTEXT --no-headers | wc -l)
READY_PODS=$(kubectl get pods -n $NAMESPACE --context $TARGET_CONTEXT --field-selector=status.phase=Running --no-headers | wc -l)

echo "Ready pods: $READY_PODS / $TOTAL_PODS"

if [ $READY_PODS -eq $TOTAL_PODS ]; then
    echo "✓ All pods ready"
else
    echo "WARNING: Not all pods are ready"
    kubectl get pods -n $NAMESPACE --context $TARGET_CONTEXT
fi
```

Run validation:

```bash
chmod +x validate-migration.sh
./validate-migration.sh
```

## Implementing Blue-Green Migration

Perform zero-downtime migration using blue-green strategy:

```bash
# Step 1: Backup current production (blue)
velero backup create blue-production \
    --include-namespaces production \
    --context source-cluster

# Step 2: Restore to target cluster as green
velero restore create green-production \
    --from-backup blue-production \
    --namespace-mappings production:production-green \
    --context target-cluster

# Step 3: Validate green deployment
kubectl get all -n production-green --context target-cluster

# Step 4: Run smoke tests against green
./run-smoke-tests.sh target-cluster production-green

# Step 5: Switch traffic to green (update DNS/load balancer)

# Step 6: Monitor for issues

# Step 7: If successful, delete blue environment
# If issues, switch back to blue
```

## Automating Migration with Scripts

Create an automated migration script:

```python
# migrate-workload.py
import subprocess
import sys
import time

def run_command(cmd, context=None):
    if context:
        cmd = f"{cmd} --context {context}"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        sys.exit(1)
    return result.stdout

def create_backup(namespace, backup_name, source_context):
    print(f"Creating backup {backup_name}...")
    run_command(
        f"velero backup create {backup_name} --include-namespaces {namespace} --wait",
        source_context
    )
    print("✓ Backup completed")

def wait_for_backup(backup_name, source_context):
    print("Waiting for backup to sync...")
    time.sleep(30)
    status = run_command(f"velero backup describe {backup_name}", source_context)
    if "Completed" in status:
        print("✓ Backup ready for restore")
        return True
    return False

def restore_backup(backup_name, target_context):
    print(f"Restoring {backup_name}...")
    run_command(
        f"velero restore create restore-{backup_name} --from-backup {backup_name} --wait",
        target_context
    )
    print("✓ Restore completed")

def validate_restore(namespace, target_context):
    print("Validating restore...")
    pods = run_command(f"kubectl get pods -n {namespace}", target_context)
    print(pods)

if __name__ == "__main__":
    NAMESPACE = "production"
    BACKUP_NAME = f"migration-{int(time.time())}"
    SOURCE = "source-cluster"
    TARGET = "target-cluster"

    create_backup(NAMESPACE, BACKUP_NAME, SOURCE)
    wait_for_backup(BACKUP_NAME, SOURCE)
    restore_backup(BACKUP_NAME, TARGET)
    validate_restore(NAMESPACE, TARGET)

    print("✓ Migration completed successfully")
```

## Best Practices

Always test your backup and restore process in non-production environments first.

Verify data integrity after restore using checksums or application-specific validation.

Document any manual steps required post-migration, such as updating DNS records or external integrations.

Keep Velero versions synchronized between source and target clusters to avoid compatibility issues.

Use labels consistently to enable selective backups and restores.

Implement automated validation to catch issues immediately after restore.

Plan for rollback scenarios in case migration fails or reveals issues.

## Conclusion

Velero provides a robust solution for migrating workloads between Kubernetes clusters with minimal downtime and strong data integrity guarantees. Whether you're performing disaster recovery, cluster upgrades, or cloud migrations, Velero's backup and restore capabilities handle the complexity of preserving application state across cluster boundaries.

Start with simple migrations of stateless applications, then progress to stateful workloads as you build confidence in your migration procedures. Regular testing of your migration process ensures you're prepared when you need to migrate workloads for real.
