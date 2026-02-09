# How to Implement Scheduled Volume Snapshots with CronJobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, CronJob, Backup Automation

Description: Learn how to automate volume snapshot creation using Kubernetes CronJobs to implement reliable backup schedules for persistent data with proper error handling and monitoring.

---

Scheduled snapshots are essential for protecting your data against corruption, accidental deletion, or disasters. Kubernetes CronJobs provide a native way to automate snapshot creation without external backup tools.

## Basic Scheduled Snapshot CronJob

Start with a simple daily snapshot schedule:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-database-snapshot
  namespace: production
spec:
  # Run daily at 2 AM UTC
  schedule: "0 2 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: create-snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              set -e
              TIMESTAMP=$(date +%Y%m%d-%H%M%S)
              SNAPSHOT_NAME="database-backup-${TIMESTAMP}"

              echo "Creating snapshot: $SNAPSHOT_NAME"

              cat <<EOF | kubectl apply -f -
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: $SNAPSHOT_NAME
                namespace: production
                labels:
                  app: database
                  schedule: daily
                  created-by: cronjob
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: postgres-pvc
              EOF

              echo "Snapshot created successfully"
```

Create the required RBAC permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: snapshot-creator
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: snapshot-creator-role
  namespace: production
rules:
- apiGroups: ["snapshot.storage.k8s.io"]
  resources: ["volumesnapshots"]
  verbs: ["create", "get", "list"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: snapshot-creator-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: snapshot-creator-role
subjects:
- kind: ServiceAccount
  name: snapshot-creator
  namespace: production
```

Deploy the CronJob:

```bash
kubectl apply -f snapshot-cronjob.yaml
kubectl apply -f snapshot-rbac.yaml

# Verify CronJob is scheduled
kubectl get cronjob daily-database-snapshot -n production

# Check schedule
kubectl describe cronjob daily-database-snapshot -n production
```

## Multi-Frequency Backup Strategy

Implement different schedules for different retention needs:

```yaml
# Hourly snapshots (keep for 24 hours)
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hourly-snapshot
  namespace: production
spec:
  schedule: "0 * * * *"  # Every hour
  successfulJobsHistoryLimit: 24
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: create-snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d-%H%M)
              kubectl apply -f - <<EOF
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: hourly-${TIMESTAMP}
                labels:
                  schedule: hourly
                  retention-hours: "24"
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: postgres-pvc
              EOF
---
# Daily snapshots (keep for 7 days)
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-snapshot
  namespace: production
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: create-snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d)
              kubectl apply -f - <<EOF
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: daily-${TIMESTAMP}
                labels:
                  schedule: daily
                  retention-days: "7"
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: postgres-pvc
              EOF
---
# Weekly snapshots (keep for 4 weeks)
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-snapshot
  namespace: production
spec:
  schedule: "0 3 * * 0"  # Sundays at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: create-snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y-W%U)
              kubectl apply -f - <<EOF
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: weekly-${TIMESTAMP}
                labels:
                  schedule: weekly
                  retention-weeks: "4"
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: postgres-pvc
              EOF
---
# Monthly snapshots (keep for 12 months)
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-snapshot
  namespace: production
spec:
  schedule: "0 4 1 * *"  # First day of month at 4 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: create-snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y-%m)
              kubectl apply -f - <<EOF
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: monthly-${TIMESTAMP}
                labels:
                  schedule: monthly
                  retention-months: "12"
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: postgres-pvc
              EOF
```

## Snapshot with Pre-Flight Checks

