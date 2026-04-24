# How to Deploy Jobs and CronJobs via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Job, CronJob, Automation

Description: Deploy and manage Kubernetes Jobs for one-time tasks and CronJobs for scheduled workloads through Portainer's Kubernetes interface.

## Introduction

Kubernetes Jobs run containers to completion for batch processing, database migrations, and one-time tasks. CronJobs schedule Jobs to run on a cron schedule. Portainer's Kubernetes interface supports deploying both through YAML manifests.

## Kubernetes Job Examples

```yaml
# database-migration-job.yml - deploy via Portainer

apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-v2-5
  namespace: production
  labels:
    app: myapp
    version: "2.5"
spec:
  completions: 1      # Run once successfully
  parallelism: 1      # Only 1 pod at a time
  backoffLimit: 3     # Retry 3 times before failing
  activeDeadlineSeconds: 600  # Fail if not complete in 10 min
  template:
    metadata:
      labels:
        job: db-migration
    spec:
      restartPolicy: OnFailure  # Jobs must use OnFailure or Never
      containers:
      - name: migrate
        image: myapp:2.5
        command: ["python", "manage.py", "migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Parallel Job for Batch Processing

```yaml
# batch-processing-job.yml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-process-reports
  namespace: production
spec:
  completions: 10     # Must complete 10 times
  parallelism: 3      # Run 3 in parallel
  completionMode: Indexed  # Required for per-pod completion indexes
  backoffLimit: 6
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: processor
        image: report-processor:latest
        env:
        - name: JOB_INDEX
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
        command:
        - sh
        - -c
        - "python process_batch.py --batch-index=$JOB_INDEX"
```

## CronJob Examples

```yaml
# backup-cronjob.yml - daily database backup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: production
spec:
  schedule: "0 2 * * *"        # Daily at 2 AM
  timeZone: "America/New_York"  # Kubernetes 1.27+
  concurrencyPolicy: Forbid     # Don't run if previous is still running
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  startingDeadlineSeconds: 300  # 5-minute startup deadline
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: postgres:15
            command:
            - sh
            - -c
            - |
              BACKUP_FILE="/backups/backup-$(date +%Y%m%d-%H%M%S).sql.gz"
              pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_FILE
              echo "Backup created: $BACKUP_FILE"
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
            - name: DB_HOST
              value: "postgres.production.svc.cluster.local"
            - name: DB_USER
              value: "backup"
            - name: DB_NAME
              value: "myapp"
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
---
# cleanup-cronjob.yml - weekly cleanup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-old-data
  namespace: production
spec:
  schedule: "0 0 * * 0"    # Every Sunday at midnight
  concurrencyPolicy: Replace
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
          - name: cleanup
            image: myapp:latest
            command: ["python", "manage.py", "cleanup", "--days=90"]
```

## Managing Jobs in Portainer

Via Portainer: **Kubernetes > More Resources > Cron Jobs & Jobs** (select the "Jobs" or "Cron Jobs" tab)

Or via the **Create from file** option.

```bash
# Monitor job progress via Portainer API
curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints/1/kubernetes/apis/batch/v1/namespaces/production/jobs/db-migration-v2-5" \
  | python3 -c "
import sys, json
job = json.load(sys.stdin)
status = job['status']
print(f'Active: {status.get(\"active\", 0)}')
print(f'Succeeded: {status.get(\"succeeded\", 0)}')
print(f'Failed: {status.get(\"failed\", 0)}')
"

# Trigger a CronJob manually (create a one-off Job from the CronJob template)
kubectl create job manual-backup-$(date +%Y%m%d) --from=cronjob/database-backup -n production
```

## Conclusion

Jobs and CronJobs in Kubernetes managed via Portainer provide a clean way to run batch workloads alongside long-running services. Portainer's YAML editor makes creating these resources straightforward, and the Kubernetes jobs view shows completion status. CronJobs integrate well with existing backup, cleanup, and reporting workflows that need to run on a schedule.
