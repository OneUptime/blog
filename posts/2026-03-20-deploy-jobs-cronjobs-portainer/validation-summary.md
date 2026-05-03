# Validation Summary: How to Deploy Kubernetes Jobs and CronJobs with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Kubernetes UI)
- Kubernetes Jobs (batch/v1)
- Kubernetes CronJobs (batch/v1)
- kubectl CLI
- YAML manifests

## Sources Consulted
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes API reference (batch/v1): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#job-v1-batch and #cronjob-v1-batch
- kubectl create job reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-job-em-
- Portainer Kubernetes documentation: https://docs.portainer.io/user/kubernetes
- Cron schedule syntax (used by Kubernetes CronJob)

## Issues Found
No technical issues found.

- `apiVersion: batch/v1` is correct for both Job and CronJob (CronJob was promoted from `batch/v1beta1` to `batch/v1` in Kubernetes 1.21).
- Job spec fields (`completions`, `parallelism`, `backoffLimit`, `template`, `restartPolicy: OnFailure`) are valid; `OnFailure` and `Never` are the only allowed restartPolicy values for Jobs.
- The `secretKeyRef` env source structure is correct.
- CronJob spec fields (`schedule`, `concurrencyPolicy: Forbid`, `successfulJobsHistoryLimit`, `failedJobsHistoryLimit`, `jobTemplate`) are all valid; `Forbid`, `Allow`, and `Replace` are the valid `concurrencyPolicy` values.
- The cron expression `"0 2 * * *"` correctly represents 2 AM daily.
- `kubectl create job --from=cronjob/nightly-backup manual-backup-$(date +%Y%m%d)` is valid syntax — kubectl accepts flags before or after positional arguments, and `--from=cronjob/NAME` is the documented way to manually trigger a CronJob.
- The pitfalls section accurately describes `concurrencyPolicy: Forbid`, `startingDeadlineSeconds` behavior (skipping missed windows), and history limits.
- Resource requests format (`memory: "128Mi"`, `cpu: "250m"`) follows correct Kubernetes resource quantity syntax.

## Review Notes
- Portainer's UI labels (e.g., **Applications** → **Add application**, **Advanced mode**) match the current Portainer Kubernetes interface, though exact wording may shift between Portainer minor versions.
- The post uses `image: myorg/db-migrator:latest` and `myorg/backup-tool:latest` as placeholder images, which is appropriate for a tutorial. In production, pinning to immutable tags or digests is generally preferred over `:latest`, but this is a stylistic recommendation rather than a technical error.
- `startingDeadlineSeconds` is mentioned in the pitfalls list but not shown in the example CronJob manifest — readers wanting to apply it would need to consult the Kubernetes docs. Not an error, just a note.
