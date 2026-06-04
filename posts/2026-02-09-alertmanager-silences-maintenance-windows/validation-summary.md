# Validation Summary: How to Create Alertmanager Silences Programmatically During K8s Maintenance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Alertmanager
- amtool
- Alertmanager API v2
- Kubernetes CronJob
- kubectl drain/cordon/uncordon
- Prometheus / PromQL alerting rules
- GitLab CI/CD shell scripting

## Sources Consulted
- Prometheus Alertmanager documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager GitHub README and amtool examples: https://github.com/prometheus/alertmanager
- Alertmanager API v2 OpenAPI specification: https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
- Alertmanager silence metrics implementation: https://github.com/prometheus/alertmanager/blob/main/silence/silence.go
- Prometheus downloads / Alertmanager latest release information: https://prometheus.io/download/
- Kubernetes CronJob concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The examples used Alertmanager v0.26.0, which is no longer the current production release. Updated the install commands and CronJob image tag to v0.32.1.
- The node-drain script parsed `amtool silence add --output=json` with `jq -r '.silenceID'`, but amtool v0.26.0 and v0.32.1 print the silence UUID directly for `silence add`. Removed the JSON parsing and captured the command output directly.
- The "Extending Existing Silences" section said updating required deleting the old silence and creating a new one. Alertmanager API v2 supports updating a silence by posting a silence object with its `id`; updated the example to post the modified silence instead of expiring it first.
- The monitoring section referenced non-existent or incorrect metrics: `alertmanager_silences_active` and `alertmanager_silence_end_time`. Replaced them with the built-in `alertmanager_silences{state="active"}` gauge and a valid `changes(...)` example.
- The `TooManySilences` alert used `alertmanager_silences > 10`, which would evaluate all silence states. Narrowed it to active silences with `alertmanager_silences{state="active"} > 10`.
- The long-running silence alert used a non-existent per-silence end-time metric. Replaced it with an alert for active silences that remain present for 24 hours, which is supported by Alertmanager's built-in metrics.

## Review Notes
- The Alertmanager API v2 silence payload fields and `DELETE /api/v2/silence/{silenceID}` endpoint are correct.
- The Kubernetes CronJob manifest structure is valid for `batch/v1`.
- The `kubectl drain --ignore-daemonsets --delete-emptydir-data --force` flags are valid; `--force` should be used carefully because it can delete pods not managed by a controller.
