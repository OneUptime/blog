# How to Deploy Jobs and CronJobs with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Jobs, CronJob

Description: Learn how to manage Kubernetes Jobs and CronJobs with ArgoCD, including handling completed jobs, sync behavior, and cleanup strategies for batch workloads.

---

Jobs and CronJobs are Kubernetes resources for running batch workloads - tasks that run to completion rather than running continuously. Database migrations, report generation, data processing, and scheduled backups are all good candidates. Managing these through ArgoCD has some unique challenges because Jobs are inherently different from long-running resources.

## The Challenge: Jobs and GitOps

The fundamental tension between Jobs and GitOps is this: a Job is meant to run once and complete. But ArgoCD continuously reconciles your desired state (Git) with the live state (cluster). If a completed Job exists in Git, ArgoCD sees it as "in sync." If you delete the completed Job from the cluster, ArgoCD recreates it.

This creates several questions:

- How do you prevent ArgoCD from re-running completed Jobs?
- How do you clean up old Job pods?
- How do you handle CronJob-created Jobs that are not in Git at all?

Let's address each of these.

## Deploying a One-Time Job

For jobs that should run exactly once (like a database migration), use ArgoCD resource hooks instead of regular sync:

```yaml
# apps/myapp/db-migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-v2
  annotations:
    # Run before the main sync
    argocd.argoproj.io/hook: PreSync
    # Delete the Job after it succeeds
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  backoffLimit: 3
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:2.0.0
          command: ["./migrate.sh"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
      restartPolicy: Never
```

The key annotations:

- `argocd.argoproj.io/hook: PreSync` - Runs the Job before other resources are synced
- `argocd.argoproj.io/hook-delete-policy: HookSucceeded` - Deletes the Job after successful completion

Other hook phases you can use:

- `PreSync` - Before the sync
- `Sync` - During the sync (alongside other resources)
- `PostSync` - After all resources are synced and healthy
- `SyncFail` - When the sync fails

And delete policies:

- `HookSucceeded` - Delete after success
- `HookFailed` - Delete after failure
- `BeforeHookCreation` - Delete before the next hook run (useful for re-running)

## Deploying CronJobs

CronJobs work well with ArgoCD because ArgoCD manages the CronJob definition, and Kubernetes creates the actual Jobs on schedule:

```yaml
# apps/reports/cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-report
spec:
  schedule: "0 6 * * *"  # 6 AM daily
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 3600
      template:
        spec:
          containers:
            - name: report
              image: myapp:latest
              command: ["python", "generate_report.py"]
              env:
                - name: REPORT_TYPE
                  value: "daily"
                - name: OUTPUT_BUCKET
                  value: "s3://reports/daily/"
              resources:
                requests:
                  cpu: 500m
                  memory: 512Mi
                limits:
                  cpu: "2"
                  memory: 2Gi
          restartPolicy: OnFailure
```

ArgoCD Application for the CronJob:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: scheduled-reports
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: apps/reports
  destination:
    server: https://kubernetes.default.svc
    namespace: batch-jobs
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Handling CronJob-Created Jobs in ArgoCD

When a CronJob creates Jobs, those Jobs are not in Git. ArgoCD handles this correctly - it does not try to prune Jobs created by CronJobs because they are owned by the CronJob resource.

However, ArgoCD might show these child Jobs in the application tree. You can control this with resource tracking:

```yaml
spec:
  ignoreDifferences:
    - group: batch
      kind: Job
      jqPathExpressions:
        - .spec.selector
        - .spec.template.metadata.labels
```

## Running Jobs on Every Sync

Sometimes you want a Job to run every time ArgoCD syncs (for example, a smoke test after deployment):

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    # Delete the old Job before creating a new one
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  backoffLimit: 1
  template:
    spec:
      containers:
        - name: smoke-test
          image: curlimages/curl:latest
          command: [sh, -c]
          args:
            - |
              # Wait for the service to be ready
              sleep 10

              # Run smoke tests
              echo "Testing health endpoint..."
              curl -sf http://myapp:8080/health || exit 1

              echo "Testing API endpoint..."
              curl -sf http://myapp:8080/api/v1/status || exit 1

              echo "All smoke tests passed"
      restartPolicy: Never
