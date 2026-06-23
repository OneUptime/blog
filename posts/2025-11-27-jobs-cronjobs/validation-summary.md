# Validation Summary: How to Run Kubernetes Jobs and CronJobs for One-Off or Scheduled Work

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Kubernetes Jobs (`batch/v1`)
- Kubernetes CronJobs (`batch/v1`)
- Indexed/parallel Jobs
- `kubectl` CLI
- TTL-after-finished controller

## Sources Consulted
- Kubernetes official docs — Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes official docs — CronJob: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes official docs — TTL Controller for finished resources: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes CronJob time zone support (GA in v1.27)

## Issues Found
- **Section 2 (Parallel Jobs) — `JOB_COMPLETION_INDEX` not exposed by default.** The post claimed "Each Pod gets a unique `JOB_COMPLETION_INDEX` env var" while only using `completions` and `parallelism`. Per the official docs, the completion index (and the `JOB_COMPLETION_INDEX` env var) is only provided when `completionMode: Indexed` is set; the default is `NonIndexed`, which does not expose any index. Fixed by adding `completionMode: Indexed` to the example manifest and clarifying that the index is not available in the default `NonIndexed` mode.

## Review Notes
- The pod selector `kubectl get pods -l job-name=migrate-payments` works because the legacy `job-name` label is still applied by the Job controller for backward compatibility. The current canonical label is `batch.kubernetes.io/job-name`; either selector is valid on modern clusters, so no change was made.
- Section 6 advises to "Enable the TTL Controller ... on the cluster so `ttlSecondsAfterFinished` works." The TTL-after-finished controller has been GA and enabled by default since Kubernetes 1.23, so on any supported cluster no manual enablement is required. The advice is harmless and the doc link is correct, so it was left as-is.
- `timeZone` field correctly noted as requiring Kubernetes 1.27+ (it reached GA in 1.27).
- `apiVersion: batch/v1` is correct for both Job and CronJob (CronJob graduated to `batch/v1` in 1.21).
- All `kubectl` commands, flags (`--previous`, `--from=cronjob/...`), and the `kubectl patch` suspend snippet are valid and current.
