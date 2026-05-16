# Validation Summary: How to Schedule Cron Jobs on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes CronJob (`batch/v1`)
- Kubernetes Job
- Kubernetes DaemonSet
- `talosctl` (etcd snapshot)
- `kubectl`
- PostgreSQL (`pg_dump`)
- OpenSSL (`s_client`, `x509`)
- Prometheus / kube-state-metrics (PrometheusRule CRD)
- Standard cron schedule syntax

## Sources Consulted
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob API reference (`batch/v1`): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#cronjob-v1-batch
- Kubernetes Job automatic labels: https://kubernetes.io/docs/concepts/workloads/controllers/job/#job-completion-mode (and surrounding sections on labels added by the controller)
- Talos Linux `talosctl etcd snapshot` documentation: https://www.talos.dev/latest/talos-guides/howto/disaster-recovery/
- `talosctl` CLI reference: https://www.talos.dev/latest/reference/cli/
- kube-state-metrics CronJob/Job metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/job-metrics.md
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.PrometheusRule
- Standard cron expression reference (Vixie cron / POSIX)

## Issues Found
- **Incorrect kubectl label selector for listing Jobs of a CronJob.** The original command `kubectl get jobs -n <namespace> -l job-name=<cronjob-name>` would not return the expected results. Jobs created by a CronJob are not automatically given a label whose value equals the parent CronJob's name. The `job-name` (and `batch.kubernetes.io/job-name`) label is applied to **Pods**, with the value being the Pod's owning **Job** name — not the CronJob's name. Replaced with `kubectl get jobs -n <namespace> | grep <cronjob-name>`, which works because the controller names CronJob-created Jobs using the pattern `<cronjob-name>-<suffix>`.

## Review Notes
- The post correctly notes that `batch/v1` is the stable API version for `CronJob` (GA since Kubernetes 1.21); `batch/v1beta1` was removed in 1.25.
- `concurrencyPolicy: Allow` is accurately described as the default.
- The default `successfulJobsHistoryLimit` (3) and `failedJobsHistoryLimit` (1) are correctly shown as configurable; the post does not claim these are non-defaults, so no change needed.
- The cron day-of-week field is described as `0 - 6, Sunday=0`. Vixie/POSIX cron actually accepts `0-7` with both `0` and `7` meaning Sunday, but `0-6` is what Kubernetes CronJob accepts and what the post is documenting, so this is correct in context.
- The `talosctl etcd snapshot --nodes 192.168.1.10 <local-path>` invocation is valid; `--nodes` (`-n`) is a global flag and the positional argument is the local snapshot path.
- The certificate-monitoring snippet uses `openssl s_client -connect ${host}:443` without `-servername ${host}`. This works but will fail to retrieve the correct certificate from SNI-multiplexed endpoints. Considered a best-practice improvement rather than a correctness bug; left unchanged to avoid scope creep.
- The Prometheus alert uses `kube_job_status_failed` with a `job_name` label, both of which are correct metric/label names from kube-state-metrics.
- The DaemonSet "sleep loop" pattern is acknowledged in the post as a workaround rather than a recommendation, which is appropriate. Note that `privileged: true` plus `hostPID/hostNetwork` is broad — readers should scope these down for production use, but the post is showing a general template.
- The post's framing — Talos has no host-level cron daemon and Kubernetes CronJobs are the recommended substitute — matches Talos Linux's design philosophy (minimal immutable OS, run everything as Kubernetes workloads).
