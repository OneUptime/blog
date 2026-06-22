# Validation Summary: How to Run Batch Jobs and CronJobs in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Jobs
- Kubernetes CronJobs
- Kubernetes batch/v1 API
- kubectl
- PrometheusRule / PromQL
- kube-state-metrics
- Helm hooks
- YAML

## Sources Consulted
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes indexed Job task documentation: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes pod failure policy documentation: https://kubernetes.io/docs/tasks/job/pod-failure-policy/
- Kubernetes Pod API reference for command and args behavior: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl create job reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/
- Kubernetes TTL-after-finished documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- kube-state-metrics CronJob metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/cronjob-metrics.md
- kube-state-metrics Job metrics implementation/tests: https://github.com/kubernetes/kube-state-metrics/blob/main/internal/store/job_test.go
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/

## Issues Found
- The "Job with Multiple Completions" example used `JOB_COMPLETION_INDEX` without `completionMode: Indexed`. Non-indexed Jobs do not provide the indexed completion annotation/environment variable, so the example would not work as written. Changed the command to a generic queue-processing command.
- The "Indexed Job" heading called the pattern a work queue. Kubernetes documents indexed Jobs as static work assignment; work queue Jobs are a different pattern. Updated the heading to "Static Work Assignment."
- The data extraction command used `$(date +%Y-%m-%d)` in a Kubernetes command array. Kubernetes command arrays are not executed in a shell, so shell command substitution would not run. Changed it to execute through `/bin/sh -c`.
- The completed-job cleanup command used `status.successful=1`, which only matches Jobs with exactly one successful completion and misses completed Jobs with higher completion counts. Replaced it with a JSON/JQ filter for the `Complete=True` condition.
- The failed-job cleanup command used `status.successful=0`, which can also match active Jobs that have not succeeded yet. Replaced it with a JSON/JQ filter for `.status.failed > 0`.
- The CronJob alert referenced `kube_cronjob_spec_schedule_delay_seconds`, which is not a documented kube-state-metrics CronJob metric. Replaced it with `kube_cronjob_next_schedule_time` and `kube_cronjob_spec_suspend`.
- The cleanup best-practices snippet placed Job-only and CronJob-only fields together at the same `spec` level. Changed it to a valid CronJob shape with `successfulJobsHistoryLimit` and `failedJobsHistoryLimit` at CronJob spec level and `ttlSecondsAfterFinished` inside `jobTemplate.spec`.

## Review Notes
- The `kubectl` binary is not installed in this environment, so CLI verification used the official Kubernetes kubectl reference instead of local `--help` output.
- Local Ruby/YAML tooling was not installed, so a full YAML parser check could not be run locally. The changed YAML snippets were reviewed against the Kubernetes API references and preserved valid YAML structure.
- The examples use placeholder images such as `myapp/worker:latest`; these are structurally valid Kubernetes manifests but require real images and application commands to run in a cluster.
