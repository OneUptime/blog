# How to Deploy CronJobs with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, CronJobs, Scheduled Tasks, GitOps, Batch Processing

Description: A practical guide to deploying and managing Kubernetes CronJobs with Flux CD for scheduled tasks, batch processing, and maintenance operations.

---

## Introduction

Kubernetes CronJobs run tasks on a schedule, similar to cron on Linux systems. They are used for backups, report generation, data cleanup, and other periodic operations. Managing CronJobs with Flux CD ensures your scheduled tasks are version-controlled and consistently deployed.

This guide covers practical patterns for deploying CronJobs with Flux CD, including concurrency control, failure handling, and monitoring.

## Prerequisites

- A Kubernetes cluster (v1.26+)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux

## Repository Structure

```text
clusters/
  my-cluster/
    cronjobs.yaml
apps/
  cronjobs/
    kustomization.yaml
    database-backup.yaml
    log-cleanup.yaml
    report-generator.yaml
    health-checker.yaml
```

## Flux Kustomization for CronJobs

```yaml
# clusters/my-cluster/cronjobs.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cronjobs
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/cronjobs
  prune: true
  wait: true
  timeout: 5m
```

## Database Backup CronJob

```yaml
# apps/cronjobs/database-backup.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cronjobs
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: db-backup
  namespace: cronjobs
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: cronjobs
  labels:
    app: database-backup
    app.kubernetes.io/managed-by: flux
spec:
  # Run daily at 2:00 AM UTC
  schedule: "0 2 * * *"
  # Timezone support (requires Kubernetes 1.27+)
  timeZone: "UTC"
  # Do not start a new job if the previous one is still running
  concurrencyPolicy: Forbid
  # Keep last 5 successful and 3 failed jobs for debugging
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  # If the job misses its schedule by more than 5 minutes, skip it
  startingDeadlineSeconds: 300
  jobTemplate:
    spec:
      # Automatically clean up finished jobs after 24 hours
      ttlSecondsAfterFinished: 86400
      # Retry up to 3 times on failure
      backoffLimit: 3
      # Set a maximum runtime of 1 hour
      activeDeadlineSeconds: 3600
      template:
        metadata:
          labels:
            app: database-backup
        spec:
          serviceAccountName: db-backup
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: myregistry.io/db-backup:v1.2.0
              command: ["/bin/sh", "-c"]
              args:
                - |
                  # Generate timestamped backup filename
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  BACKUP_FILE="/backups/db-backup-${TIMESTAMP}.sql.gz"

                  echo "Starting database backup at $(date)"

                  # Perform the database dump and compress
                  mysqldump \
                    --host=${DB_HOST} \
                    --user=${DB_USER} \
                    --password=${DB_PASSWORD} \
                    --single-transaction \
                    --routines \
                    --triggers \
                    --all-databases | gzip > ${BACKUP_FILE}

                  # Verify the backup file was created and has content
                  if [ -s "${BACKUP_FILE}" ]; then
                    echo "Backup successful: ${BACKUP_FILE} ($(du -h ${BACKUP_FILE} | cut -f1))"

                    # Upload to S3
                    aws s3 cp ${BACKUP_FILE} s3://${S3_BUCKET}/database-backups/

                    # Clean up local backup
                    rm -f ${BACKUP_FILE}
                    echo "Backup uploaded to S3 and local copy removed"
                  else
                    echo "Backup failed: file is empty or missing"
                    exit 1
                  fi

                  # Remove backups older than 30 days from S3
                  aws s3 ls s3://${S3_BUCKET}/database-backups/ \
                    --recursive | \
                    awk '{print $4}' | \
                    while read file; do
                      file_date=$(echo $file | grep -oP '\d{8}')
                      if [ $(date -d "$file_date" +%s) -lt $(date -d "30 days ago" +%s) ]; then
                        aws s3 rm s3://${S3_BUCKET}/$file
                        echo "Deleted old backup: $file"
                      fi
                    done
              env:
                - name: DB_HOST
                  value: "mysql.database.svc.cluster.local"
                - name: DB_USER
                  valueFrom:
                    secretKeyRef:
                      name: db-credentials
                      key: username
                - name: DB_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: db-credentials
                      key: password
                - name: S3_BUCKET
                  value: "my-company-backups"
              resources:
                requests:
                  cpu: "250m"
                  memory: "512Mi"
                limits:
                  cpu: "1"
                  memory: "1Gi"
              volumeMounts:
                - name: backup-temp
                  mountPath: /backups
          volumes:
            - name: backup-temp
              emptyDir:
                sizeLimit: 10Gi
```

