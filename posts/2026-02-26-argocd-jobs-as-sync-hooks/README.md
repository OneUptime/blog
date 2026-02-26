# How to Use Jobs as Sync Hooks in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Hooks, Jobs

Description: Learn how to use Kubernetes Jobs as ArgoCD sync hooks for running one-time tasks like migrations, tests, and notifications during deployment workflows.

---

Kubernetes Jobs are the natural resource type for ArgoCD sync hooks. A Job creates one or more Pods, runs them to completion, and reports success or failure. This aligns perfectly with what hooks need to do - run a task, tell ArgoCD whether it worked, and then get cleaned up.

While ArgoCD supports any resource type as a hook, Jobs are by far the most common and the best fit for most use cases. This guide covers the patterns, configurations, and best practices for using Jobs as sync hooks effectively.

## Why Jobs Are Ideal for Hooks

Jobs have several properties that make them the right choice:

**Completion tracking**: Kubernetes tracks whether the Job succeeded or failed. ArgoCD uses this to determine if the sync should proceed.

**Retry support**: Jobs have built-in retry logic via `backoffLimit`. If a Pod fails, Kubernetes creates a new one automatically.

**Timeout support**: `activeDeadlineSeconds` kills the Job if it runs too long.

**Cleanup**: Pods created by Jobs are not restarted by Kubernetes after completion, unlike Pods in Deployments.

## Basic Job Hook

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: presync-task
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded, BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: task
          image: myorg/tools:latest
          command: ["./run-task.sh"]
      restartPolicy: Never
  backoffLimit: 3
  activeDeadlineSeconds: 300
```

## Essential Job Configuration for Hooks

### restartPolicy

Jobs require `restartPolicy` to be `Never` or `OnFailure`. For hooks, `Never` is almost always the right choice:

```yaml
# Never: Pod fails once, Job creates a new Pod (up to backoffLimit)
restartPolicy: Never

# OnFailure: Kubernetes restarts the same Pod on failure
restartPolicy: OnFailure
```

Use `Never` because:
- ArgoCD monitors Job status, not individual Pod status
- `Never` gives you clean logs from each attempt (separate Pods)
- `OnFailure` might loop within the same Pod without ArgoCD's awareness

### backoffLimit

Controls how many times the Job retries after failure:

```yaml
# For critical tasks like migrations - allow retries
backoffLimit: 3

# For idempotent verification tasks - fewer retries
backoffLimit: 1

# For tasks that should not retry (like notifications)
backoffLimit: 0
```

When `backoffLimit` is reached, the Job is marked as Failed, and ArgoCD stops the sync (for PreSync hooks) or marks it as failed (for PostSync hooks).

### activeDeadlineSeconds

Prevents runaway Jobs from blocking syncs indefinitely:

```yaml
# Database migration - might take a few minutes
activeDeadlineSeconds: 300

# Quick health check
activeDeadlineSeconds: 60

# Long-running data import
activeDeadlineSeconds: 1800
```

If the deadline is reached, Kubernetes terminates the Job's Pods and marks the Job as Failed.

### ttlSecondsAfterFinished

Kubernetes can auto-cleanup completed Jobs:

```yaml
# Kubernetes deletes the Job 5 minutes after completion
ttlSecondsAfterFinished: 300
```

However, ArgoCD's hook delete policies are usually a better fit for cleanup since they integrate with the sync lifecycle.

## Job Hook Patterns

### Migration Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded, BeforeHookCreation
spec:
  template:
    metadata:
      labels:
        app: db-migrate
    spec:
      containers:
        - name: migrate
          image: myorg/api:latest
          command: ["python", "manage.py", "migrate", "--no-input"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-creds
                  key: url
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
      restartPolicy: Never
  backoffLimit: 3
  activeDeadlineSeconds: 300
```

### Multi-Step Job

