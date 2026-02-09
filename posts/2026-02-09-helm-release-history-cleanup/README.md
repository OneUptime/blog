# How to Configure Helm Release History Limits and Revision Cleanup Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, DevOps

Description: Learn how to manage Helm release history by configuring revision limits, implementing cleanup policies, and maintaining optimal storage usage while preserving rollback capabilities.

---

Helm stores every release revision as a Kubernetes Secret or ConfigMap, allowing you to roll back to previous versions. However, unlimited history accumulation consumes storage and clutters your cluster. Managing release history through revision limits and cleanup policies ensures you maintain rollback capability while keeping storage usage under control.

## Understanding Helm Release History

Each time you install or upgrade a Helm release, Helm creates a new revision stored as a Secret in the release namespace. These secrets contain the complete release manifest, values, and metadata.

View release history:

```bash
# List all revisions
helm history myapp

# Show detailed history
helm history myapp --max 20

# Output as JSON
helm history myapp -o json
```

Check storage impact:

```bash
# List all Helm secrets
kubectl get secrets -l owner=helm

# Show secret sizes
kubectl get secrets -l owner=helm -o json | \
  jq '.items[] | {name: .metadata.name, size: (.data | length)}'

# Calculate total storage used by Helm
kubectl get secrets -l owner=helm -o json | \
  jq '[.items[].data | length] | add'
```

## Setting Revision History Limits

Configure the maximum number of revisions to keep using the `--history-max` flag:

```bash
# Install with history limit
helm install myapp ./mychart --history-max 5

# Upgrade with history limit
helm upgrade myapp ./mychart --history-max 5

# Set limit for all operations
export HELM_MAX_HISTORY=5
helm upgrade myapp ./mychart
```

When the limit is reached, Helm automatically removes the oldest revisions during upgrades.

## Configuring Default History Limits

Set default history limits in your Helm environment:

```bash
# Add to your shell profile (.bashrc, .zshrc)
export HELM_MAX_HISTORY=10

# Or create a Helm configuration file
mkdir -p ~/.config/helm
cat > ~/.config/helm/repositories.yaml << EOF
maxHistory: 10
EOF
```

## Implementing Cleanup Scripts

Create automated cleanup for old revisions:

```bash
#!/bin/bash
# helm-cleanup.sh - Remove old Helm revisions

NAMESPACE="${1:-default}"
KEEP_REVISIONS="${2:-5}"

echo "Cleaning up Helm releases in namespace: $NAMESPACE"
echo "Keeping last $KEEP_REVISIONS revisions"

# Get all releases
RELEASES=$(helm list -n "$NAMESPACE" -q)

for release in $RELEASES; do
    echo ""
    echo "Processing release: $release"

    # Get total revision count
    TOTAL=$(helm history "$release" -n "$NAMESPACE" --max 1000 -o json | jq '. | length')

    if [ "$TOTAL" -gt "$KEEP_REVISIONS" ]; then
        echo "  Found $TOTAL revisions, keeping $KEEP_REVISIONS"

        # Get revisions to delete (all except the last N)
        TO_DELETE=$((TOTAL - KEEP_REVISIONS))

        # Get revision numbers to delete
        REVISIONS=$(helm history "$release" -n "$NAMESPACE" --max "$TO_DELETE" -o json | \
          jq -r '.[].revision')

        # Delete old secrets directly
        for rev in $REVISIONS; do
            SECRET_NAME="sh.helm.release.v1.${release}.v${rev}"
            kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE" 2>/dev/null && \
              echo "  Deleted revision $rev"
        done
    else
        echo "  Only $TOTAL revisions, no cleanup needed"
    fi
done

echo ""
echo "Cleanup complete!"
```

Run the cleanup script:

```bash
chmod +x helm-cleanup.sh
./helm-cleanup.sh production 5
```

## Automated Cleanup with CronJob

Deploy a Kubernetes CronJob to perform regular cleanup:

