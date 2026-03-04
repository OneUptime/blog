# How to Automate ArgoCD Backup with CronJobs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Backups, CronJob

Description: Learn how to automate ArgoCD backups using Kubernetes CronJobs with cloud storage integration, retention policies, and monitoring.

---

Manual backups are unreliable - they depend on someone remembering to run a script at the right time. Automating ArgoCD backups with Kubernetes CronJobs ensures your configuration is backed up consistently without human intervention. Combined with cloud storage and monitoring, you get a backup system that runs itself.

## Architecture

```mermaid
graph LR
    A[Kubernetes CronJob] -->|Scheduled| B[Backup Pod]
    B --> C[Export ArgoCD State]
    C --> D[Upload to Cloud Storage]
    D --> E[S3/GCS/Azure Blob]
    B --> F[Cleanup Old Backups]
    B --> G[Send Notification]
```

## Basic CronJob Backup

Here is a minimal CronJob that backs up ArgoCD daily:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-backup
  namespace: argocd
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          serviceAccountName: argocd-backup
          containers:
            - name: backup
              image: bitnami/kubectl:1.28
              command:
                - /bin/bash
                - -c
                - |
                  set -euo pipefail

                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  BACKUP_DIR="/tmp/argocd-backup-$TIMESTAMP"
                  mkdir -p "$BACKUP_DIR"

                  echo "Starting ArgoCD backup at $(date)"

                  # Export Applications
                  echo "Exporting Applications..."
                  kubectl get applications.argoproj.io -n argocd -o yaml \
                    > "$BACKUP_DIR/applications.yaml"

                  # Export Projects
                  echo "Exporting Projects..."
                  kubectl get appprojects.argoproj.io -n argocd -o yaml \
                    > "$BACKUP_DIR/projects.yaml"

                  # Export ApplicationSets
                  echo "Exporting ApplicationSets..."
                  kubectl get applicationsets.argoproj.io -n argocd -o yaml \
                    > "$BACKUP_DIR/applicationsets.yaml" 2>/dev/null || true

                  # Export ConfigMaps
                  echo "Exporting ConfigMaps..."
                  for cm in argocd-cm argocd-rbac-cm argocd-cmd-params-cm \
                             argocd-notifications-cm argocd-ssh-known-hosts-cm \
                             argocd-tls-certs-cm; do
                    kubectl get configmap "$cm" -n argocd -o yaml \
                      > "$BACKUP_DIR/cm-${cm}.yaml" 2>/dev/null || true
                  done

                  # Export Secrets
                  echo "Exporting Secrets..."
                  kubectl get secrets -n argocd \
                    -l argocd.argoproj.io/secret-type -o yaml \
                    > "$BACKUP_DIR/secrets.yaml"

                  # Create tarball
                  echo "Creating archive..."
                  cd /tmp
                  tar -czf "argocd-backup-$TIMESTAMP.tar.gz" \
                    "argocd-backup-$TIMESTAMP/"

                  # Log summary
                  APP_COUNT=$(grep -c "kind: Application$" \
                    "$BACKUP_DIR/applications.yaml" || echo 0)
                  PROJ_COUNT=$(grep -c "kind: AppProject" \
                    "$BACKUP_DIR/projects.yaml" || echo 0)

                  echo ""
                  echo "Backup complete!"
                  echo "  Applications: $APP_COUNT"
                  echo "  Projects: $PROJ_COUNT"
                  echo "  Archive: /tmp/argocd-backup-$TIMESTAMP.tar.gz"
                  echo "  Size: $(du -h /tmp/argocd-backup-$TIMESTAMP.tar.gz | cut -f1)"
          restartPolicy: OnFailure
```

### Required RBAC

Create the service account and RBAC for the backup job:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-backup
  namespace: argocd
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argocd-backup
  namespace: argocd
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["applications", "appprojects", "applicationsets"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: argocd-backup
  namespace: argocd
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: argocd-backup
subjects:
  - kind: ServiceAccount
    name: argocd-backup
    namespace: argocd
```

## CronJob with S3 Upload

