# How to Schedule Cron Jobs on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cron Jobs, Kubernetes, Scheduling, Automation, CronJob

Description: How to schedule recurring tasks on Talos Linux using Kubernetes CronJobs since traditional cron is not available on the immutable OS.

---

If you reach for `crontab -e` on a Talos Linux node, you will be disappointed. There is no cron daemon, no crontab, and no way to schedule recurring tasks at the operating system level. Talos Linux is minimal by design - it includes only what is necessary to run Kubernetes, and a cron daemon is not on that list.

But scheduling recurring tasks is a fundamental operational need. Backups, cleanup jobs, reporting scripts, certificate rotation - these all need to happen on a schedule. The good news is that Kubernetes has a built-in equivalent called CronJob, and it works perfectly on Talos Linux.

## Kubernetes CronJobs: The Talos Way

A Kubernetes CronJob is a resource that creates Job objects on a repeating schedule. Each Job runs a pod that executes a task, and the CronJob controller manages the schedule, retries, and history.

### Basic CronJob Example

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-logs
  namespace: operations
spec:
  schedule: "0 2 * * *"  # Run at 2:00 AM every day
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: busybox:latest
              command:
                - /bin/sh
                - -c
                - |
                  echo "Starting log cleanup at $(date)"
                  # Your cleanup logic here
                  find /data/logs -name "*.log" -mtime +30 -delete
                  echo "Cleanup complete"
              volumeMounts:
                - name: log-data
                  mountPath: /data/logs
          volumes:
            - name: log-data
              persistentVolumeClaim:
                claimName: log-storage
          restartPolicy: OnFailure
```

### Cron Schedule Syntax

The schedule field uses standard cron syntax:

```
# .---------------- minute (0 - 59)
# |  .------------- hour (0 - 23)
# |  |  .---------- day of month (1 - 31)
# |  |  |  .------- month (1 - 12)
# |  |  |  |  .---- day of week (0 - 6, Sunday=0)
# |  |  |  |  |
  *  *  *  *  *

# Examples:
# "*/5 * * * *"     - Every 5 minutes
# "0 * * * *"       - Every hour on the hour
# "0 2 * * *"       - Daily at 2:00 AM
# "0 0 * * 0"       - Weekly on Sunday at midnight
# "0 0 1 * *"       - Monthly on the 1st at midnight
# "30 4 * * 1-5"    - Weekdays at 4:30 AM
```

## Common CronJob Patterns for Talos Clusters

### Database Backups

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: databases
spec:
  schedule: "0 1 * * *"  # Daily at 1:00 AM
  concurrencyPolicy: Forbid  # Don't start new backup if previous is still running
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:16
              command:
                - /bin/sh
                - -c
                - |
                  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
                  BACKUP_FILE="/backups/db_backup_${TIMESTAMP}.sql.gz"
                  # Create the backup
                  pg_dump -h $PGHOST -U $PGUSER $PGDATABASE | gzip > $BACKUP_FILE
                  echo "Backup created: $BACKUP_FILE"
                  # Remove backups older than 30 days
                  find /backups -name "*.sql.gz" -mtime +30 -delete
              env:
                - name: PGHOST
                  value: "postgres.databases.svc"
                - name: PGUSER
                  valueFrom:
                    secretKeyRef:
                      name: postgres-credentials
                      key: username
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: postgres-credentials
                      key: password
                - name: PGDATABASE
                  value: "myapp"
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: backup-pvc
          restartPolicy: OnFailure
```

### Etcd Backups

Particularly important for Talos clusters - backing up etcd ensures you can recover the cluster state:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: etcd-backup
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
                  # Use talosctl to create an etcd snapshot
                  # This assumes talosctl is available in the image
                  # Alternative: use the etcdctl approach
                  echo "Creating etcd backup at $TIMESTAMP"
                  # Your backup command here
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: etcd-backup-pvc
          restartPolicy: OnFailure
```

For etcd backups from outside the cluster, use a cron job on your management workstation:

```bash
#!/bin/bash
# etcd-backup.sh - Run from your workstation via system cron
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/etcd"

# Create etcd snapshot using talosctl
talosctl etcd snapshot --nodes 192.168.1.10 "${BACKUP_DIR}/etcd_${TIMESTAMP}.snapshot"