```yaml
# helm-cleanup-cronjob.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: helm-cleanup
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: helm-cleanup
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "delete"]
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: helm-cleanup
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: helm-cleanup
subjects:
- kind: ServiceAccount
  name: helm-cleanup
  namespace: kube-system
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: helm-cleanup
  namespace: kube-system
spec:
  schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: helm-cleanup
          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: alpine/helm:latest
            env:
            - name: KEEP_REVISIONS
              value: "10"
            command:
            - /bin/sh
            - -c
            - |
              #!/bin/sh
              set -e

              echo "Starting Helm revision cleanup"
              echo "Keep last $KEEP_REVISIONS revisions"

              # Get all namespaces
              NAMESPACES=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')

              for ns in $NAMESPACES; do
                echo ""
                echo "Namespace: $ns"

                # Get Helm releases
                RELEASES=$(helm list -n "$ns" -q 2>/dev/null || true)

                if [ -z "$RELEASES" ]; then
                  echo "  No releases found"
                  continue
                fi

                for release in $RELEASES; do
                  echo "  Release: $release"

                  # Count revisions
                  TOTAL=$(helm history "$release" -n "$ns" -o json 2>/dev/null | jq '. | length')

                  if [ "$TOTAL" -gt "$KEEP_REVISIONS" ]; then
                    echo "    Found $TOTAL revisions"

                    # Get old revision numbers
                    TO_DELETE=$((TOTAL - KEEP_REVISIONS))
                    REVISIONS=$(helm history "$release" -n "$ns" --max "$TO_DELETE" -o json | \
                      jq -r '.[].revision')

                    # Delete old secrets
                    for rev in $REVISIONS; do
                      SECRET="sh.helm.release.v1.${release}.v${rev}"
                      kubectl delete secret "$SECRET" -n "$ns" && \
                        echo "    Deleted revision $rev"
                    done
                  fi
                done
              done

              echo ""
              echo "Cleanup complete"
```

Deploy the CronJob:

```bash
kubectl apply -f helm-cleanup-cronjob.yaml
```

## Selective Revision Retention

Keep specific revisions for compliance or audit purposes:

```bash
#!/bin/bash
# selective-cleanup.sh - Keep tagged revisions

NAMESPACE="$1"
RELEASE="$2"
KEEP_COUNT="$3"

# Get all revisions
ALL_REVISIONS=$(helm history "$RELEASE" -n "$NAMESPACE" -o json)

# Get revisions marked as important (description contains KEEP)
KEEP_REVISIONS=$(echo "$ALL_REVISIONS" | \
  jq -r '.[] | select(.description | contains("KEEP")) | .revision')

# Get latest N revisions
LATEST_REVISIONS=$(echo "$ALL_REVISIONS" | \
  jq -r ".[-${KEEP_COUNT}:] | .[].revision")

# Combine important and latest
PRESERVE=$(echo -e "${KEEP_REVISIONS}\n${LATEST_REVISIONS}" | sort -u)

# Get all revision numbers
ALL=$(echo "$ALL_REVISIONS" | jq -r '.[].revision')

# Delete revisions not in preserve list
for rev in $ALL; do
  if ! echo "$PRESERVE" | grep -q "^${rev}$"; then
    SECRET="sh.helm.release.v1.${RELEASE}.v${rev}"
    kubectl delete secret "$SECRET" -n "$NAMESPACE"
    echo "Deleted revision $rev"
  fi
done
```

Mark important releases:

```bash
# Upgrade with important marker
helm upgrade myapp ./mychart --description "KEEP: Production release v2.0"
```

## Monitoring Storage Usage

Create a monitoring script for Helm storage:

```bash
#!/bin/bash
# helm-storage-monitor.sh

echo "Helm Storage Usage Report"
echo "========================="
echo ""

# Get all namespaces with Helm releases
NAMESPACES=$(kubectl get secrets --all-namespaces -l owner=helm -o json | \
  jq -r '.items[].metadata.namespace' | sort -u)

TOTAL_SIZE=0
TOTAL_SECRETS=0

for ns in $NAMESPACES; do
  # Count secrets and calculate size
  SECRETS=$(kubectl get secrets -n "$ns" -l owner=helm -o json)
  COUNT=$(echo "$SECRETS" | jq '.items | length')
  SIZE=$(echo "$SECRETS" | jq '[.items[].data | to_entries | .[].value | length] | add')

  TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
  TOTAL_SECRETS=$((TOTAL_SECRETS + COUNT))

  # Convert to human readable
  SIZE_MB=$((SIZE / 1024 / 1024))

  echo "Namespace: $ns"
  echo "  Secrets: $COUNT"
  echo "  Size: ${SIZE_MB}MB"
  echo ""
done

TOTAL_MB=$((TOTAL_SIZE / 1024 / 1024))
echo "Total Helm Secrets: $TOTAL_SECRETS"
echo "Total Storage: ${TOTAL_MB}MB"
```

