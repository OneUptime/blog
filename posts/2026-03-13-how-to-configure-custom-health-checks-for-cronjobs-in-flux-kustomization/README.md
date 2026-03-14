# How to Configure Custom Health Checks for CronJobs in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Health Check, CronJobs, Kustomization

Description: Learn how to configure custom health checks for CronJob resources in Flux Kustomization to ensure scheduled workloads are properly deployed.

---

## Introduction

CronJobs in Kubernetes schedule Jobs to run at specific intervals, handling recurring tasks like backups, report generation, log cleanup, and periodic data synchronization. While CronJobs themselves do not run continuously like Deployments, health checking them in Flux ensures that the CronJob resource is properly created and configured. This guide explains how to set up health checks for CronJobs in Flux Kustomization and covers the nuances of monitoring scheduled workloads.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- Familiarity with Kubernetes CronJob and Job resources

## How CronJob Health Checking Differs

CronJobs behave differently from other workloads when it comes to health checking. A CronJob is a template for creating Jobs on a schedule. The CronJob itself does not run pods directly. Flux considers a CronJob healthy once the resource is successfully created and accepted by the API server. Unlike Deployments or StatefulSets, there is no ongoing readiness state to monitor since the CronJob only spawns Jobs at scheduled intervals.

This means health checks for CronJobs primarily verify that the resource is correctly defined and applied, rather than checking for running pods.

## Basic CronJob Health Check

Set up a health check for a CronJob in your Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: scheduled-tasks
  namespace: flux-system
spec:
  interval: 10m
  path: ./jobs/scheduled
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: batch/v1
      kind: CronJob
      name: database-backup
      namespace: production
```

The corresponding CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: production
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 3600
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: myregistry/db-backup:v1.5
              command: ["./backup.sh"]
              env:
                - name: DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: database-credentials
                      key: url
                - name: S3_BUCKET
                  value: "my-backups"
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
          volumes:
            - name: backup-storage
              emptyDir: {}
```

## Health Checking Multiple CronJobs

When deploying several scheduled tasks together, list them all in the health checks:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: scheduled-tasks
  namespace: flux-system
spec:
  interval: 10m
  path: ./jobs/scheduled
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: batch/v1
      kind: CronJob
      name: database-backup
      namespace: production
    - apiVersion: batch/v1
      kind: CronJob
      name: log-cleanup
      namespace: production
    - apiVersion: batch/v1
      kind: CronJob
      name: report-generator
      namespace: production
    - apiVersion: batch/v1
      kind: CronJob
      name: certificate-renewal-check
      namespace: production
```

## Using wait: true for CronJob Kustomizations

For a Kustomization that only contains CronJobs and their supporting resources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cron-tasks
  namespace: flux-system
spec:
  interval: 10m
  path: ./jobs/cron
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

This verifies all resources in the path are successfully applied.

## Combining CronJobs with Other Resources

CronJobs often depend on other resources like ConfigMaps, Secrets, ServiceAccounts, and RBAC rules. Health check the CronJob alongside these dependencies:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backup-system
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/backup
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

The backup directory might contain:

```yaml
# service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backup-sa
  namespace: production
---
# rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backup-role
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backup-rolebinding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: backup-sa
roleRef:
  kind: Role
  name: backup-role
  apiGroup: rbac.authorization.k8s.io
---
# cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: production
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-sa
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: myregistry/db-backup:v1.5
              command: ["./backup.sh"]
```

With `wait: true`, Flux verifies the ServiceAccount, Role, RoleBinding, and CronJob are all applied successfully.

## CronJobs with Dependencies

Ensure infrastructure is in place before deploying CronJobs that depend on it:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/database
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 15m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backup-cronjobs
  namespace: flux-system
spec:
  interval: 10m
  path: ./jobs/backups
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: database
  wait: true
  timeout: 5m
```

The backup CronJobs are only deployed after the database infrastructure is healthy.

## CronJob Configuration Patterns

Here are common CronJob configurations with health checking:

```yaml
# Log rotation - runs every 6 hours
apiVersion: batch/v1
kind: CronJob
metadata:
  name: log-rotation
  namespace: operations
spec:
  schedule: "0 */6 * * *"
  concurrencyPolicy: Replace
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: rotate
              image: myregistry/log-rotate:v1.0
              command: ["./rotate.sh", "--max-age", "7d"]
---
# Weekly report - runs Sunday at midnight
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-report
  namespace: operations
spec:
  schedule: "0 0 * * 0"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 3600
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: report
              image: myregistry/report-gen:v2.0
              command: ["./generate.sh", "--type", "weekly"]
```

## Debugging CronJob Health Check Failures

When a CronJob health check fails:

```bash
# Check Kustomization status
flux get kustomization scheduled-tasks

# Check CronJob status
kubectl get cronjob database-backup -n production

# Check recent Job runs
kubectl get jobs -n production -l job-name=database-backup

# Check for validation errors
kubectl describe cronjob database-backup -n production

# Check logs of the most recent Job
kubectl logs job/database-backup-28912345 -n production
```

CronJob health check failures in Flux typically occur because:

- The CronJob manifest has validation errors (invalid schedule format, missing required fields)
- Referenced Secrets, ConfigMaps, or ServiceAccounts do not exist
- RBAC permissions are insufficient for the CronJob's ServiceAccount
- The container image referenced in the CronJob template does not exist

## Monitoring CronJob Execution

While Flux health checks verify CronJob deployment, monitoring actual Job execution requires additional tooling. Consider setting up alerts for:

- Jobs that fail repeatedly
- Jobs that exceed their `activeDeadlineSeconds`
- Jobs that are not created on schedule (check `lastScheduleTime`)

```bash
# Check last schedule time
kubectl get cronjob database-backup -n production -o jsonpath='{.status.lastScheduleTime}'

# List recent jobs from the CronJob
kubectl get jobs -n production --sort-by=.metadata.creationTimestamp | grep database-backup
```

## Conclusion

Health checks for CronJobs in Flux Kustomization verify that your scheduled workloads are properly defined and deployed to the cluster. While CronJobs do not have a persistent running state like Deployments, health checking them ensures the resource is valid and all dependencies (RBAC, Secrets, ConfigMaps) are in place. Combined with Kustomization dependencies, you can ensure infrastructure is ready before scheduled tasks are deployed, creating a reliable GitOps pipeline for your recurring workloads.
