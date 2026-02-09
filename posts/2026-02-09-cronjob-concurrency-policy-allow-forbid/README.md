# How to Configure CronJob concurrencyPolicy for Allow, Forbid, and Replace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CronJobs, Scheduling

Description: Learn how to control concurrent job execution in Kubernetes CronJobs using concurrencyPolicy settings to prevent overlapping runs and manage resource usage.

---

When a scheduled job takes longer to complete than its schedule interval, you face a critical question: should the next run start anyway, wait, or replace the running instance? Kubernetes CronJobs answer this with the concurrencyPolicy field, giving you three options: Allow, Forbid, and Replace.

Choosing the right policy prevents resource exhaustion, data corruption from concurrent access, and unpredictable system behavior. The default Allow policy lets runs overlap freely, which is rarely what you want in production systems.

## Understanding Concurrency Policies

The concurrencyPolicy field controls what happens when a new job should start while a previous job from the same CronJob is still running. This is common with long-running batch processes, database maintenance, or slow external API calls.

Allow permits unlimited concurrent runs. Forbid skips the new run if an old one is still active. Replace kills the old run and starts a new one. Each has specific use cases where it makes sense.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: example-cronjob
spec:
  schedule: "*/5 * * * *"
  concurrencyPolicy: Forbid  # Don't run if previous job is still active
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: worker
            image: worker:latest
```

## Using Allow for Independent Tasks

The Allow policy lets multiple jobs run concurrently. This works when each run is completely independent and doesn't interfere with others.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: metrics-collector
spec:
  schedule: "*/1 * * * *"  # Every minute
  concurrencyPolicy: Allow  # Multiple runs can overlap
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: collector
            image: metrics-collector:latest
            command:
            - /bin/bash
            - -c
            - |
              # Each run collects metrics for current timestamp
              TIMESTAMP=$(date +%s)
              echo "Collecting metrics for $TIMESTAMP"

              # Fetch metrics
              curl http://prometheus:9090/api/v1/query \
                -d "query=up" > /tmp/metrics-$TIMESTAMP.json

              # Upload to storage with unique name
              aws s3 cp /tmp/metrics-$TIMESTAMP.json \
                s3://metrics-bucket/$TIMESTAMP.json

              echo "Metrics collected for $TIMESTAMP"
```

Each run creates uniquely named files, so concurrent executions don't conflict. If one run takes 90 seconds, you'll have two concurrent runs, but they won't interfere.

Use Allow sparingly and only when you're certain concurrent runs are safe. Most batch processes benefit from Forbid or Replace instead.

## Using Forbid for Exclusive Operations

The Forbid policy prevents concurrent runs by skipping new jobs when an old one is still active. This is the safest option for most use cases.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  concurrencyPolicy: Forbid  # Never run concurrent backups
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: database-backup:latest
            command:
            - /bin/bash
            - -c
            - |
              echo "Starting database backup at $(date)"

              # Dump database (this might take hours for large databases)
              pg_dump -h postgres -U backup_user production_db > /backup/dump.sql

              # Compress
              gzip /backup/dump.sql

              # Upload to S3
              aws s3 cp /backup/dump.sql.gz \
                s3://backups/db-$(date +%Y%m%d).sql.gz

              echo "Backup completed at $(date)"
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
```

If the backup takes more than 24 hours (unlikely but possible with multi-terabyte databases), the next scheduled run at 2 AM will be skipped. The backup after that will run normally, assuming the long-running backup has finished.

This prevents two simultaneous backups from overwhelming the database or corrupting the backup files. You'll see skipped runs in the CronJob events:

```bash
kubectl describe cronjob database-backup
```

Look for events mentioning "missed start time" or "skipped".

## Using Replace for Latest Data Only

The Replace policy kills any running job and starts a new one. This is useful when you only care about processing the latest data and old runs become obsolete.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cache-refresh
spec:
  schedule: "*/10 * * * *"  # Every 10 minutes
  concurrencyPolicy: Replace  # Kill old job, start new one
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: refresh
            image: cache-refresher:latest
            command:
            - /bin/bash
            - -c
            - |
              echo "Refreshing cache at $(date)"

              # Fetch latest data from primary database
              # If this is slow, we want to start over with fresher data
              # rather than completing stale data

              psql -h postgres -c "COPY (
                SELECT id, name, updated_at
                FROM users
                WHERE updated_at > NOW() - INTERVAL '1 hour'
              ) TO STDOUT" > /tmp/recent_updates.csv

              # Load into cache
              redis-cli --pipe < /tmp/recent_updates.csv

              echo "Cache refreshed with data as of $(date)"
```

If a cache refresh takes 12 minutes, the next scheduled run at minute 10 will kill it and start fresh. This ensures your cache always reflects the most recent data, even if it means abandoning nearly-complete work.

Use Replace carefully. It wastes resources by killing partially complete work. Only use it when fresher data is more valuable than completing old runs.