## Backup Before Cleanup

Always backup releases before cleaning history:

```bash
#!/bin/bash
# backup-and-cleanup.sh

NAMESPACE="$1"
BACKUP_DIR="./helm-backups/$(date +%Y%m%d)"

mkdir -p "$BACKUP_DIR"

# Backup all releases
RELEASES=$(helm list -n "$NAMESPACE" -q)

for release in $RELEASES; do
  echo "Backing up $release..."

  # Export all revisions
  helm history "$release" -n "$NAMESPACE" -o json > \
    "$BACKUP_DIR/${release}-history.json"

  # Export current values
  helm get values "$release" -n "$NAMESPACE" -o yaml > \
    "$BACKUP_DIR/${release}-values.yaml"

  # Export current manifest
  helm get manifest "$release" -n "$NAMESPACE" > \
    "$BACKUP_DIR/${release}-manifest.yaml"
done

echo "Backup complete: $BACKUP_DIR"

# Now safe to cleanup
./helm-cleanup.sh "$NAMESPACE" 5
```

## Restoring from Backup

Restore releases from backups:

```bash
#!/bin/bash
# restore-release.sh

BACKUP_DIR="$1"
RELEASE="$2"
NAMESPACE="$3"

# Restore from manifest
kubectl apply -f "$BACKUP_DIR/${RELEASE}-manifest.yaml" -n "$NAMESPACE"

# Or reinstall with backed up values
helm install "$RELEASE" ./mychart \
  -f "$BACKUP_DIR/${RELEASE}-values.yaml" \
  -n "$NAMESPACE"
```

## Cleanup Policies by Environment

Apply different policies per environment:

```bash
#!/bin/bash
# environment-cleanup.sh

NAMESPACE="$1"

# Determine retention based on namespace
case "$NAMESPACE" in
  production)
    KEEP=20
    echo "Production environment: keeping $KEEP revisions"
    ;;
  staging)
    KEEP=10
    echo "Staging environment: keeping $KEEP revisions"
    ;;
  development)
    KEEP=5
    echo "Development environment: keeping $KEEP revisions"
    ;;
  *)
    KEEP=5
    echo "Default: keeping $KEEP revisions"
    ;;
esac

# Apply cleanup
./helm-cleanup.sh "$NAMESPACE" "$KEEP"
```

## Alerting on Storage Thresholds

Monitor and alert when storage usage is high:

```bash
#!/bin/bash
# helm-storage-alert.sh

THRESHOLD_MB=1000
WEBHOOK_URL="$SLACK_WEBHOOK_URL"

# Calculate total storage
TOTAL_SIZE=$(kubectl get secrets --all-namespaces -l owner=helm -o json | \
  jq '[.items[].data | to_entries | .[].value | length] | add')

TOTAL_MB=$((TOTAL_SIZE / 1024 / 1024))

if [ "$TOTAL_MB" -gt "$THRESHOLD_MB" ]; then
  MESSAGE="Warning: Helm storage usage is ${TOTAL_MB}MB (threshold: ${THRESHOLD_MB}MB)"

  # Send alert
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"$MESSAGE\"}" \
    "$WEBHOOK_URL"

  echo "$MESSAGE"
  exit 1
fi

echo "Storage usage is healthy: ${TOTAL_MB}MB"
```

Managing Helm release history is essential for maintaining a healthy Kubernetes cluster. By implementing revision limits, automated cleanup, and monitoring, you balance the need for rollback capability with efficient resource usage. These practices ensure your Helm operations remain performant as your deployments scale.
