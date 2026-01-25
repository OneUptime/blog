# How to Configure CronJobs for Scheduled Tasks in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CronJobs, Scheduling, Automation, DevOps

Description: A comprehensive guide to creating and managing Kubernetes CronJobs for scheduled tasks, including cron syntax, concurrency policies, job history, and troubleshooting common issues.

---

Kubernetes CronJobs run Jobs on a time-based schedule using the familiar cron syntax. They are ideal for scheduled tasks like backups, report generation, cleanup operations, and periodic data synchronization.

## Basic CronJob Structure

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-backup
spec:
  schedule: "0 2 * * *"    # Run at 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: backup-tool:v1
              command: ["./backup.sh"]
          restartPolicy: OnFailure
```

## Cron Schedule Syntax

```
# ┌───────────── minute (0 - 59)
# │ ┌───────────── hour (0 - 23)
# │ │ ┌───────────── day of month (1 - 31)
# │ │ │ ┌───────────── month (1 - 12)
# │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
# │ │ │ │ │
# * * * * *
```

### Common Schedule Examples

| Schedule | Cron Expression |
|----------|----------------|
| Every minute | `* * * * *` |
| Every 5 minutes | `*/5 * * * *` |
| Every hour | `0 * * * *` |
| Every day at midnight | `0 0 * * *` |
| Every day at 2:30 AM | `30 2 * * *` |
| Every Monday at 9 AM | `0 9 * * 1` |
| First of month at midnight | `0 0 1 * *` |
| Every weekday at 8 AM | `0 8 * * 1-5` |

## CronJob Configuration Options

### Concurrency Policy

Control what happens if a new job starts while previous is still running:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-sync
spec:
  schedule: "*/10 * * * *"
  concurrencyPolicy: Forbid    # Skip if previous job still running
  # concurrencyPolicy: Allow    # Default - run concurrent
  # concurrencyPolicy: Replace  # Kill previous, start new
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: sync
              image: sync:v1
          restartPolicy: OnFailure
```

### Starting Deadline

Maximum time to start the job after its scheduled time:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: time-sensitive
spec:
  schedule: "0 * * * *"
  startingDeadlineSeconds: 300    # Must start within 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: task
              image: task:v1
          restartPolicy: OnFailure
```

If the deadline is missed (e.g., due to controller downtime), the job is skipped.

### Job History Limits

Control how many completed and failed jobs to keep:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup
spec:
  schedule: "0 4 * * *"
  successfulJobsHistoryLimit: 3    # Keep last 3 successful
  failedJobsHistoryLimit: 1        # Keep last 1 failed
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: cleanup:v1
          restartPolicy: OnFailure
```

### Suspend CronJob

Temporarily disable without deleting:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: disabled-job
spec:
  schedule: "0 0 * * *"
  suspend: true    # Paused
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: task
              image: task:v1
          restartPolicy: OnFailure
```

```bash
# Suspend via kubectl
kubectl patch cronjob my-cronjob -p '{"spec": {"suspend": true}}'

# Resume
kubectl patch cronjob my-cronjob -p '{"spec": {"suspend": false}}'
```

## Common CronJob Patterns

### Pattern 1: Database Backup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 3 * * *"    # Daily at 3 AM
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:15
              command:
                - /bin/sh
                - -c
                - |
                  pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > /backup/backup-$(date +%Y%m%d).sql.gz
                  # Upload to S3
                  aws s3 cp /backup/backup-$(date +%Y%m%d).sql.gz s3://backups/postgres/
              env:
                - name: DB_HOST
                  value: postgres-service
                - name: DB_USER
                  valueFrom:
                    secretKeyRef:
                      name: db-credentials
                      key: username
                - name: DB_NAME
                  value: myapp
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: db-credentials
                      key: password
              volumeMounts:
                - name: backup
                  mountPath: /backup
          volumes:
            - name: backup
              emptyDir: {}
          restartPolicy: OnFailure
      backoffLimit: 3
```

### Pattern 2: Log Cleanup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: log-cleanup
spec:
  schedule: "0 5 * * 0"    # Weekly on Sunday at 5 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: busybox:1.36
              command:
                - /bin/sh
                - -c
                - |
                  # Delete logs older than 7 days
                  find /var/log/app -name "*.log" -mtime +7 -delete
                  echo "Cleanup completed at $(date)"
              volumeMounts:
                - name: logs
                  mountPath: /var/log/app
          volumes:
            - name: logs
              persistentVolumeClaim:
                claimName: app-logs
          restartPolicy: OnFailure
```

### Pattern 3: Report Generation

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-report
spec:
  schedule: "0 8 * * 1"    # Monday at 8 AM
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 3600
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: report
              image: reporter:v1
              command: ["python", "generate_report.py", "--weekly"]
              env:
                - name: EMAIL_RECIPIENTS
                  value: "team@company.com"
                - name: SMTP_SERVER
                  value: "smtp.company.com"
          restartPolicy: OnFailure
      backoffLimit: 2
      activeDeadlineSeconds: 7200    # Max 2 hours
```

