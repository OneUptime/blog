# Validation Summary: How to Use Jobs as Sync Hooks in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD sync hooks
- Kubernetes Jobs
- Kubernetes init containers
- Kubernetes Job retry, timeout, completion, and cleanup fields
- Kubernetes Pod security context and resource requests/limits

## Sources Consulted
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD / GitOps Engine Job health implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health_job.go
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes automatic cleanup for finished Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/

## Issues Found
- The parallel Job example used `JOB_COMPLETION_INDEX` but did not set `completionMode: Indexed`. Kubernetes only provides per-index completion behavior and the `JOB_COMPLETION_INDEX` value for Indexed Jobs, so I added `completionMode: Indexed`.
- The parallel Job example used `curl` against database and Redis ports that are not HTTP endpoints. I changed the example to HTTP health endpoints so the commands match the tool being used.
- The init container explanation said the Pod restarts when an init container fails. With `restartPolicy: Never`, the failed Pod is replaced by the Job controller, subject to `backoffLimit`, so I corrected that wording.
- The Argo CD Job health summary described health using `status.succeeded` and `status.failed >= backoffLimit`. Argo CD's built-in Job health check evaluates Job conditions, so I changed the summary to `Complete`, no terminal condition, and `Failed`.

## Review Notes
The remaining examples use current `batch/v1` Job fields and Argo CD hook annotations. The post correctly notes that Argo CD hook deletion policies are usually preferable to relying on `ttlSecondsAfterFinished` for tracked hook resources because TTL cleanup can otherwise make the application appear OutOfSync.