## Log Cleanup CronJob

```yaml
# apps/cronjobs/log-cleanup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: log-cleanup
  namespace: cronjobs
  labels:
    app: log-cleanup
spec:
  # Run every Sunday at 3:00 AM
  schedule: "0 3 * * 0"
  timeZone: "UTC"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      ttlSecondsAfterFinished: 43200
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: cleanup
              image: curlimages/curl:8.5.0
              command: ["/bin/sh", "-c"]
              args:
                - |
                  # Delete Elasticsearch indices older than 14 days
                  echo "Cleaning up old log indices..."

                  # Get the date 14 days ago in the index format
                  CUTOFF_DATE=$(date -d "14 days ago" +%Y.%m.%d 2>/dev/null || \
                    date -v-14d +%Y.%m.%d)

                  # List all log indices
                  INDICES=$(curl -s \
                    "http://elasticsearch.logging:9200/_cat/indices/kubernetes-logs-*" \
                    | awk '{print $3}')

                  for INDEX in $INDICES; do
                    # Extract date from index name
                    INDEX_DATE=$(echo $INDEX | grep -oP '\d{4}\.\d{2}\.\d{2}')
                    if [ "$INDEX_DATE" \< "$CUTOFF_DATE" ]; then
                      echo "Deleting index: $INDEX"
                      curl -s -X DELETE \
                        "http://elasticsearch.logging:9200/$INDEX"
                    fi
                  done

                  echo "Cleanup complete"
              resources:
                requests:
                  cpu: "100m"
                  memory: "128Mi"
                limits:
                  cpu: "250m"
                  memory: "256Mi"
```

## Report Generator CronJob

```yaml
# apps/cronjobs/report-generator.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: report-generator
  namespace: cronjobs
  labels:
    app: report-generator
spec:
  # Run on the first day of every month at 6:00 AM
  schedule: "0 6 1 * *"
  timeZone: "America/New_York"
  concurrencyPolicy: Replace
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 7200  # 2 hour maximum
      template:
        spec:
          restartPolicy: OnFailure
          # Init container to wait for database availability
          initContainers:
            - name: wait-for-db
              image: busybox:1.36
              command: ["sh", "-c"]
              args:
                - |
                  # Wait for the database to be reachable
                  until nc -z postgres.database.svc.cluster.local 5432; do
                    echo "Waiting for database..."
                    sleep 5
                  done
                  echo "Database is ready"
          containers:
            - name: report
              image: myregistry.io/report-generator:v2.0.0
              command: ["python", "/app/generate_report.py"]
              env:
                - name: REPORT_MONTH
                  value: "previous"
                - name: OUTPUT_FORMAT
                  value: "pdf,csv"
                - name: SMTP_HOST
                  value: "smtp.company.com"
                - name: RECIPIENTS
                  valueFrom:
                    configMapKeyRef:
                      name: report-config
                      key: recipients
                - name: DB_CONNECTION_STRING
                  valueFrom:
                    secretKeyRef:
                      name: db-credentials
                      key: connection-string
              resources:
                requests:
                  cpu: "500m"
                  memory: "1Gi"
                limits:
                  cpu: "2"
                  memory: "4Gi"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: report-config
  namespace: cronjobs
data:
  recipients: "team@company.com,management@company.com"
```

## Health Checker CronJob