```

The `BeforeHookCreation` policy ensures the previous Job is cleaned up before a new one runs.

## Multiple Migration Jobs with Ordering

For complex deployments with multiple migration steps, use sync waves within hooks:

```yaml
# Step 1: Schema migration
apiVersion: batch/v1
kind: Job
metadata:
  name: schema-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    argocd.argoproj.io/sync-wave: "0"
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:2.0.0
          command: ["./schema-migrate.sh"]
      restartPolicy: Never
---
# Step 2: Data migration (after schema is ready)
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    argocd.argoproj.io/sync-wave: "1"
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:2.0.0
          command: ["./data-migrate.sh"]
      restartPolicy: Never
---
# Step 3: Seed data
apiVersion: batch/v1
kind: Job
metadata:
  name: seed-data
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    argocd.argoproj.io/sync-wave: "2"
spec:
  template:
    spec:
      containers:
        - name: seed
          image: myapp:2.0.0
          command: ["./seed.sh"]
      restartPolicy: Never
```

## Health Checks for Jobs

ArgoCD has built-in health checks for Jobs. A Job is considered:

- **Progressing** - While pods are running
- **Healthy** - When the Job completes successfully
- **Degraded** - When the Job fails (exceeds backoffLimit)

For CronJobs, health is determined by whether the CronJob spec is valid and the last scheduled Job succeeded.

You can customize the health check:

```yaml
# In argocd-cm ConfigMap
data:
  resource.customizations.health.batch_CronJob: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.lastScheduleTime ~= nil then
        hs.status = "Healthy"
        hs.message = "CronJob is scheduled"
      else
        hs.status = "Progressing"
        hs.message = "Waiting for first schedule"
      end
    end
    return hs
```

## Job Cleanup Strategies

Completed Jobs leave behind pods. Configure cleanup at multiple levels:

### In the Job spec:

```yaml
spec:
  ttlSecondsAfterFinished: 86400  # Delete 24 hours after completion
```

### In the CronJob spec:

```yaml
spec:
  successfulJobsHistoryLimit: 3  # Keep last 3 successful Jobs
  failedJobsHistoryLimit: 3     # Keep last 3 failed Jobs
```

### With ArgoCD hook policies:

```yaml
annotations:
  argocd.argoproj.io/hook-delete-policy: HookSucceeded
```

## Parallel Jobs for Data Processing

For data processing workloads, use Job parallelism:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
spec:
  parallelism: 5         # Run 5 pods at a time
  completions: 20        # Need 20 successful completions
  completionMode: Indexed # Each pod gets a unique index
  template:
    spec:
      containers:
        - name: processor
          image: myapp:latest
          command: ["python", "process.py"]
          env:
            - name: BATCH_INDEX
              valueFrom:
                fieldRef:
                  fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
      restartPolicy: Never
```

## Monitoring Job Execution

Track Job execution through ArgoCD and Kubernetes:

```bash
# Check Job status in ArgoCD
argocd app get myapp --resource batch:Job:batch-jobs/daily-report

# Watch Job pods
kubectl get jobs -n batch-jobs -w

# Check CronJob schedule
kubectl get cronjobs -n batch-jobs

# View Job logs
kubectl logs job/daily-report -n batch-jobs
```

## Summary

Jobs and CronJobs require special handling in ArgoCD. Use resource hooks with appropriate delete policies for one-time Jobs like database migrations. Use standard sync for CronJobs since ArgoCD manages the schedule definition while Kubernetes handles Job creation. Always configure cleanup strategies through TTL, history limits, or hook delete policies to prevent stale resources from accumulating. With these patterns, batch workloads fit naturally into your GitOps workflow.
