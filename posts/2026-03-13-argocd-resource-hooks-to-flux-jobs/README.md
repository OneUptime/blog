# How to Map ArgoCD Resource Hooks to Flux Pre/Post Jobs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Resource Hooks, Migration, GitOps, Kubernetes, Jobs

Description: Learn how to replace ArgoCD resource hook annotations with Flux CD pre-sync and post-sync Job patterns for database migrations and deployment automation.

---

## Introduction

ArgoCD resource hooks enable running jobs before or after a sync operation using annotations like `argocd.argoproj.io/hook: PreSync` and `argocd.argoproj.io/hook: PostSync`. Common use cases include database migrations before deployment, smoke tests after deployment, and cleanup jobs. Flux CD does not have a native hook system, but the same patterns can be implemented using Kubernetes Jobs with `dependsOn` ordering between Kustomizations.

## Prerequisites

- ArgoCD Application with resource hooks to migrate
- Flux CD bootstrapped on the cluster
- Understanding of Flux Kustomization dependsOn

## Step 1: Common ArgoCD Hook Patterns

Database migration PreSync hook:

```yaml
# ArgoCD PreSync hook for database migration
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  namespace: myapp
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: your-org/myapp:1.2.0
          command: ["./manage.py", "migrate", "--noinput"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
```

PostSync smoke test hook:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  namespace: myapp
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: smoke
          image: curlimages/curl:8.5.0
          command:
            - sh
            - -c
            - curl -sf http://myapp.myapp.svc:8080/health || exit 1
```

## Step 2: Flux Pre-Deployment Job Pattern

In Flux, model the PreSync hook as a separate Kustomization that contains only the migration Job, run before the application Kustomization:

```yaml
# clusters/production/apps/db-migrate.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: db-migrate
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp/migrations
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: db-migrate
      namespace: myapp
  timeout: 10m
---
# Application Kustomization depends on migration completing
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp/app
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
  dependsOn:
    - name: db-migrate  # Migration must succeed before app deploys
```

## Step 3: Migration Job Manifest

```yaml
# apps/myapp/migrations/db-migrate-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  namespace: myapp
  labels:
    app: myapp
    component: migration
spec:
  ttlSecondsAfterFinished: 3600
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      initContainers:
        - name: wait-for-db
          image: busybox:1.36
          command:
            - sh
            - -c
            - |
              until nc -z db-service.myapp.svc.cluster.local 5432; do
                echo "Waiting for database..."
                sleep 5
              done
      containers:
        - name: migrate
          image: your-org/myapp:${IMAGE_TAG}
          command: ["./manage.py", "migrate", "--noinput"]
          envFrom:
            - secretRef:
                name: myapp-secrets
```

## Step 4: Post-Deployment Job Pattern

For PostSync equivalent, create a third Kustomization for post-deployment validation:

```yaml
# clusters/production/apps/myapp-smoke-test.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-smoke-test
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp/smoke-tests
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
  dependsOn:
    - name: myapp  # Run after application is deployed
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: myapp-smoke-test
      namespace: myapp
  timeout: 5m
```

## Step 5: Managing Job Idempotency

Since Flux reconciles on a schedule, Jobs must be idempotent or designed to be re-run safely. Use a versioned Job name to prevent re-running completed migrations:

```yaml
# apps/myapp/migrations/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - db-migrate-job.yaml
nameSuffix: "-v2-3-0"  # Change on each schema migration version
```

Or use a Job that checks if migration is needed:

```yaml
command:
  - /bin/sh
  - -c
  - |
    # Check if this migration has already run
    if ./manage.py migrate --check; then
      echo "Migrations already applied"
      exit 0
    fi
    ./manage.py migrate --noinput
```

## Step 6: Handling Sync Window (ArgoCD) vs Flux Suspend

ArgoCD sync windows block syncs during certain time periods. Flux achieves this by temporarily suspending Kustomizations:

```bash
# Suspend Flux during a maintenance window
flux suspend kustomization myapp -n flux-system
flux suspend kustomization db-migrate -n flux-system

# ... maintenance work ...

# Resume after maintenance
flux resume kustomization db-migrate -n flux-system
flux resume kustomization myapp -n flux-system
```

## Best Practices

- Design Jobs to be idempotent so that Flux's periodic reconciliation does not cause duplicate runs.
- Use `ttlSecondsAfterFinished` on Jobs so they clean up automatically and do not clutter the namespace.
- Set meaningful `timeout` values on migration Kustomizations; migrations can take longer than application deployments.
- Use `backoffLimit` on Jobs to allow retries for transient failures (network issues, database not ready).
- Test the Job Kustomization independently in staging before wiring it into the dependsOn chain.
- Add health checks on the Job (`healthChecks`) so that Flux waits for job completion (not just pod startup) before unblocking dependent Kustomizations.

## Conclusion

Flux CD's dependsOn ordering between Kustomizations provides a clean, GitOps-native replacement for ArgoCD resource hooks. The approach requires more Kustomization resources but is explicit, testable, and auditable. Each hook becomes a discrete Kustomization with its own reconciliation interval and health checks, making it easier to debug when pre-deploy migration jobs fail.