```yaml
# apps/cronjobs/health-checker.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: health-checker
  namespace: cronjobs
  labels:
    app: health-checker
spec:
  # Run every 15 minutes
  schedule: "*/15 * * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 5
  startingDeadlineSeconds: 60
  jobTemplate:
    spec:
      ttlSecondsAfterFinished: 900
      backoffLimit: 1
      activeDeadlineSeconds: 300
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: checker
              image: curlimages/curl:8.5.0
              command: ["/bin/sh", "-c"]
              args:
                - |
                  # Check multiple service endpoints
                  FAILED=0

                  check_endpoint() {
                    SERVICE=$1
                    URL=$2
                    EXPECTED_CODE=$3

                    CODE=$(curl -s -o /dev/null -w "%{http_code}" \
                      --connect-timeout 5 \
                      --max-time 10 \
                      "$URL")

                    if [ "$CODE" = "$EXPECTED_CODE" ]; then
                      echo "OK: $SERVICE returned $CODE"
                    else
                      echo "FAIL: $SERVICE returned $CODE (expected $EXPECTED_CODE)"
                      FAILED=$((FAILED + 1))
                    fi
                  }

                  check_endpoint "API" "http://api.default.svc:8080/health" "200"
                  check_endpoint "Frontend" "http://frontend.default.svc:3000/" "200"
                  check_endpoint "Auth" "http://auth.default.svc:8081/health" "200"

                  if [ $FAILED -gt 0 ]; then
                    echo "$FAILED service(s) failed health check"
                    exit 1
                  fi

                  echo "All services healthy"
              resources:
                requests:
                  cpu: "50m"
                  memory: "32Mi"
                limits:
                  cpu: "100m"
                  memory: "64Mi"
```

## Kustomize Overlays for Environments

Adjust CronJob schedules per environment:

```yaml
# apps/cronjobs/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - database-backup.yaml
  - log-cleanup.yaml
  - report-generator.yaml
  - health-checker.yaml

# apps/cronjobs/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base

# apps/cronjobs/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  # Reduce backup frequency in staging
  - target:
      kind: CronJob
      name: database-backup
    patch: |
      - op: replace
        path: /spec/schedule
        value: "0 2 * * 0"
  # Disable health checker in staging
  - target:
      kind: CronJob
      name: health-checker
    patch: |
      - op: replace
        path: /spec/suspend
        value: true
```

## Suspending CronJobs

Temporarily suspend a CronJob through Git:

```yaml
# apps/cronjobs/report-generator.yaml (suspended)
apiVersion: batch/v1
kind: CronJob
metadata:
  name: report-generator
  namespace: cronjobs
spec:
  # Set suspend to true to pause scheduling
  suspend: true
  schedule: "0 6 1 * *"
  # ... rest of spec
```

## Monitoring CronJob Failures

```yaml
# apps/monitoring/cronjob-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cronjob-alerts
  namespace: monitoring
spec:
  groups:
    - name: cronjob.rules
      rules:
        - alert: CronJobFailed
          expr: |
            kube_job_status_failed{job_name=~".*"} > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "CronJob {{ $labels.job_name }} has failed"
        - alert: CronJobNotScheduled
          # Alert if a CronJob has not run in the expected window
          expr: |
            time() - kube_cronjob_status_last_schedule_time > 2 * kube_cronjob_spec_period
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "CronJob {{ $labels.cronjob }} has not run on schedule"
```

## Flux Notifications for CronJob Changes

```yaml
# clusters/my-cluster/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: cronjob-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: cronjobs
  summary: "CronJob deployment alert"
```

## Summary

Managing CronJobs with Flux CD provides version-controlled scheduling and consistent deployment:

- Use `concurrencyPolicy: Forbid` to prevent overlapping runs of the same job
- Set `startingDeadlineSeconds` to handle missed schedules gracefully
- Configure `ttlSecondsAfterFinished` to clean up completed jobs automatically
- Keep history limits reasonable with `successfulJobsHistoryLimit` and `failedJobsHistoryLimit`
- Set `activeDeadlineSeconds` to prevent runaway jobs
- Use Kustomize overlays to adjust schedules across environments
- Use `suspend: true` to temporarily disable CronJobs through Git
- Monitor CronJob failures and missed schedules with Prometheus alerts