A production backup that uploads to S3:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-backup-s3
  namespace: argocd
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      backoffLimit: 3
      activeDeadlineSeconds: 600  # 10 minute timeout
      template:
        spec:
          serviceAccountName: argocd-backup
          containers:
            - name: backup
              image: amazon/aws-cli:2.15.0
              env:
                - name: AWS_DEFAULT_REGION
                  value: "us-east-1"
                - name: S3_BUCKET
                  value: "my-argocd-backups"
                - name: RETENTION_DAYS
                  value: "30"
              envFrom:
                - secretRef:
                    name: argocd-backup-aws-creds
              command:
                - /bin/bash
                - -c
                - |
                  set -euo pipefail

                  # Install kubectl
                  curl -sLO "https://dl.k8s.io/release/v1.28.0/bin/linux/amd64/kubectl"
                  chmod +x kubectl && mv kubectl /usr/local/bin/

                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  BACKUP_FILE="/tmp/argocd-backup-$TIMESTAMP.tar.gz"
                  BACKUP_DIR="/tmp/argocd-backup-$TIMESTAMP"
                  mkdir -p "$BACKUP_DIR"

                  echo "=== ArgoCD Backup to S3 ==="
                  echo "Timestamp: $TIMESTAMP"

                  # Export all ArgoCD resources
                  kubectl get applications.argoproj.io -n argocd -o yaml \
                    > "$BACKUP_DIR/applications.yaml"
                  kubectl get appprojects.argoproj.io -n argocd -o yaml \
                    > "$BACKUP_DIR/projects.yaml"
                  kubectl get applicationsets.argoproj.io -n argocd -o yaml \
                    > "$BACKUP_DIR/applicationsets.yaml" 2>/dev/null || true

                  for cm in argocd-cm argocd-rbac-cm argocd-cmd-params-cm \
                             argocd-notifications-cm argocd-ssh-known-hosts-cm; do
                    kubectl get configmap "$cm" -n argocd -o yaml \
                      > "$BACKUP_DIR/cm-${cm}.yaml" 2>/dev/null || true
                  done

                  kubectl get secrets -n argocd \
                    -l argocd.argoproj.io/secret-type -o yaml \
                    > "$BACKUP_DIR/secrets.yaml"

                  # Create inventory
                  APP_COUNT=$(grep -c "kind: Application$" \
                    "$BACKUP_DIR/applications.yaml" || echo 0)
                  echo "{\"timestamp\":\"$TIMESTAMP\",\"applications\":$APP_COUNT}" \
                    > "$BACKUP_DIR/inventory.json"

                  # Compress
                  cd /tmp && tar -czf "$BACKUP_FILE" "argocd-backup-$TIMESTAMP/"

                  # Upload to S3
                  echo "Uploading to S3..."
                  aws s3 cp "$BACKUP_FILE" \
                    "s3://$S3_BUCKET/argocd-backups/argocd-backup-$TIMESTAMP.tar.gz"

                  # Also upload as "latest" for easy reference
                  aws s3 cp "$BACKUP_FILE" \
                    "s3://$S3_BUCKET/argocd-backups/latest.tar.gz"

                  # Cleanup old backups
                  echo "Cleaning up backups older than $RETENTION_DAYS days..."
                  CUTOFF=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d 2>/dev/null || \
                           date -v-${RETENTION_DAYS}d +%Y%m%d)
                  aws s3 ls "s3://$S3_BUCKET/argocd-backups/" | while read -r line; do
                    FILE=$(echo "$line" | awk '{print $4}')
                    FILE_DATE=$(echo "$FILE" | grep -oP '\d{8}' | head -1)
                    if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF" ] 2>/dev/null; then
                      echo "  Deleting old backup: $FILE"
                      aws s3 rm "s3://$S3_BUCKET/argocd-backups/$FILE"
                    fi
                  done

                  echo ""
                  echo "Backup complete!"
                  echo "  Location: s3://$S3_BUCKET/argocd-backups/argocd-backup-$TIMESTAMP.tar.gz"
                  echo "  Applications: $APP_COUNT"
                  echo "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
          restartPolicy: OnFailure
```

### AWS Credentials Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-backup-aws-creds
  namespace: argocd
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE"
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

For EKS clusters, prefer using IRSA (IAM Roles for Service Accounts) instead of static credentials.

## CronJob with GCS Upload

For Google Cloud:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-backup-gcs
  namespace: argocd
spec:
  schedule: "0 */6 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-backup
          containers:
            - name: backup
              image: google/cloud-sdk:slim
              env:
                - name: GCS_BUCKET
                  value: "gs://my-argocd-backups"
              command:
                - /bin/bash
                - -c
                - |
                  set -euo pipefail

                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  BACKUP_DIR="/tmp/backup-$TIMESTAMP"
                  mkdir -p "$BACKUP_DIR"

                  # Install kubectl
                  apt-get update -qq && apt-get install -y -qq kubectl > /dev/null 2>&1

                  # Export resources
                  kubectl get applications.argoproj.io -n argocd -o yaml > "$BACKUP_DIR/apps.yaml"
                  kubectl get appprojects.argoproj.io -n argocd -o yaml > "$BACKUP_DIR/projects.yaml"
                  kubectl get configmaps -n argocd \
                    -l app.kubernetes.io/part-of=argocd -o yaml > "$BACKUP_DIR/configmaps.yaml"
                  kubectl get secrets -n argocd \
                    -l argocd.argoproj.io/secret-type -o yaml > "$BACKUP_DIR/secrets.yaml"

                  # Compress and upload
                  cd /tmp && tar -czf "backup-$TIMESTAMP.tar.gz" "backup-$TIMESTAMP/"
                  gsutil cp "/tmp/backup-$TIMESTAMP.tar.gz" "$GCS_BUCKET/argocd/"
                  gsutil cp "/tmp/backup-$TIMESTAMP.tar.gz" "$GCS_BUCKET/argocd/latest.tar.gz"

                  echo "Backup uploaded to $GCS_BUCKET/argocd/backup-$TIMESTAMP.tar.gz"
          restartPolicy: OnFailure
```

