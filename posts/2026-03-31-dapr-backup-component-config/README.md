# How to Back Up Dapr Component Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Backup, Configuration, GitOps, Kubernetes

Description: Learn how to back up Dapr component, configuration, and subscription resources to ensure you can restore your Dapr setup quickly after cluster failures or accidental deletions.

---

## Why Back Up Dapr Configuration

Dapr components, configurations, and subscriptions are Kubernetes custom resources. If your cluster is accidentally deleted or a namespace is wiped, all Dapr configuration is lost along with it. Regular configuration backups ensure you can restore Dapr to a known-good state quickly, meeting your RTO targets.

## Exporting All Dapr Resources

Create a comprehensive backup of all Dapr custom resources:

```bash
#!/bin/bash
# backup-dapr-config.sh

BACKUP_DIR="dapr-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Backing up Dapr configuration to $BACKUP_DIR..."

# Back up all Dapr resource types
DAPR_RESOURCES=(
  "components"
  "configurations"
  "subscriptions"
  "resiliencies"
  "httpendpoints"
)

for RESOURCE in "${DAPR_RESOURCES[@]}"; do
  echo "  Exporting $RESOURCE..."
  kubectl get "$RESOURCE" --all-namespaces -o yaml \
    > "$BACKUP_DIR/${RESOURCE}.yaml" 2>/dev/null || true
done

# Create a manifest index
echo "# Dapr Backup Manifest" > "$BACKUP_DIR/MANIFEST.md"
echo "Backup date: $(date -u)" >> "$BACKUP_DIR/MANIFEST.md"
echo "" >> "$BACKUP_DIR/MANIFEST.md"
for f in "$BACKUP_DIR"/*.yaml; do
  count=$(grep -c "^- apiVersion:" "$f" 2>/dev/null || echo 0)
  echo "- $(basename $f): $count resources" >> "$BACKUP_DIR/MANIFEST.md"
done

# Checksum for integrity verification
sha256sum "$BACKUP_DIR"/*.yaml > "$BACKUP_DIR/checksums.sha256"

echo "Backup complete: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
```

## Automating Backups with a CronJob

Schedule regular backups to object storage:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dapr-config-backup
  namespace: dapr-system
spec:
  schedule: "0 1 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: dapr-backup-sa
          containers:
          - name: backup
            image: bitnami/kubectl:latest  # Also needs AWS CLI; use a custom image with both tools installed
            command:
            - /bin/bash
            - -c
            - |
              DATE=$(date +%Y%m%d-%H%M%S)
              for RESOURCE in components configurations subscriptions resiliencies; do
                kubectl get $RESOURCE --all-namespaces -o yaml \
                  | aws s3 cp - "s3://dapr-backups/${DATE}/${RESOURCE}.yaml"
              done
              echo "Backup $DATE completed"
            env:
            - name: AWS_DEFAULT_REGION
              value: "us-east-1"
            envFrom:
            - secretRef:
                name: aws-backup-credentials
          restartPolicy: OnFailure
```

## GitOps as the Primary Backup

The most reliable backup is keeping all Dapr configuration in Git:

```bash
#!/bin/bash
# sync-dapr-to-git.sh
# Sync current cluster state back to Git (for drift detection)

REPO_DIR="$HOME/infrastructure"
cd "$REPO_DIR"

for RESOURCE in components configurations subscriptions; do
  kubectl get "$RESOURCE" -n production -o yaml \
    > "dapr/components/production/${RESOURCE}-current.yaml"
done

git diff dapr/
git add dapr/
git commit -m "chore: sync Dapr config snapshot $(date +%Y-%m-%d)" || echo "No changes"
git push
```

## Verifying Backup Integrity

```bash
#!/bin/bash
# verify-dapr-backup.sh

BACKUP_DIR="$1"

if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: $0 <backup-dir>"
  exit 1
fi

echo "Verifying checksums..."
cd "$BACKUP_DIR"
sha256sum -c checksums.sha256

echo "Validating YAML syntax..."
for f in *.yaml; do
  python3 -c "import yaml; list(yaml.safe_load_all(open('$f').read()))" && \
    echo "  $f: OK" || echo "  $f: INVALID YAML"
done

echo "Resource counts:"
for f in *.yaml; do
  count=$(grep -c "^- apiVersion:" "$f" 2>/dev/null || echo 0)
  echo "  $f: $count resources"
done
```

## Restoring from Backup

```bash
#!/bin/bash
# restore-dapr-config.sh
BACKUP_DIR="$1"
TARGET_NAMESPACE="${2:-production}"

echo "Restoring Dapr configuration from $BACKUP_DIR to namespace $TARGET_NAMESPACE..."

for f in "$BACKUP_DIR"/*.yaml; do
  echo "Applying $(basename $f)..."
  kubectl apply -f "$f" --namespace "$TARGET_NAMESPACE" || true
done

echo "Verify restoration:"
kubectl get components,configurations,subscriptions -n "$TARGET_NAMESPACE"
```

## Summary

Back up Dapr configuration by exporting all custom resources (components, configurations, subscriptions, resiliencies) to YAML files, storing them in both object storage via a Kubernetes CronJob and in Git as your source of truth. Generate SHA256 checksums to verify backup integrity and schedule daily automated backups. The restore process is a simple `kubectl apply` of the backup YAML files, making Dapr configuration recovery fast and repeatable.