## Real-World Example: Report Generation

Reports benefit from Forbid because you want each time period's report to complete:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hourly-report
spec:
  schedule: "0 * * * *"  # Top of every hour
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 1800  # Allow 30 minutes late start
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: reporter
            image: report-generator:latest
            command:
            - python3
            - -c
            - |
              import datetime
              import time

              # Determine which hour we're reporting on
              # If it's 2 PM, generate report for 1-2 PM
              now = datetime.datetime.now()
              report_hour = now.replace(minute=0, second=0, microsecond=0) - datetime.timedelta(hours=1)

              print(f"Generating report for {report_hour}")

              # Query data for that specific hour
              # Generate report
              # Upload to storage

              # This might take 45 minutes for complex reports
              time.sleep(2700)  # Simulate processing

              print(f"Report complete for {report_hour}")
```

With Forbid, if the 1 PM report generation runs until 2:45 PM, the 2 PM scheduled run will be skipped. The 3 PM run will start normally and generate the 2 PM report.

This ensures every hour's report eventually gets generated, even if skips occur. You can monitor skipped runs and adjust your schedule or resources if skips are frequent.

## Monitoring Concurrent Runs

Track active jobs from a CronJob:

```bash
# Get all jobs created by a CronJob
kubectl get jobs -l cronjob-name=database-backup

# Count currently running jobs
kubectl get jobs -l cronjob-name=database-backup \
  --field-selector=status.active=1 | wc -l

# See job start times
kubectl get jobs -l cronjob-name=database-backup \
  -o custom-columns=NAME:.metadata.name,START:.status.startTime,ACTIVE:.status.active

# Check for skipped runs with Forbid policy
kubectl describe cronjob database-backup | grep -A5 "Events:"
```

## Detecting Policy Violations

Create an alert for unexpected concurrent runs when using Forbid:

```python
#!/usr/bin/env python3
from kubernetes import client, config

def check_concurrent_violations(cronjob_name, namespace='default'):
    """Alert if Forbid policy is violated"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    # Get the CronJob
    cronjob = batch_v1.read_namespaced_cron_job(cronjob_name, namespace)

    if cronjob.spec.concurrency_policy != 'Forbid':
        return

    # Count active jobs
    jobs = batch_v1.list_namespaced_job(
        namespace=namespace,
        label_selector=f'cronjob-name={cronjob_name}'
    )

    active_count = sum(1 for job in jobs.items if job.status.active and job.status.active > 0)

    if active_count > 1:
        print(f"WARNING: CronJob {cronjob_name} has {active_count} concurrent runs")
        print(f"Policy is Forbid but multiple jobs are active")
        return False

    return True

if __name__ == "__main__":
    check_concurrent_violations('database-backup')
```

## Combining with startingDeadlineSeconds

Control how late a missed run can start:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: time-sensitive-job
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 3600  # Must start within 1 hour
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: processor
            image: time-sensitive:latest
```

If the 6 AM run is still active at noon, the noon run is skipped due to Forbid. If the 6 AM run completes at 12:30 PM, the noon run won't start because it's more than 1 hour past its scheduled time.

This prevents a backlog of jobs from all starting at once when a long blockage clears.

## Failed vs Running Jobs

Concurrency policies only apply to running jobs, not failed ones:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: may-fail-job
spec:
  schedule: "*/5 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: worker
            image: worker:latest
```

If the 1:00 PM job fails and stops retrying (exceeded backoffLimit), it's no longer considered "running". The 1:05 PM job will start normally even though the 1:00 PM job is still visible in kubectl output.

Only actively running jobs (with active pods) prevent new runs under Forbid policy.

## Migration Between Policies

Changing concurrency policy doesn't affect existing jobs:

```bash
# Change policy
kubectl patch cronjob database-backup \
  -p '{"spec":{"concurrencyPolicy":"Replace"}}'

# Already-running jobs continue normally
# New jobs follow new policy
```

This lets you adjust behavior based on observed patterns without disrupting current work.

## Best Practices

Use Forbid as your default unless you have specific reasons for Allow or Replace. Most batch processes shouldn't run concurrently.

Set appropriate schedules to avoid concurrency. If your job takes 30 minutes, don't schedule it every 15 minutes. Schedule it every hour instead.

Monitor for frequent skips with Forbid policy. This indicates your jobs take longer than expected or your schedule is too aggressive. Adjust either the job performance or the schedule.

Combine with successfulJobsHistoryLimit and failedJobsHistoryLimit to keep your cluster clean:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: clean-cronjob
spec:
  schedule: "0 * * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: worker
            image: worker:latest
```

This keeps only the 3 most recent successful jobs and 1 failed job, preventing accumulation while maintaining recent history for debugging.

The right concurrency policy prevents resource conflicts, data corruption, and unpredictable system behavior. Choose based on whether your jobs can safely overlap (rare), must be mutually exclusive (common), or where newer data obsoletes old runs (specific cases).
