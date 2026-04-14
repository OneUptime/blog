# Validation Summary: How to Use Dapr with Kubernetes Jobs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar model, state store API, pub/sub API, shutdown API)
- Kubernetes Jobs and CronJobs
- Python (with `requests` library)
- kubectl CLI

## Sources Consulted
- Dapr Docs — Running Dapr with a Kubernetes Job: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-job/
- Dapr Docs — Sidecar health and shutdown: https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/
- Dapr Docs — State management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Docs — Pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Docs — Kubernetes annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Kubernetes Docs — Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Docs — CronJob: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
1. **`backoffLimit` misplaced in the Job manifest**: The `backoffLimit: 2` field was indented inside `spec.template.spec` (the PodSpec), where it is not a valid field. `backoffLimit` is a property of `JobSpec` and must be at the same level as `ttlSecondsAfterFinished` and `template`. Moved it to the correct location under `spec`.

## Review Notes
- The post correctly identifies the core challenge: Dapr's sidecar runs indefinitely, preventing Job pods from completing. The recommended pattern of calling `POST /v1.0/shutdown` is the officially documented approach.
- Dapr v1.13+ introduced the `dapr.io/block-shutdown-duration` annotation for more graceful shutdown coordination, but the manual `/v1.0/shutdown` call remains required. The post's approach is compatible with all Dapr versions that support the shutdown endpoint.
- The Python code uses a `try/finally` block to ensure the sidecar shutdown is always attempted, which is good practice.