Add validation before creating snapshots:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: validated-snapshot
  namespace: production
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: create-snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              PVC_NAME="postgres-pvc"
              TIMESTAMP=$(date +%Y%m%d-%H%M%S)
              SNAPSHOT_NAME="validated-${TIMESTAMP}"

              echo "=== Pre-flight checks ==="

              # Check if PVC exists and is bound
              PVC_STATUS=$(kubectl get pvc $PVC_NAME -o jsonpath='{.status.phase}')
              if [ "$PVC_STATUS" != "Bound" ]; then
                echo "ERROR: PVC $PVC_NAME is not bound (status: $PVC_STATUS)"
                exit 1
              fi
              echo "✓ PVC is bound"

              # Check if pod using PVC is running
              POD_NAME=$(kubectl get pod -l app=postgres \
                -o jsonpath='{.items[0].metadata.name}')
              POD_STATUS=$(kubectl get pod $POD_NAME -o jsonpath='{.status.phase}')
              if [ "$POD_STATUS" != "Running" ]; then
                echo "ERROR: Pod $POD_NAME is not running (status: $POD_STATUS)"
                exit 1
              fi
              echo "✓ Pod is running"

              # Check if VolumeSnapshotClass exists
              if ! kubectl get volumesnapshotclass csi-snapshot-class &>/dev/null; then
                echo "ERROR: VolumeSnapshotClass csi-snapshot-class not found"
                exit 1
              fi
              echo "✓ VolumeSnapshotClass exists"

              # Check for recent failed snapshots
              FAILED_COUNT=$(kubectl get volumesnapshot \
                -l app=postgres \
                --field-selector metadata.creationTimestamp>$(date -d '1 hour ago' -Iseconds) \
                -o json | jq '[.items[] | select(.status.error != null)] | length')

              if [ "$FAILED_COUNT" -gt 0 ]; then
                echo "WARNING: $FAILED_COUNT failed snapshots in the last hour"
              fi

              echo "=== Creating snapshot ==="

              cat <<EOF | kubectl apply -f -
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: $SNAPSHOT_NAME
                labels:
                  app: postgres
                  schedule: daily
                  validated: "true"
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: $PVC_NAME
              EOF

              echo "Waiting for snapshot to be ready..."

              # Wait up to 10 minutes for snapshot to be ready
              for i in {1..60}; do
                READY=$(kubectl get volumesnapshot $SNAPSHOT_NAME \
                  -o jsonpath='{.status.readyToUse}' 2>/dev/null || echo "false")

                if [ "$READY" = "true" ]; then
                  echo "✓ Snapshot created successfully"
                  exit 0
                fi

                ERROR=$(kubectl get volumesnapshot $SNAPSHOT_NAME \
                  -o jsonpath='{.status.error.message}' 2>/dev/null || echo "")

                if [ -n "$ERROR" ]; then
                  echo "ERROR: Snapshot failed - $ERROR"
                  exit 1
                fi

                sleep 10
              done

              echo "ERROR: Snapshot creation timed out"
              exit 1
```

## Multi-PVC Snapshot CronJob

Create snapshots for multiple PVCs:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: multi-pvc-snapshot
  namespace: production
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: create-snapshots
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e
              TIMESTAMP=$(date +%Y%m%d-%H%M%S)

              # List of PVCs to snapshot
              PVCS=(
                "postgres-pvc"
                "redis-pvc"
                "mongodb-pvc"
              )

              for PVC in "${PVCS[@]}"; do
                echo "Creating snapshot for $PVC"

                SNAPSHOT_NAME="${PVC}-${TIMESTAMP}"

                cat <<EOF | kubectl apply -f -
                apiVersion: snapshot.storage.k8s.io/v1
                kind: VolumeSnapshot
                metadata:
                  name: $SNAPSHOT_NAME
                  labels:
                    pvc: $PVC
                    schedule: daily
                    batch: $TIMESTAMP
                spec:
                  volumeSnapshotClassName: csi-snapshot-class
                  source:
                    persistentVolumeClaimName: $PVC
              EOF

                echo "Snapshot $SNAPSHOT_NAME created"
              done

              echo "All snapshots created successfully"
```

## Snapshot with Notification

Send notifications on success or failure:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: snapshot-with-notification
  namespace: production
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: create-snapshot
            image: curlimages/curl:latest
            env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: notification-secrets
                  key: slack-webhook
            command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d-%H%M%S)
              SNAPSHOT_NAME="notified-${TIMESTAMP}"

              # Install kubectl
              curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
              chmod +x kubectl

              send_notification() {
                STATUS=$1
                MESSAGE=$2
                COLOR=$3

                curl -X POST $SLACK_WEBHOOK \
                  -H 'Content-Type: application/json' \
                  -d "{
                    \"attachments\": [{
                      \"color\": \"$COLOR\",
                      \"title\": \"Snapshot $STATUS\",
                      \"text\": \"$MESSAGE\",
                      \"footer\": \"Kubernetes Snapshot Job\",
                      \"ts\": $(date +%s)
                    }]
                  }"
              }

              # Create snapshot
              ./kubectl apply -f - <<EOF
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: $SNAPSHOT_NAME
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: postgres-pvc
              EOF

              if [ $? -eq 0 ]; then
                send_notification "Created" \
                  "Snapshot $SNAPSHOT_NAME created successfully" \
                  "good"
              else
                send_notification "Failed" \
                  "Failed to create snapshot $SNAPSHOT_NAME" \
                  "danger"
                exit 1
              fi
