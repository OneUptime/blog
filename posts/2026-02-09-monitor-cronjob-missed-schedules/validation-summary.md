# Validation Summary: How to Monitor CronJob Last Successful Run and Alert on Missed Schedules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CronJobs
- Kubernetes Jobs and Events
- kube-state-metrics
- Prometheus and PrometheusRule
- Grafana PromQL queries
- Python Kubernetes client
- Bash, kubectl, jq, curl
- Slack incoming webhooks

## Sources Consulted
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes CronJob concepts and limitations: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics CronJob metrics reference: https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/docs/metrics/workload/cronjob-metrics.md
- kube-state-metrics Job metrics reference: https://raw.githubusercontent.com/kubernetes/kube-state-metrics/main/docs/metrics/workload/job-metrics.md
- Prometheus Operator PrometheusRule CRD reference: https://doc.crds.dev/github.com/prometheus-operator/prometheus-operator/monitoring.coreos.com/PrometheusRule/v1
- Kubernetes Python client repository: https://github.com/kubernetes-client/python

## Issues Found
- The introduction said CronJob metrics are exposed through the metrics server. Changed this to kube-state-metrics because Kubernetes metrics-server serves resource metrics, while kube-state-metrics exposes object-state metrics such as CronJob status timestamps.
- Python snippets imported only `datetime` and `timedelta` but referenced `datetime.timezone.utc`, which would raise an `AttributeError`. Updated imports to include `timezone` and changed timezone usage accordingly.
- The custom CronJob monitor's simplified schedule parser treated `*/10 * * * *` as hourly. Added basic handling for common `*/N` minute and hour schedules and common macros while preserving the note that production code should use `croniter`.
- The Prometheus failed-job alert joined `kube_job_status_failed` and `kube_job_owner` without matching labels, so it would not reliably identify CronJob-owned Jobs or expose the CronJob owner label. Updated the expression to use `on(namespace, job_name) group_left(owner_name)` and `owner_is_controller="true"`.
- The events query filtered for `FailedScheduling`, which is a Pod scheduler event reason rather than the CronJob missed-start reason. Updated the filter to include CronJob-related reasons such as `FailedNeedsStart`, `MissSchedule`, and `TooManyMissedTimes`.
- The failed Job Python snippet used `status.completion_time` to date failed Jobs, but Kubernetes only sets Job `completionTime` after successful completion. Updated it to use the failed Job condition's `last_transition_time`.
- The dashboard query used `rate()` on `kube_cronjob_status_last_schedule_time`, a timestamp gauge. Replaced it with `changes()` to show schedule timestamp updates over the window.
- The failed-jobs dashboard query grouped by a non-existent `cronjob` label on Job metrics. Updated it to join with `kube_job_owner` and group by `owner_name`.
- The suspended CronJobs shell snippet interpolated multiline command output into JSON manually. Replaced it with `jq -n --arg` and quoted the webhook variable so the payload is valid JSON.

## Review Notes
The examples remain intentionally simplified. For production use, schedule parsing should use a real cron parser such as `croniter`, and alert windows should account for each CronJob's schedule, time zone, `startingDeadlineSeconds`, and `concurrencyPolicy`.
