# Validation Summary: How to Deploy CronJobs with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CronJobs and Jobs
- Flux CD Kustomization and Notification Controller Alerts
- Kustomize overlays and JSON patches
- Prometheus Operator PrometheusRule resources
- kube-state-metrics metrics
- Shell scripting in Kubernetes containers

## Sources Consulted
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes TTL-after-finished Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- kube-state-metrics CronJob metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/cronjob-metrics.md
- kube-state-metrics Job metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/job-metrics.md
- RFC 6902 JSON Patch: https://www.rfc-editor.org/rfc/rfc6902

## Issues Found
- The prerequisites listed Kubernetes v1.26+, but the examples use `spec.timeZone`, which is stable for CronJobs starting in Kubernetes v1.27. Changed the prerequisite to v1.27+.
- The shell examples used `grep -P`, which is not portable to common minimal container images such as Alpine/BusyBox-based images. Changed the date extraction commands to use `grep -Eo`.
- The staging Kustomize patch used JSON Patch `replace` to set `/spec/suspend`, but that field is absent from the base CronJob. Changed the operation to `add`, because JSON Patch `replace` requires the target location to exist.
- The `CronJobFailed` alert matched all failed Jobs instead of only Jobs owned by CronJobs. Updated the PromQL to join `kube_job_status_failed` with `kube_job_owner{owner_kind="CronJob"}`.
- The `CronJobNotScheduled` alert used `kube_cronjob_spec_period`, which is not exposed by kube-state-metrics. Replaced it with an expression based on `kube_cronjob_next_schedule_time` and excluded suspended CronJobs.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1`, while the current documented Flux Alert API is `notification.toolkit.fluxcd.io/v1beta3`. Updated the API version.
- The Flux Alert example used deprecated `spec.summary`. Changed it to `spec.eventMetadata.summary`.

## Review Notes
The examples assume supporting objects such as Secrets, Providers, container images, database services, Elasticsearch, and S3 credentials already exist. That is acceptable for a deployment-pattern guide, but a production implementation should also define or reference those dependencies explicitly.