```

## Automated Cleanup CronJob

Remove old snapshots based on retention labels:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: snapshot-cleanup
  namespace: production
spec:
  schedule: "0 3 * * *"  # Run at 3 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "Starting snapshot cleanup"

              # Delete hourly snapshots older than 24 hours
              kubectl get volumesnapshot -l schedule=hourly -o json | \
                jq -r '.items[] |
                  select(.metadata.creationTimestamp |
                    fromdateiso8601 < (now - 86400)) |
                  .metadata.name' | while read snapshot; do
                echo "Deleting hourly snapshot: $snapshot"
                kubectl delete volumesnapshot $snapshot
              done

              # Delete daily snapshots older than 7 days
              kubectl get volumesnapshot -l schedule=daily -o json | \
                jq -r '.items[] |
                  select(.metadata.creationTimestamp |
                    fromdateiso8601 < (now - 604800)) |
                  .metadata.name' | while read snapshot; do
                echo "Deleting daily snapshot: $snapshot"
                kubectl delete volumesnapshot $snapshot
              done

              # Delete weekly snapshots older than 4 weeks
              kubectl get volumesnapshot -l schedule=weekly -o json | \
                jq -r '.items[] |
                  select(.metadata.creationTimestamp |
                    fromdateiso8601 < (now - 2419200)) |
                  .metadata.name' | while read snapshot; do
                echo "Deleting weekly snapshot: $snapshot"
                kubectl delete volumesnapshot $snapshot
              done

              # Delete monthly snapshots older than 12 months
              kubectl get volumesnapshot -l schedule=monthly -o json | \
                jq -r '.items[] |
                  select(.metadata.creationTimestamp |
                    fromdateiso8601 < (now - 31536000)) |
                  .metadata.name' | while read snapshot; do
                echo "Deleting monthly snapshot: $snapshot"
                kubectl delete volumesnapshot $snapshot
              done

              echo "Cleanup complete"
```

## Monitoring Snapshot CronJobs

Create a monitoring script:

```bash
#!/bin/bash
# monitor-snapshot-jobs.sh

echo "=== Snapshot CronJob Status ==="
echo

# List all snapshot-related CronJobs
kubectl get cronjob -l backup=snapshot -o wide

echo
echo "=== Last Job Execution ==="

kubectl get cronjob -o json | \
  jq -r '.items[] |
    select(.metadata.labels.backup == "snapshot") |
    {
      name: .metadata.name,
      schedule: .spec.schedule,
      lastSchedule: .status.lastScheduleTime,
      active: .status.active
    } | @json' | \
  while read job; do
    NAME=$(echo $job | jq -r '.name')
    SCHEDULE=$(echo $job | jq -r '.schedule')
    LAST=$(echo $job | jq -r '.lastSchedule // "Never"')

    echo "CronJob: $NAME"
    echo "  Schedule: $SCHEDULE"
    echo "  Last run: $LAST"

    # Get last job status
    LAST_JOB=$(kubectl get job -l cronjob=$NAME \
      --sort-by=.metadata.creationTimestamp \
      -o jsonpath='{.items[-1].metadata.name}' 2>/dev/null)

    if [ -n "$LAST_JOB" ]; then
      STATUS=$(kubectl get job $LAST_JOB -o jsonpath='{.status.conditions[0].type}')
      echo "  Last job: $LAST_JOB ($STATUS)"
    fi
    echo
  done
```

## Best Practices

1. **Use appropriate schedules** based on RPO requirements
2. **Implement retention policies** to manage storage costs
3. **Add pre-flight validation** before creating snapshots
4. **Monitor job failures** and set up alerts
5. **Test restore procedures** regularly
6. **Use labels** to track snapshot schedules and retention
7. **Run cleanup jobs** to remove expired snapshots
8. **Document backup schedules** for compliance

Scheduled volume snapshots with CronJobs provide a reliable, cloud-native way to protect your data without external dependencies. Proper implementation ensures your backup strategy aligns with business continuity requirements.
