# Validation Summary: How to Implement Recreate Deployment Strategy for Breaking Schema Changes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes Recreate deployment strategy
- Kubernetes init containers
- Kubernetes CronJobs and Jobs
- kubectl rollout, set image, and create job commands
- PostgreSQL migrations
- Dockerfile HEALTHCHECK
- Prometheus and kube-state-metrics

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks
- Kubernetes readiness probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes command and argument environment expansion documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- kube-state-metrics Deployment metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- PostgreSQL ALTER TABLE documentation: https://www.postgresql.org/docs/current/sql-altertable.html

## Issues Found
- The SQL example used inline `ENUM('regular', 'premium')` syntax while the later migration examples use PostgreSQL tooling. Changed it to `VARCHAR(20) NOT NULL DEFAULT 'regular'`, which is valid in PostgreSQL and handles existing rows.
- The init-container migration sequence implied only the first new pod runs the migration before the remaining pods start. Kubernetes can create multiple replacement pods for the new ReplicaSet, so the post now states that each new pod runs its init container and migrations must be idempotent and safe under concurrent pod startup.
- The downtime measurement script counted running pods and reported total rollout duration as downtime. Updated it to measure the period where the Deployment has zero available replicas, including handling the omitted/empty `availableReplicas` field as zero.
- The maintenance-window health check could fail with an empty shell value when `.status.availableReplicas` was omitted. Added a default of `0`.
- The blue-green section overstated zero-downtime applicability for incompatible schema changes. Updated the wording to require isolated or duplicated backing data.
- The migration rollback Job used `$(DATABASE_URL)` without defining the environment variable. Added the missing `DATABASE_URL` secret reference.
- The rollback command referenced `--from=cronjob/migrate-down` without defining that CronJob. Added a suspended `migrate-down` CronJob template so the shown command is valid.

## Review Notes
The YAML snippets were syntax-checked with Python's YAML parser. `kubectl` is not installed in this environment, so command validation was done against the official Kubernetes kubectl reference.
