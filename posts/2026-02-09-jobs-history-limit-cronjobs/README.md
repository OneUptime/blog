# How to Use successfulJobsHistoryLimit and failedJobsHistoryLimit in CronJobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CronJobs, Resource Management

Description: Learn how to configure job history limits in Kubernetes CronJobs to automatically clean up old job records and prevent cluster clutter while retaining enough history for debugging.

---

CronJobs create a new Job object every time they run. Without cleanup, these Job objects accumulate indefinitely, cluttering your cluster and consuming etcd storage. The successfulJobsHistoryLimit and failedJobsHistoryLimit fields control how many completed Job objects Kubernetes retains.

Setting appropriate history limits keeps your cluster clean while preserving enough recent history for debugging and auditing. The defaults retain 3 successful jobs and 1 failed job, but you should adjust based on your operational needs.

## Understanding History Limits

Kubernetes automatically deletes old Job objects once the history limit is exceeded. This happens when a new Job completes successfully or fails, triggering cleanup of the oldest matching Job object.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-job
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 3  # Keep last 3 successful runs
  failedJobsHistoryLimit: 1      # Keep last 1 failed run
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: backup:latest
            command: ["./run-backup.sh"]
```

With these settings, Kubernetes keeps the 3 most recent successful backup jobs and the 1 most recent failed backup job. Older jobs are deleted automatically.

## Choosing Appropriate Limits

For frequently-running jobs where history is less important:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: metrics-collector
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  successfulJobsHistoryLimit: 1  # Only need to see if last run worked
  failedJobsHistoryLimit: 3      # Keep failures for investigation
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: collector
            image: metrics:latest
```

Running every 5 minutes generates 288 jobs per day. Keeping only 1 successful run saves significant cluster resources.

For critical jobs that need audit trail:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: financial-report
spec:
  schedule: "0 0 1 * *"  # First day of each month
  successfulJobsHistoryLimit: 12  # Keep last year
  failedJobsHistoryLimit: 3       # Keep recent failures
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: reporter
            image: financial-reports:latest
```

Monthly financial reports need longer history for compliance and auditing purposes.

## Disabling History Cleanup

Set limits to 0 to keep no history, or omit the field to use defaults:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: no-history
spec:
  schedule: "0 * * * *"
  successfulJobsHistoryLimit: 0  # Delete successful jobs immediately
  failedJobsHistoryLimit: 0      # Delete failed jobs immediately
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
          - name: worker
            image: worker:latest
```

Use this when you export job results elsewhere and don't need Kubernetes to track history.

## Querying Job History

View retained job history:

```bash
# List jobs from a specific CronJob
kubectl get jobs -l cronjob-name=backup-job

# Sort by completion time
kubectl get jobs -l cronjob-name=backup-job \
  --sort-by=.status.completionTime

# Count successful and failed jobs
echo "Successful: $(kubectl get jobs -l cronjob-name=backup-job \
  --field-selector=status.successful=1 | wc -l)"

echo "Failed: $(kubectl get jobs -l cronjob-name=backup-job \
  --field-selector=status.failed=1 | wc -l)"
```

## Adjusting Limits Over Time

Change history limits as needs evolve:

```bash
# Increase successful history
kubectl patch cronjob backup-job \
  -p '{"spec":{"successfulJobsHistoryLimit":7}}'

# Reduce failed history
kubectl patch cronjob backup-job \
  -p '{"spec":{"failedJobsHistoryLimit":1}}'
```

## Combining with TTL

Use both history limits and TTL for comprehensive cleanup:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: comprehensive-cleanup
spec:
  schedule: "0 * * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 2
  jobTemplate:
    spec:
      ttlSecondsAfterFinished: 7200  # Delete after 2 hours
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: worker
            image: worker:latest
```

This keeps 3 successful and 2 failed jobs, but any job older than 2 hours gets deleted regardless of history limits.

## Monitoring History Usage

Track job accumulation:

```python
#!/usr/bin/env python3
from kubernetes import client, config

config.load_kube_config()
batch_v1 = client.BatchV1Api()

cronjobs = batch_v1.list_cron_job_for_all_namespaces()

for cj in cronjobs.items:
    name = cj.metadata.name
    namespace = cj.metadata.namespace

    # Get job count for this CronJob
    jobs = batch_v1.list_namespaced_job(
        namespace=namespace,
        label_selector=f'cronjob-name={name}'
    )

    successful_limit = cj.spec.successful_jobs_history_limit or 3
    failed_limit = cj.spec.failed_jobs_history_limit or 1

    successful_count = sum(1 for j in jobs.items if j.status.succeeded)
    failed_count = sum(1 for j in jobs.items if j.status.failed)

    print(f"{namespace}/{name}:")
    print(f"  Successful: {successful_count}/{successful_limit}")
    print(f"  Failed: {failed_count}/{failed_limit}")
```

History limits provide automatic cleanup for CronJob objects, keeping your cluster organized while retaining enough recent history for operational needs. Adjust limits based on job frequency, importance, and debugging requirements.