### Pattern 4: Cache Warmup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cache-warmup
spec:
  schedule: "*/30 * * * *"    # Every 30 minutes
  concurrencyPolicy: Replace    # Kill old, start new
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: warmup
              image: curlimages/curl
              command:
                - /bin/sh
                - -c
                - |
                  # Hit key endpoints to warm cache
                  curl -s http://api-service/api/products
                  curl -s http://api-service/api/categories
                  curl -s http://api-service/api/popular
                  echo "Cache warmed at $(date)"
          restartPolicy: OnFailure
```

### Pattern 5: Certificate Renewal Check

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cert-check
spec:
  schedule: "0 6 * * *"    # Daily at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: checker
              image: alpine:3.18
              command:
                - /bin/sh
                - -c
                - |
                  # Check certificate expiry
                  EXPIRY=$(echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
                  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
                  NOW_EPOCH=$(date +%s)
                  DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

                  if [ $DAYS_LEFT -lt 30 ]; then
                    echo "WARNING: Certificate expires in $DAYS_LEFT days"
                    # Send alert
                  else
                    echo "Certificate OK: $DAYS_LEFT days remaining"
                  fi
          restartPolicy: OnFailure
```

## Managing CronJobs

### View CronJobs

```bash
# List CronJobs
kubectl get cronjobs

# Output:
# NAME            SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE
# daily-backup    0 3 * * *     False     0        3h

# Describe CronJob
kubectl describe cronjob daily-backup

# Get jobs created by CronJob
kubectl get jobs -l job-name=daily-backup
```

### Trigger Manual Run

```bash
# Create job from cronjob immediately
kubectl create job --from=cronjob/daily-backup manual-backup-$(date +%s)

# Check job status
kubectl get jobs -l app=backup
```

### View Job Logs

```bash
# Get pods from most recent job
kubectl get pods -l job-name=daily-backup-xxxx

# View logs
kubectl logs -l job-name=daily-backup-xxxx
```

## Troubleshooting

### CronJob Not Running

```bash
# Check if suspended
kubectl get cronjob daily-backup -o jsonpath='{.spec.suspend}'

# Check last schedule time
kubectl get cronjob daily-backup -o jsonpath='{.status.lastScheduleTime}'

# Check for events
kubectl describe cronjob daily-backup
```

### Jobs Piling Up

```bash
# Check active jobs
kubectl get jobs

# If concurrencyPolicy is Allow, jobs may accumulate
# Change to Forbid or set history limits
kubectl patch cronjob my-cronjob -p '{"spec":{"concurrencyPolicy":"Forbid","successfulJobsHistoryLimit":3}}'
```

### Missed Schedule

If controller was down during scheduled time:

```bash
# Check for missed jobs
kubectl describe cronjob daily-backup

# Look for:
# Events:
#   Warning  MissSchedule  Cannot determine if job needs to be started
```

Solution: Set appropriate `startingDeadlineSeconds`.

### Timezone Issues

CronJobs use the kube-controller-manager timezone (usually UTC):

```yaml
# Use explicit UTC times
schedule: "0 10 * * *"    # 10 AM UTC

# Or calculate local time offset
# For PST (UTC-8), 2 AM PST = 10 AM UTC
schedule: "0 10 * * *"    # 2 AM PST
```

For timezone support (Kubernetes 1.24+):

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: timezone-job
spec:
  schedule: "0 2 * * *"
  timeZone: "America/Los_Angeles"    # Run at 2 AM Pacific
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: task
              image: task:v1
          restartPolicy: OnFailure
```

## Best Practices

### 1. Set History Limits

```yaml
spec:
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
```

### 2. Use Concurrency Policy

```yaml
spec:
  concurrencyPolicy: Forbid    # Prevents overlap
```

### 3. Set Deadlines

```yaml
spec:
  startingDeadlineSeconds: 600
  jobTemplate:
    spec:
      activeDeadlineSeconds: 3600
```

### 4. Add Resource Limits

```yaml
spec:
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: task
              resources:
                limits:
                  memory: "512Mi"
                  cpu: "500m"
```

### 5. Use Labels for Organization

```yaml
metadata:
  name: daily-backup
  labels:
    app: backup
    schedule: daily
spec:
  jobTemplate:
    metadata:
      labels:
        app: backup
        type: scheduled
```

## Complete Example

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-data-sync
  namespace: production
  labels:
    app: data-sync
    team: platform
spec:
  schedule: "0 1 * * *"
  timeZone: "UTC"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 900
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    metadata:
      labels:
        app: data-sync
    spec:
      backoffLimit: 3
      activeDeadlineSeconds: 7200
      template:
        spec:
          containers:
            - name: sync
              image: data-sync:v1
              command: ["python", "sync.py"]
              env:
                - name: SOURCE_DB
                  valueFrom:
                    secretKeyRef:
                      name: sync-credentials
                      key: source-url
                - name: DEST_DB
                  valueFrom:
                    secretKeyRef:
                      name: sync-credentials
                      key: dest-url
              resources:
                requests:
                  memory: "512Mi"
                  cpu: "250m"
                limits:
                  memory: "1Gi"
                  cpu: "1000m"
          restartPolicy: OnFailure
          # Use dedicated node pool for batch
          nodeSelector:
            workload-type: batch
```

---

Kubernetes CronJobs provide a reliable way to run scheduled tasks in your cluster. Choose the right concurrency policy for your workload, set appropriate deadlines and history limits, and monitor job executions to ensure your scheduled tasks run successfully. For critical jobs, consider adding alerting based on job failure counts.
