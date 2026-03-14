# How to Use CEL Expressions for Job Completion Health in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, CEL, Jobs, Health Checks, Kubernetes, GitOps, Batch Processing

Description: A practical guide to writing CEL health check expressions for Kubernetes Jobs and CronJobs in Flux CD to validate batch workload completion.

---

## Introduction

Kubernetes Jobs represent finite workloads that run to completion, such as database migrations, data processing tasks, and setup scripts. When deploying Jobs through Flux CD, you need health checks that wait for successful completion before proceeding. Flux has built-in health check support for Jobs through the `.spec.healthChecks` field and the `.spec.wait` option, which understand Job-specific semantics: a Job is healthy when it completes successfully.

## Prerequisites

- Flux CD installed on a Kubernetes cluster
- A Kubernetes cluster
- kubectl access to your cluster

## Understanding Job Status

A Kubernetes Job status has different fields than long-running workloads:

```yaml
# Example completed Job status
status:
  conditions:
    - type: Complete
      status: "True"
      lastTransitionTime: "2026-03-06T10:30:00Z"
  startTime: "2026-03-06T10:25:00Z"
  completionTime: "2026-03-06T10:30:00Z"
  succeeded: 1
  active: 0
  ready: 0
```

```yaml
# Example failed Job status
status:
  conditions:
    - type: Failed
      status: "True"
      reason: BackoffLimitExceeded
      message: "Job has reached the specified backoff limit"
  startTime: "2026-03-06T10:25:00Z"
  failed: 3
  active: 0
  ready: 0
```

Flux uses the built-in kstatus library to assess Job health. A Job is considered healthy when the Complete condition is True, and unhealthy when the Failed condition is True.

## Basic Job Health Checks

### Simple Completion Check

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: db-migration
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./migrations
  prune: true
  timeout: 15m
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: db-migrate
      namespace: default
```

### Wait for All Resources Including Jobs

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: db-migration
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./migrations
  prune: true
  timeout: 15m
  # Automatically health-check all applied resources
  wait: true
```

## Job Definitions for Common Use Cases

### Database Migration Job

```yaml
# migrations/db-migrate-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  namespace: default
  # Use annotations to force recreation on each deployment
  annotations:
    # Unique identifier tied to the migration version
    migration-version: "v2026030601"
spec:
  # Do not retry failed migrations automatically
  backoffLimit: 0
  # Clean up after 1 hour
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      containers:
        - name: migrate
          image: ghcr.io/myorg/db-migrate:v1.2.3
          command: ["./migrate", "up"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
      restartPolicy: Never
```

### Parallel Batch Processing Job

```yaml
# batch/data-processor.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processor
  namespace: batch
spec:
  # Process 10 items total
  completions: 10
  # Run 3 pods in parallel
  parallelism: 3
  # Retry each pod up to 2 times
  backoffLimit: 6
  ttlSecondsAfterFinished: 7200
  template:
    spec:
      containers:
        - name: processor
          image: ghcr.io/myorg/data-processor:v2.0.0
          command: ["./process"]
          env:
            - name: BATCH_SIZE
              value: "1000"
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
      restartPolicy: Never
```

The corresponding health check:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: batch-processing
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./batch
  prune: false
  timeout: 30m
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: data-processor
      namespace: batch
```

## Ordering Jobs with Flux Dependencies

### Migration Before Application Deployment

```yaml
# Step 1: Run database migration
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: db-migration
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./migrations
  prune: false
  timeout: 10m
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: db-migrate
      namespace: default
---
# Step 2: Deploy application after migration succeeds
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    # Wait for migration to complete
    - name: db-migration
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: default
```

### Sequential Job Pipeline

```yaml
# Step 1: Schema migration
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: schema-migration
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./jobs/schema-migration
  prune: false
  timeout: 10m
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: schema-migrate
      namespace: default
---
# Step 2: Data migration (depends on schema being ready)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: data-migration
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: schema-migration
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./jobs/data-migration
  prune: false
  timeout: 30m
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: data-migrate
      namespace: default
---
# Step 3: Seed data (depends on data migration)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: seed-data
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: data-migration
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./jobs/seed-data
  prune: false
  timeout: 10m
  healthChecks:
    - apiVersion: batch/v1
      kind: Job
      name: seed-data
      namespace: default
```

## Handling Job Idempotency

Jobs are immutable once created. To re-run a Job, you need to delete and recreate it. Use these strategies with Flux:

### Using Unique Job Names

```yaml
# migrations/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - job.yaml
# Append a hash suffix to make the Job name unique
nameSuffix: "-v3"
```

### Pre-Delete Hook Pattern

Use a pre-apply script to delete the old Job:

```yaml
# migrations/cleanup-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cleanup-old-migration
  namespace: default
  annotations:
    # Run before the main migration
    kustomize.toolkit.fluxcd.io/prune: "disabled"
spec:
  backoffLimit: 1
  ttlSecondsAfterFinished: 300
  template:
    spec:
      serviceAccountName: job-manager
      containers:
        - name: cleanup
          image: bitnami/kubectl:latest
          command:
            - /bin/sh
            - -c
            - |
              # Delete the previous migration job if it exists
              kubectl delete job db-migrate -n default \
                --ignore-not-found=true
              echo "Cleanup complete"
      restartPolicy: Never
```

## Monitoring Job Health Check Failures

```yaml
# clusters/my-cluster/job-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: job-failure-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: db-migration
      namespace: flux-system
    - kind: Kustomization
      name: data-migration
      namespace: flux-system
  summary: "Job health check failed - migration may have failed"
```

## Debugging Job Health Checks

```bash
# Check Job status
kubectl get job db-migrate -n default -o yaml | grep -A 15 "status:"

# View Job pod logs
kubectl logs job/db-migrate -n default

# Check Flux Kustomization health check status
kubectl get kustomization db-migration -n flux-system \
  -o jsonpath='{.status.conditions[*].message}'

# List all Jobs and their completion status
kubectl get jobs -A -o custom-columns=\
  'NAMESPACE:.metadata.namespace,NAME:.metadata.name,COMPLETIONS:.status.succeeded,FAILED:.status.failed'
```

## Best Practices

### Set backoffLimit Appropriately

For idempotent Jobs like migrations, set `backoffLimit: 0` to fail fast. For batch processing, allow retries.

### Use ttlSecondsAfterFinished

Always set `ttlSecondsAfterFinished` to clean up completed Jobs automatically. This prevents accumulation of finished Job resources.

### Disable Pruning for Jobs

Set `prune: false` on Kustomizations that manage Jobs, or use the annotation `kustomize.toolkit.fluxcd.io/prune: disabled` on individual Jobs. This prevents Flux from deleting Jobs that may still be needed for log inspection.

### Set Timeouts Based on Job Duration

Your Kustomization timeout must be longer than the expected Job duration. If a migration typically takes 5 minutes, set the timeout to at least 10 minutes to account for variability.

### Use wait: true for Simple Cases

If your Kustomization only manages Jobs and you want all of them health-checked, use `wait: true` instead of listing each Job individually.

## Conclusion

Flux CD has built-in support for tracking Job completion as a health signal through the `.spec.healthChecks` field. By configuring Job health checks, you can build reliable deployment pipelines that gate application rollouts on successful migrations, data processing, and setup tasks. The combination of Flux dependencies and Job health checks gives you a powerful mechanism for orchestrating complex deployment sequences.
