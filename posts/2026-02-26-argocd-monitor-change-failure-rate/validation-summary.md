# Validation Summary: How to Monitor ArgoCD Change Failure Rate

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Prometheus and PromQL
- Kubernetes ConfigMaps
- Prometheus Operator PrometheusRule resources
- Python HTTP server
- DORA metrics

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD notification triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD webhook notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/subscriptions/
- Google Cloud Four Keys / DORA metrics article: https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance
- DORA 2023 Accelerate State of DevOps report: https://dora.dev/research/2023/dora-report/2023-dora-accelerate-state-of-devops-report.pdf

## Issues Found
- The Argo CD Notifications ConfigMap defined triggers and templates but did not subscribe the webhook recipient to those triggers. Added a `subscriptions` entry for `cfr-tracker`, matching the official global subscription format.
- The notification trigger accessed `app.status.operationState` directly. Current Argo CD examples use optional chaining for this optional field, so the trigger was updated to `app.status?.operationState.phase`.
- The failure notification used `{{now}}`, which is not the documented Argo CD Notifications time function syntax. Replaced it with the documented `.time.Now` helper and RFC3339 formatting.
- The degraded-health trigger could emit repeated failure events for the same revision. Added `oncePer: app.status.sync.revision` to keep the failure signal revision-scoped.
- The rollback section showed `argocd_app_sync_total{phase="Succeeded"}` as if it counted rollbacks. Argo CD exposes sync history counters but not a rollback-specific Prometheus metric, so the text and comments now state that rollbacks must be recorded separately.
- The DORA benchmark table contained duplicated High/Medium ranges and outdated range-style values. Updated it to the 2023 DORA report's published CFR reference values: Elite 5%, High 10%, Medium 15%, Low 64%.

## Review Notes
The Python sample is syntactically valid and suitable as a minimal illustrative tracker, but it stores state in memory. A production implementation should persist events and handle restarts, duplicate webhooks, and concurrent requests.