When a hook needs to perform multiple sequential steps:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: deployment-prep
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      initContainers:
        # Step 1: Download migration files
        - name: download-migrations
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              curl -sf "https://artifacts.example.com/migrations/latest.tar.gz" \
                -o /shared/migrations.tar.gz
              tar xzf /shared/migrations.tar.gz -C /shared/
          volumeMounts:
            - name: shared
              mountPath: /shared
        # Step 2: Validate migrations
        - name: validate-migrations
          image: myorg/migration-validator:latest
          command: ["validate", "/shared/migrations/"]
          volumeMounts:
            - name: shared
              mountPath: /shared
      containers:
        # Step 3: Run migrations
        - name: migrate
          image: myorg/api:latest
          command: ["alembic", "upgrade", "head"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-creds
                  key: url
          volumeMounts:
            - name: shared
              mountPath: /shared
      volumes:
        - name: shared
          emptyDir: {}
      restartPolicy: Never
  backoffLimit: 2
  activeDeadlineSeconds: 600
```

Init containers run sequentially before the main container. If any init container fails, the Pod restarts (subject to the Job's backoffLimit).

### Parallel Execution Job

For hooks that need parallel processing:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: parallel-health-checks
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded, BeforeHookCreation
spec:
  # Run 3 Pods in parallel, all must succeed
  completions: 3
  parallelism: 3
  template:
    spec:
      containers:
        - name: check
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              # Each Pod checks a different service based on Pod index
              case $JOB_COMPLETION_INDEX in
                0) curl -sf http://database:5432/ && echo "Database OK" ;;
                1) curl -sf http://redis:6379/ && echo "Redis OK" ;;
                2) curl -sf http://rabbitmq:15672/ && echo "RabbitMQ OK" ;;
              esac
          env:
            - name: JOB_COMPLETION_INDEX
              valueFrom:
                fieldRef:
                  fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
      restartPolicy: Never
  backoffLimit: 1
  activeDeadlineSeconds: 60
```

### Job with Volume Mounts

When hooks need access to persistent data or configuration:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-seed
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: seed
          image: myorg/api:latest
          command: ["python", "manage.py", "seed_data"]
          volumeMounts:
            - name: seed-data
              mountPath: /data/seeds
            - name: config
              mountPath: /etc/app/
      volumes:
        - name: seed-data
          configMap:
            name: seed-data-config
        - name: config
          secret:
            secretName: app-config
      restartPolicy: Never
  backoffLimit: 1
```

## Job Hook Health Assessment

ArgoCD determines Job health as follows:

- **Healthy**: Job completed with `status.succeeded >= 1`
- **Progressing**: Job is still running (Pods are active)
- **Degraded**: Job failed (all Pods failed, `status.failed >= backoffLimit`)

During a sync, ArgoCD waits for hook Jobs to become either Healthy or Degraded before proceeding.

## Resource Requests and Limits

Always set resource requests and limits on hook Jobs to prevent them from consuming excessive cluster resources:

```yaml
containers:
  - name: hook
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

Without limits, a runaway hook could consume all available resources on a node, affecting other workloads.

## Security Considerations

### Pod Security

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: hook
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
```

### Sensitive Data

Pass sensitive information through Secrets, not environment variable values in the Job spec:

```yaml
# Good - reference a Secret
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: db-creds
        key: url

# Bad - password in plain text in the Job manifest
env:
  - name: DATABASE_URL
    value: "postgres://admin:password123@db:5432/myapp"
```

## Summary

Kubernetes Jobs are the standard resource type for ArgoCD sync hooks. They provide completion tracking, built-in retries, timeouts, and clean separation of concerns. Configure them with appropriate `backoffLimit`, `activeDeadlineSeconds`, and `restartPolicy: Never`. Use init containers for multi-step workflows, and always set resource limits to prevent runaway hooks from impacting your cluster.

For using Pods directly as hooks (without a Job controller), see our guide on [how to use Pods as sync hooks in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-pods-as-sync-hooks/view).
