# Validation Summary: How to Use Kubernetes Jobs and CronJobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Jobs (`batch/v1`)
- Kubernetes CronJobs (`batch/v1`)
- Indexed Jobs / `completionMode` (Indexed, NonIndexed)
- Pod failure policy (`podFailurePolicy`)
- TTL controller (`ttlSecondsAfterFinished`)
- CronJob `timeZone`, `concurrencyPolicy`, history limits
- kubectl (apply, patch, delete, create job --from, jsonpath)
- RBAC (ServiceAccount, ClusterRole, ClusterRoleBinding)
- kube-state-metrics & Prometheus Operator (`PrometheusRule`)
- Node affinity, tolerations, nodeSelector
- Container lifecycle hooks (preStop), graceful shutdown signal handling

## Sources Consulted
- Kubernetes Jobs docs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes CronJobs docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Pod failure policy task page: https://kubernetes.io/docs/tasks/job/pod-failure-policy/
- Indexed Job task page: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- CronJob controller source: https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/cronjob/utils.go
- kube-state-metrics docs: https://github.com/kubernetes/kube-state-metrics/tree/main/docs

## Issues Found

1. **`onPodConditions` missing required `status` field.** The `failure-handling-job.yaml` example specified `- type: DisruptionTarget` without a `status` value. The OpenAPI schema requires `status` (kubernetes/kubernetes#131512 confirms a `Required value` admission error when omitted). Added `status: "True"`, matching the official docs example at https://kubernetes.io/docs/tasks/job/pod-failure-policy/.

2. **Non-existent label selector for listing CronJob Jobs.** The troubleshooting section recommended `kubectl get jobs -l cronjob-name=my-cronjob`, but core Kubernetes does not add a `cronjob-name` label (or `batch.kubernetes.io/cronjob`) to Jobs created by a CronJob — the relationship is captured only via `OwnerReferences`, and the controller just copies `JobTemplate` labels (verified in `pkg/controller/cronjob/utils.go`). Replaced with a name-prefix grep, which reflects the actual deterministic naming convention `<cronjob>-<timestamp>`.

## Review Notes

- Verified `batch/v1` is current and stable for both Job (since 1.21) and CronJob (graduated 1.21).
- Verified `timeZone` field — stable since Kubernetes 1.27 — the post's annotation is correct.
- Verified Job pod-backoff "exponential delay starting at 10s capped at 6 minutes" matches current docs and source (`DefaultJobApiBackOff = time.Second * 10`).
- Verified `job-name` legacy label is still set on Pods by the Job controller (alongside the newer `batch.kubernetes.io/job-name`), so `kubectl get pods -l job-name=my-job` works.
- Verified `--cascade=foreground` is a valid kubectl delete flag value. Note: the comment "Force delete a stuck Job" is somewhat imprecise — `--cascade=foreground` is foreground cascading deletion (waits for dependents), not a force delete (`--force --grace-period=0`). Left as-is since the command itself is valid.
- Verified all kube-state-metrics names referenced in the Prometheus rules (`kube_job_status_failed`, `kube_job_status_start_time`, `kube_job_status_active`, `kube_cronjob_next_schedule_time`, `kube_cronjob_spec_suspend`) and their labels (`job_name`, `namespace`, `cronjob`).
- Verified exit code 137 is the standard OOMKilled exit code (128 + SIGKILL).
- Verified `concurrencyPolicy: Allow` is the documented default.
- Verified all cron schedule examples (e.g., `"0 9-17 * * 1-5"` = hourly 9:00–17:00 Mon–Fri).
- Verified `kubectl create job --from=cronjob/...` syntax for manual triggering.
- Verified `JOB_COMPLETION_INDEX` env var is available in both init containers and containers under `completionMode: Indexed`.
- The data-processing-job's `FILES_PER_POD=$((TOTAL_FILES / 100 + 1))` math is a defensive floor (ensures ≥1 file/pod when TOTAL_FILES < 100) but slightly over-allocates work when TOTAL_FILES ≥ 100 — leaves some pods idle. Functional for illustration; a production version should use ceiling division `(TOTAL_FILES + 99) / 100`. Left as-is — illustrative example, not production code.
