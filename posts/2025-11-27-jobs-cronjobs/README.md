# How to Run Kubernetes Jobs and CronJobs for One-Off or Scheduled Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Workloads, Automation, DevOps

Description: Launch reliable Jobs for migrations, wrap them with CronJobs for schedules, and add safety nets like concurrency policies and TTL controllers.

---

Not every workload needs a Deployment. Schema migrations, ETL batches, and nightly cleanups are better as **Jobs** (run-until-complete) or **CronJobs** (scheduled Jobs). Here is how to build both.

## 1. One-Off Job for Database Migration

`jobs/db-migrate.yaml`

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate-payments
  namespace: stage
spec:
  completions: 1
  backoffLimit: 3
  ttlSecondsAfterFinished: 300
  template:
    metadata:
      labels:
        job: migrate-payments
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ghcr.io/example/payments-migrate:1.12.0
          envFrom:
            - secretRef:
                name: payments-secrets
          command: ["./scripts/migrate.sh"]
```

Apply and watch status:

```bash
kubectl apply -f jobs/db-migrate.yaml
kubectl get jobs -n stage
kubectl logs job/migrate-payments -n stage
```

`ttlSecondsAfterFinished` cleans up Pods five minutes after success/failure to keep the namespace tidy.

## 2. Parallel Jobs

Need to crunch large datasets? Use `parallelism` and `completions` to fan out:

```yaml
spec:
  completions: 10
  parallelism: 5
```

Each Pod gets a unique `JOB_COMPLETION_INDEX` env var, handy for sharding workloads.

## 3. Scheduled CronJob

`cronjobs/nightly-cleanup.yaml`

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-cleanup
  namespace: prod
spec:
  schedule: "0 3 * * *" # 3 AM UTC
  timeZone: "UTC"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 2
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: cleanup
              image: ghcr.io/example/cleanup:3.5.1
              args: ["--ttl", "30d", "--hard-delete"]
```

`concurrencyPolicy: Forbid` ensures a new run waits until the previous one finishes. Use `timeZone` (1.27+) so schedules follow local time without manual cron math.

Apply and inspect:

```bash
kubectl apply -f cronjobs/nightly-cleanup.yaml
kubectl get cronjobs -n prod
kubectl get jobs -n prod --selector=cronjob-name=nightly-cleanup
```

## 4. Troubleshoot Failed Jobs

```bash
kubectl describe job migrate-payments -n stage
kubectl logs job/migrate-payments -n stage --previous
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
