# Validation Summary: How to Configure Volume Snapshot Notifications and Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes VolumeSnapshot resources
- Kubernetes RBAC, ServiceAccount, Job, CronJob, Deployment, Service, and ConfigMap manifests
- Prometheus metrics and alerting rules
- Prometheus Python client
- Kubernetes Python client
- Grafana dashboards
- Slack incoming webhooks
- Shell scripting, kubectl, jq, curl, and mailx

## Sources Consulted
- Kubernetes CSI Volume Snapshot API: https://kubernetes-csi.github.io/docs/api/volume-snapshot.html
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes CronJob concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Python client repository and generated client docs pointer: https://github.com/kubernetes-client/python
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/3.9/querying/functions/
- Grafana Stat visualization documentation: https://grafana.com/docs/grafana/latest/reference/singlestat/
- Grafana Time series visualization documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/time-series/
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks

## Issues Found
- The metrics exporter container used `python:3.11-slim` but the script called `kubectl`, which is not present in that image. Replaced the subprocess-based implementation with the Kubernetes Python client's `CustomObjectsApi` and in-cluster configuration.
- The exporter did not include RBAC permissions to list `volumesnapshots`. Added a `ServiceAccount`, `ClusterRole`, and `ClusterRoleBinding` for read access to `snapshot.storage.k8s.io` `volumesnapshots`.
- `kubernetes_volumesnapshot_failures_total` was defined as a counter but incremented on every scrape for existing failed snapshots, which would overcount failures. Replaced it with a gauge for current failed snapshots and updated the alert and dashboard expressions.
- Several Prometheus alerts referenced labels or metrics that the exporter did not emit, including `verified`, `schedule`, and `kubernetes_volumesnapshot_retention_days`. Updated the exporter to emit those labels and the retention metric.
- The exporter set snapshot age to `0` and parsed only integer `Gi` values. Updated it to compute age from `metadata.creationTimestamp` and parse common Kubernetes quantity suffixes.
- The high-storage alert claimed a 1 TB threshold but the expression checked roughly 1000 TiB. Corrected the expression and annotation to a 1 TiB threshold.
- The missing-scheduled-snapshot alert subtracted an age gauge from `time()`, which did not represent creation time. Rewrote it to alert when no daily snapshot series exists or the newest daily snapshot is older than 48 hours.
- The Slack, email, and webhook examples used `jq` and/or `kubectl` without installing them. Switched the job images to Alpine and installed the required packages in the commands.
- The notification examples referenced `snapshot-notifier` without defining permissions. Added a ServiceAccount and ClusterRoleBinding for the notifier and placed the related jobs in the `monitoring` namespace.
- The Grafana dashboard used the removed `singlestat` panel type, an invalid single-quoted PromQL selector, `rate()` on a gauge, and `histogram_quantile()` on a non-histogram gauge. Updated the panels to use `stat`/`timeseries` and valid expressions.
- The dashboard shell script parsed only `Gi` restore sizes and failed for other valid Kubernetes quantity suffixes or missing values. Replaced the `jq` expression with suffix-aware conversion to GiB and quoted the numeric failure test.

## Review Notes
- The examples still assume the VolumeSnapshot CRDs and CSI snapshot controller are installed in the cluster; this is required for `kubectl get volumesnapshot` and the custom object API calls to work.
- I validated YAML and JSON parsing locally, compiled the embedded exporter Python with `ast.parse`, and tested the revised `jq` quantity conversion with sample data. Live Kubernetes, Prometheus, Grafana, Slack, and SMTP delivery were not exercised in this repository environment.