## Monitoring Backup Jobs

Ensure your backups are actually running and succeeding:

```bash
#!/bin/bash
# monitor-backup-jobs.sh - Check backup CronJob status

NAMESPACE="argocd"
CRONJOB_NAME="argocd-backup-s3"

# Get last job status
LAST_JOB=$(kubectl get jobs -n "$NAMESPACE" \
  --sort-by=.metadata.creationTimestamp \
  -l job-name -o json | \
  jq -r "[.items[] | select(.metadata.ownerReferences[]?.name == \"$CRONJOB_NAME\")] | last")

if [ "$LAST_JOB" = "null" ] || [ -z "$LAST_JOB" ]; then
  echo "WARNING: No backup jobs found for $CRONJOB_NAME"
  exit 1
fi

STATUS=$(echo "$LAST_JOB" | jq -r '.status.conditions[-1].type // "Running"')
COMPLETION=$(echo "$LAST_JOB" | jq -r '.status.completionTime // "N/A"')
START=$(echo "$LAST_JOB" | jq -r '.status.startTime // "N/A"')

echo "Last Backup Job Status:"
echo "  Status: $STATUS"
echo "  Started: $START"
echo "  Completed: $COMPLETION"

if [ "$STATUS" = "Complete" ]; then
  echo "  Result: SUCCESS"
else
  echo "  Result: CHECK REQUIRED"
  # Get pod logs for debugging
  POD=$(kubectl get pods -n "$NAMESPACE" \
    --sort-by=.metadata.creationTimestamp \
    -l job-name -o name | tail -1)
  echo "  Logs:"
  kubectl logs "$POD" -n "$NAMESPACE" --tail=20 | sed 's/^/    /'
fi
```

### Prometheus Alert for Failed Backups

```yaml
# PrometheusRule for monitoring backup CronJobs
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-backup-alerts
  namespace: argocd
spec:
  groups:
    - name: argocd-backup
      rules:
        - alert: ArgoCDBackupFailed
          expr: |
            kube_job_status_failed{namespace="argocd", job_name=~"argocd-backup.*"} > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD backup job failed"
            description: "The ArgoCD backup CronJob has failed. Check job logs."

        - alert: ArgoCDBackupMissing
          expr: |
            time() - kube_cronjob_status_last_successful_time{namespace="argocd", cronjob="argocd-backup-s3"} > 86400
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD backup has not run in 24 hours"
            description: "No successful ArgoCD backup in the last 24 hours."
```

## Backup with Slack Notification

Add notifications to your backup job:

```yaml
# Add to the backup CronJob container command
# After the backup upload succeeds:
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"
APP_COUNT=$(grep -c "kind: Application$" "$BACKUP_DIR/applications.yaml" || echo 0)
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

curl -s -X POST "$SLACK_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"ArgoCD Backup Complete\",
    \"attachments\": [{
      \"color\": \"good\",
      \"fields\": [
        {\"title\": \"Applications\", \"value\": \"$APP_COUNT\", \"short\": true},
        {\"title\": \"Size\", \"value\": \"$BACKUP_SIZE\", \"short\": true},
        {\"title\": \"Location\", \"value\": \"s3://$S3_BUCKET/argocd-backups/\", \"short\": false}
      ]
    }]
  }"
```

## Deployment

Apply all the resources:

```bash
# Apply RBAC
kubectl apply -f argocd-backup-rbac.yaml

# Apply the CronJob
kubectl apply -f argocd-backup-cronjob.yaml

# Verify the CronJob is scheduled
kubectl get cronjobs -n argocd

# Trigger a manual run to test
kubectl create job --from=cronjob/argocd-backup-s3 argocd-backup-manual -n argocd

# Watch the job
kubectl logs -f job/argocd-backup-manual -n argocd
```

Automating ArgoCD backups with CronJobs removes the human factor from your DR strategy. Configure it once, monitor it with alerts, and you will always have a recent backup ready when you need it. Combine this with the [ArgoCD backup](https://oneuptime.com/blog/post/2026-02-26-argocd-backup-configuration-state/view) and [restore](https://oneuptime.com/blog/post/2026-02-26-argocd-restore-from-backup/view) guides for a complete disaster recovery solution.