# Clean up old backups
find $BACKUP_DIR -name "*.snapshot" -mtime +30 -delete
```

### Certificate Monitoring

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cert-check
  namespace: monitoring
spec:
  schedule: "0 8 * * *"  # Daily at 8:00 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cert-checker
              image: alpine:latest
              command:
                - /bin/sh
                - -c
                - |
                  apk add --no-cache openssl curl
                  # Check certificate expiry for critical endpoints
                  for host in api.example.com grafana.example.com; do
                    EXPIRY=$(echo | openssl s_client -connect ${host}:443 2>/dev/null | \
                      openssl x509 -noout -enddate 2>/dev/null)
                    echo "${host}: ${EXPIRY}"
                  done
          restartPolicy: OnFailure
```

### Kubernetes Resource Cleanup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-completed-jobs
  namespace: kube-system
spec:
  schedule: "0 3 * * *"  # Daily at 3:00 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: job-cleaner
          containers:
            - name: cleaner
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Delete completed jobs older than 24 hours
                  kubectl get jobs --all-namespaces \
                    -o jsonpath='{range .items[?(@.status.succeeded==1)]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}' | \
                    while read job; do
                      ns=$(echo $job | cut -d/ -f1)
                      name=$(echo $job | cut -d/ -f2)
                      kubectl delete job $name -n $ns
                    done
          restartPolicy: OnFailure
```

## CronJob Configuration Options

### Concurrency Policy

Controls what happens when a new job is scheduled while the previous one is still running:

```yaml
spec:
  concurrencyPolicy: Forbid    # Skip new job if previous is running
  # concurrencyPolicy: Allow   # Run jobs concurrently (default)
  # concurrencyPolicy: Replace # Cancel running job and start new one
```

### History Limits

Control how many completed and failed jobs to keep:

```yaml
spec:
  successfulJobsHistoryLimit: 3  # Keep last 3 successful jobs
  failedJobsHistoryLimit: 1      # Keep last 1 failed job
```

### Deadline

Set a deadline for starting the job. If the scheduled time passes and the job has not started within the deadline, it is skipped:

```yaml
spec:
  startingDeadlineSeconds: 300  # Must start within 5 minutes of scheduled time
```

### Suspend

Temporarily disable a CronJob without deleting it:

```yaml
spec:
  suspend: true  # Job won't run until this is set back to false
```

## Monitoring CronJobs

Keep track of your scheduled jobs:

```bash
# List all CronJobs
kubectl get cronjobs --all-namespaces

# Check the last scheduled time
kubectl get cronjob <name> -n <namespace> -o wide

# List recent jobs created by a CronJob
kubectl get jobs -n <namespace> -l job-name=<cronjob-name>

# Check logs from the most recent job run
kubectl logs job/<job-name> -n <namespace>
```

### Setting Up Alerts

Use Prometheus to alert on CronJob failures:

```yaml
# PrometheusRule for CronJob monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cronjob-alerts
spec:
  groups:
    - name: cronjob.rules
      rules:
        - alert: CronJobFailed
          expr: kube_job_status_failed{job_name=~".*"} > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "CronJob {{ $labels.job_name }} failed"
```

## Node-Level Scheduled Tasks

If you genuinely need a task to run at the node level (not in Kubernetes), you have a few options:

### Talos Machine Configuration with Timers

Talos does not have a built-in timer mechanism in the machine configuration, but you can use system extensions or init containers with scheduling logic.

### DaemonSet with Sleep Loop

For node-level tasks that need to run on a schedule:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-maintenance
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: node-maintenance
  template:
    metadata:
      labels:
        app: node-maintenance
    spec:
      hostNetwork: true
      hostPID: true
      containers:
        - name: maintenance
          image: busybox:latest
          command:
            - /bin/sh
            - -c
            - |
              while true; do
                echo "Running maintenance at $(date)"
                # Your maintenance task here
                sleep 3600  # Run every hour
              done
          securityContext:
            privileged: true
      tolerations:
        - operator: Exists
```

This is not as elegant as a proper cron daemon, but it works for simple periodic tasks.

## Conclusion

While Talos Linux does not include a cron daemon, Kubernetes CronJobs provide a more robust and manageable alternative. CronJobs benefit from Kubernetes features like pod scheduling, resource limits, retry policies, and built-in monitoring. For operational tasks like backups, cleanup, and health checks, Kubernetes CronJobs are the standard approach on Talos Linux. Combined with proper monitoring and alerting, they provide reliable scheduled task execution across your entire cluster.
