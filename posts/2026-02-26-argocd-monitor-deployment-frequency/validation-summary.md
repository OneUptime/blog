# Validation Summary: How to Monitor ArgoCD Deployment Frequency

## Status
validated

## Post Type
Tutorial / Monitoring guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Argo CD CLI
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana dashboards
- Python HTTP exporter
- Kubernetes YAML manifests
- DORA software delivery metrics

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications examples: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/examples/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- DORA software delivery performance metrics guide: https://dora.dev/guides/dora-metrics/
- DORA metrics history: https://dora.dev/insights/dora-metrics-history/
- 2019 Accelerate State of DevOps report: https://dora.dev/research/2019/dora-report/2019-dora-accelerate-state-of-devops-report.pdf

## Issues Found
- The post described deployment frequency as one of "the four DORA metrics." Current DORA documentation describes a five-metric software delivery performance model, so this was changed to "one of DORA's software delivery performance metrics."
- The `argocd_app_sync_total` label notes omitted valid `phase` values. Argo CD documents `Error`, `Failed`, `Running`, `Succeeded`, and `Terminating`, so the label comment was updated.
- The Argo CD Notifications example claimed to trigger only on non-self-heal syncs, but the `oncePer` field deduplicates by revision rather than directly identifying the trigger source. The wording was corrected to say it counts each successfully synced revision once, and the explanation now says it filters self-heal repeats for the same revision.
- The notification example was missing the Application subscription annotation required for the webhook integration to send notifications. Added a minimal Application annotation example using `notifications.argoproj.io/subscribe.on-deployed.deployment-counter`.
- The custom Python exporter accumulated counts in a global dictionary without clearing it on each scrape, causing every `/metrics` request to double-count previously seen history. Added `daily_deployments.clear()` at the start of `fetch_app_history()`.
- The Python exporter returned no HTTP response for paths other than `/metrics`. Added a 404 response for non-metrics paths.
- The DORA benchmark table listed "Low" as "Less than once per month." The cited 2019 DORA benchmark is "Between once per month and once every six months," so the table was corrected and the introduction changed to "According to DORA's 2019 research."

## Review Notes
The Argo CD CLI was not installed locally, so CLI validation was performed against the official Argo CD command reference. The PromQL examples are syntactically valid for counters, but real DORA reporting should still filter to production applications or projects so staging/test syncs are not included.
