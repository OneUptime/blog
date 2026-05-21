# Validation Summary: How to Monitor ArgoCD Mean Time to Recovery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana
- Python Flask
- Prometheus Python client
- DORA software delivery metrics

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/release-2.5/operator-manual/notifications/services/webhook/
- Argo CD notification subscription documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/subscriptions/
- Argo CD notification trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD rollback command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rule documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus histogram guidance: https://prometheus.io/docs/practices/histograms/
- Prometheus Python client histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/
- DORA metrics guide: https://dora.dev/guides/dora-metrics/
- DORA metrics history: https://dora.dev/insights/dora-metrics-history/
- DORA research questions for restore-time ranges: https://dora.dev/research/2025/questions/

## Issues Found
- The post described MTTR as one of the four current DORA metrics. Updated the wording to clarify that MTTR was historically one of the four metrics and that current DORA guidance uses the deployment-specific Failed Deployment Recovery Time metric.
- The sync-failure PromQL example used the raw `argocd_app_sync_total` counter as an event. Changed it to `increase(argocd_app_sync_total{phase="Failed"}[5m]) > 0` so it detects recent failed syncs.
- The Argo CD Notifications webhook example omitted the required `service.webhook.mttr-tracker` registration. Added the webhook service, JSON content type header, and changed the templates to use `path: /events` with the registered service URL.
- The Prometheus recording-rule section claimed Prometheus recording rules could calculate MTTR directly from Argo CD state gauges. Revised it to explain that Prometheus can track current failure and recovery states, while pairing failure and recovery events requires an event tracker, incident system, or durable store.
- Several Grafana MTTR queries averaged `argocd_current_mttr_seconds`, which only stores the last observed recovery time per app. Replaced them with histogram `_sum` and `_count` calculations over 7-day and 30-day windows.
- The recovery-rate query did not return a percentage and used `rate()` over a long 30-day range. Updated it to use `increase()` over the 30-day window and multiply by 100.
- The MTTR trend alert used the last-recovery gauge as a trend source. Updated it to compare 7-day and 30-day histogram averages per application.
- The DORA benchmark table used outdated performance-level labels. Reworded it as DORA-style response ranges and updated the surrounding text to avoid obsolete "Elite/High" labels.

## Review Notes
The example Flask service is suitable as a lightweight demonstration, but a production implementation should persist active failures outside process memory and validate incoming webhook payloads. The phase-breakdown rules reference custom timestamp metrics that an organization would need to emit from alerting, incident, CI, or deployment systems.
