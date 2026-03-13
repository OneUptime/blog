# How to Configure Custom Health Checks for Jobs in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Health Checks, Jobs, Kustomization

Description: Learn how to configure custom health checks for Job resources in Flux Kustomization to ensure batch workloads complete successfully before dependent resources deploy.

---

## Introduction

Kubernetes Jobs run tasks to completion, making them ideal for database migrations, data seeding, backup operations, and initialization tasks. In a GitOps workflow, you often need these Jobs to complete successfully before deploying the main application. Flux Kustomization health checks let you monitor Job completion and gate downstream deployments on their success, ensuring your deployment pipeline runs in the correct order.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- Understanding of Kubernetes Job resources

## How Flux Checks Job Health

Flux considers a Job healthy when it has completed successfully. Specifically, the Job must have a condition of type `Complete` with status `True`. If the Job fails (condition type `Failed` with status `True`), Flux marks the health check as failed. While the Job is still running, Flux continues to wait until the timeout expires.

## Basic Job Health Check

Here is a Kustomization that health checks a database migration Job:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: db-migration
  namespace: flux-system
spec:
  interval: 10m
  path: ./jobs/db-migration
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 15m
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: db-migrate
      namespace: production
```

The corresponding Job manifest:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  namespace: production
spec:
  backoffLimit: 3
  activeDeadlineSeconds: 600
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: migrate
          image: myregistry/db-migrate:v2.1.0
          command: ["./migrate", "up"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: url
```

Flux waits for this Job to complete before marking the Kustomization as healthy.

## Chaining Jobs Before Application Deployment

A common pattern is to run migrations before deploying the application that depends on the updated database schema:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: db-migration
  namespace: flux-system
spec:
  interval: 10m
  path: ./jobs/migration
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 15m
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: db-migrate
      namespace: production
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-server
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/api-server
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: db-migration
  wait: true
  timeout: 5m
```

The `api-server` Kustomization will not begin until the `db-migration` Job completes successfully.

## Multiple Initialization Jobs

When your application requires several initialization steps, list all Jobs in the health checks:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-init
  namespace: flux-system
spec:
  interval: 10m
  path: ./jobs/init
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 20m
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: db-migrate
      namespace: production
    - apiVersion: batch/v1
      kind: Job
      name: seed-data
      namespace: production
    - apiVersion: batch/v1
      kind: Job
      name: create-indices
      namespace: production
```

All three Jobs must complete successfully within the 20-minute timeout.

## Handling Job Immutability

Kubernetes Jobs are immutable once created. If you update a Job manifest in Git, Flux will attempt to apply the changes but Kubernetes will reject the update. To handle this, you have several options.

Use the `force` field to delete and recreate the Job:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: db-migration
  namespace: flux-system
spec:
  interval: 10m
  path: ./jobs/migration
  prune: true
  force: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 15m
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: db-migrate
      namespace: production
```

Alternatively, include the version or timestamp in the Job name so each update creates a new Job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-${MIGRATION_VERSION}
  namespace: production
spec:
  backoffLimit: 3
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: migrate
          image: myregistry/db-migrate:${MIGRATION_VERSION}
          command: ["./migrate", "up"]
```

Then update the health check reference to match:

```yaml
healthChecks:
  - apiVersion: batch/v1
    kind: Job
    name: db-migrate-${MIGRATION_VERSION}
    namespace: production
```

## Setting Job Timeouts

The Kustomization timeout should be longer than the Job's `activeDeadlineSeconds` to allow the Job to complete or fail before Flux gives up:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-import
  namespace: production
spec:
  backoffLimit: 2
  activeDeadlineSeconds: 900
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: import
          image: myregistry/data-import:v1.0
          command: ["./import", "--full"]
```

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: data-import
  namespace: flux-system
spec:
  interval: 10m
  path: ./jobs/data-import
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 20m
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: data-import
      namespace: production
```

The Job has a 15-minute deadline and the Kustomization has a 20-minute timeout, giving Flux enough room to observe the Job outcome.

## Using wait: true with Jobs

When your Kustomization only contains Job resources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: setup-jobs
  namespace: flux-system
spec:
  interval: 10m
  path: ./jobs/setup
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 15m
```

This checks all resources in the path, which for Jobs means waiting for them to complete.

## Debugging Job Health Check Failures

When a Job health check fails:

```bash
# Check Kustomization status
flux get kustomization db-migration

# Check Job status
kubectl get job db-migrate -n production

# Check Job conditions
kubectl describe job db-migrate -n production

# Check pod logs for the Job
kubectl logs job/db-migrate -n production

# Check for pod failures
kubectl get pods -n production -l job-name=db-migrate
```

Common reasons for Job health check failures include:

- The Job exceeded its `backoffLimit` due to application errors
- The Job exceeded its `activeDeadlineSeconds`
- Image pull failures
- Missing Secrets or ConfigMaps referenced by the Job
- Insufficient cluster resources to schedule the Job pod

## Conclusion

Custom health checks for Jobs in Flux Kustomization enable you to gate application deployments on the successful completion of initialization tasks like database migrations, data seeding, and index creation. By combining Job health checks with Kustomization dependencies, you build a deployment pipeline where each stage waits for its prerequisites to finish. Pay attention to timeouts, Job immutability, and naming strategies to keep your GitOps workflow running smoothly.
