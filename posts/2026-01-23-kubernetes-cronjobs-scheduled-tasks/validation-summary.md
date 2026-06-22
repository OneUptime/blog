# Validation Summary: How to Configure CronJobs for Scheduled Tasks in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CronJob
- Kubernetes Job
- kubectl
- YAML manifests
- Cron schedule syntax
- Container shell commands

## Sources Consulted
- Kubernetes CronJob concepts documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob API reference (`batch/v1`): https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes generated `kubectl create job` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/
- Kubernetes well-known labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes enhancement issue for CronJob time zone support lifecycle: https://github.com/kubernetes/enhancements/issues/3140

## Issues Found
- The certificate check example used `openssl` in an `alpine:3.18` container without installing it. Added `apk add --no-cache openssl` before the certificate check command so the example can run in that image.
- The command `kubectl get jobs -l job-name=daily-backup` was misleading. Kubernetes job-name labels identify a specific Job name, not the parent CronJob name, and the legacy `job-name` label is deprecated. Changed the example to `kubectl get jobs`.
- The manual-run example created a Job with a timestamped name but then checked `kubectl get jobs -l app=backup`, even though the earlier CronJob template did not define that label. Changed the example to store the generated Job name in `JOB_NAME` and check that exact Job.
- The pod log selectors used the deprecated `job-name` label. Updated them to use `batch.kubernetes.io/job-name`, the current Kubernetes label.
- The post stated timezone support was for Kubernetes 1.24+. Time zone support was alpha in 1.24 and is stable in 1.27, so the wording was changed to "stable timezone support (Kubernetes 1.27+)".

## Review Notes
The remaining CronJob fields and explanations are consistent with current Kubernetes documentation: `batch/v1`, `schedule`, `jobTemplate`, `concurrencyPolicy`, `startingDeadlineSeconds`, `successfulJobsHistoryLimit`, `failedJobsHistoryLimit`, `suspend`, and `timeZone` are valid. `kubectl` was not installed in the workspace, so CLI validation was performed against the official generated kubectl reference.
