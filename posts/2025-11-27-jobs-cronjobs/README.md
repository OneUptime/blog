# How to Run Kubernetes Jobs and CronJobs for One-Off or Scheduled Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Workloads, Automation, DevOps

Description: Launch reliable Jobs for migrations, wrap them with CronJobs for schedules, and add safety nets like concurrency policies and TTL controllers.

---

Not every workload needs a Deployment. Schema migrations, ETL batches, and nightly cleanups are better as **Jobs** (run-until-complete) or **CronJobs** (scheduled Jobs). Here is how to build both.

## 1. One-Off Job for Database Migration

A Job runs a container to completion and tracks whether it succeeded or failed. This is ideal for database migrations, data imports, or any task that should run once. The manifest below runs a migration script with automatic retries and cleanup.

`jobs/db-migrate.yaml`

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate-payments
  namespace: stage
spec:
  completions: 1              # Run exactly 1 successful Pod
  backoffLimit: 3             # Retry up to 3 times on failure
  ttlSecondsAfterFinished: 300  # Auto-delete Job 5 mins after completion
  template:
    metadata:
      labels:
        job: migrate-payments  # Label for easy filtering
    spec:
      restartPolicy: Never     # Don't restart failed Pods (Job handles retries)
      containers:
        - name: migrate
          image: ghcr.io/example/payments-migrate:1.12.0
          envFrom:
            - secretRef:
                name: payments-secrets  # Inject DB credentials as env vars
          command: ["./scripts/migrate.sh"]  # Script that performs migration
```

Apply the Job and monitor its progress. The Job controller creates a Pod and tracks its completion status:

```bash
# Create the Job - Kubernetes will immediately start the migration Pod
kubectl apply -f jobs/db-migrate.yaml

# Check Job status - look for COMPLETIONS column (e.g., "1/1")
kubectl get jobs -n stage

# View migration output and any errors
kubectl logs job/migrate-payments -n stage
```

`ttlSecondsAfterFinished` cleans up Pods five minutes after success/failure to keep the namespace tidy.

## 2. Parallel Jobs

Need to crunch large datasets? Use `parallelism` and `completions` to fan out work across multiple Pods. Kubernetes runs up to `parallelism` Pods concurrently until `completions` total succeed. This pattern is perfect for batch processing where work can be split into independent chunks.

```yaml
spec:
  completions: 10   # Total number of Pods that must succeed
  parallelism: 5    # Run up to 5 Pods at a time
```

Each Pod gets a unique `JOB_COMPLETION_INDEX` env var (0-9 in this example), handy for sharding workloads. Your script can use this index to determine which data partition to process.

## 3. Scheduled CronJob

A CronJob creates Jobs on a schedule, like cron but with Kubernetes' reliability guarantees. This is ideal for recurring tasks like database cleanup, report generation, or certificate renewal. The manifest below runs a cleanup script every night at 3 AM.

`cronjobs/nightly-cleanup.yaml`

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-cleanup
  namespace: prod
spec:
  schedule: "0 3 * * *"         # Cron syntax: minute hour day month weekday
  timeZone: "UTC"               # Explicit timezone (requires Kubernetes 1.27+)
  concurrencyPolicy: Forbid     # Skip new run if previous is still running
  successfulJobsHistoryLimit: 3 # Keep last 3 successful Job records
  failedJobsHistoryLimit: 2     # Keep last 2 failed Job records for debugging
  jobTemplate:
    spec:
      backoffLimit: 2           # Retry failed Pods up to 2 times
      template:
        spec:
          restartPolicy: OnFailure  # Restart container if it fails
          containers:
            - name: cleanup
              image: ghcr.io/example/cleanup:3.5.1
              args: ["--ttl", "30d", "--hard-delete"]  # Delete data older than 30 days
```

`concurrencyPolicy: Forbid` ensures a new run waits until the previous one finishes - critical for cleanup jobs that shouldn't overlap. Use `timeZone` (1.27+) so schedules follow local time without manual cron math.

Apply the CronJob and verify it's registered. Kubernetes will automatically create Jobs at the scheduled times:

```bash
# Register the CronJob with the cluster
kubectl apply -f cronjobs/nightly-cleanup.yaml

# Verify CronJob is created (shows SCHEDULE and LAST SCHEDULE columns)
kubectl get cronjobs -n prod

# List Jobs created by this CronJob (appears after scheduled runs)
kubectl get jobs -n prod --selector=cronjob-name=nightly-cleanup
```

## 4. Troubleshoot Failed Jobs

When a Job fails, use these commands to investigate. The `describe` command shows events including why Pods failed, while `--previous` flag retrieves logs from crashed containers.

```bash
# Show Job status, events, and failure reasons
kubectl describe job migrate-payments -n stage

# Get logs from a failed container (--previous shows logs before crash)
kubectl logs job/migrate-payments -n stage --previous

# List all Pods created by this Job (useful when multiple retries occurred)
kubectl get pods -n stage -l job-name=migrate-payments
```

If Pods keep crashing, increase `backoffLimit` or add `activeDeadlineSeconds` to abort long-running tasks.

## 5. Pause or Force-Run CronJobs

- Suspend upcoming runs: `kubectl patch cronjob nightly-cleanup -p '{"spec":{"suspend":true}}' -n prod`.
- Resume by toggling `false`.
- Trigger immediately: `kubectl create job --from=cronjob/nightly-cleanup nightly-cleanup-manual-$(date +%s) -n prod`.

## 6. GitOps + Auditing Tips

- Store Job/CronJob manifests in Git (`batch/` folder).
- Use unique job names per migration (include ticket ID).
- Enable the [TTL Controller for finished resources](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/) on the cluster so `ttlSecondsAfterFinished` works.
- Alert on `kube_job_status_failed` metrics to catch stuck batches quickly.

---

Jobs and CronJobs turn Kubernetes into a general-purpose scheduler. Define the work, set retry/schedule semantics, and let the control plane run it without babysitting servers or crontabs.
