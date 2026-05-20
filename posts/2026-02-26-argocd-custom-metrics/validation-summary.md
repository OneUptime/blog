# Validation Summary: How to Create Custom ArgoCD Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Argo CD Notifications
- Argo CD resource health customizations
- Python HTTP exporter

## Sources Consulted
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/subscriptions/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The built-in metrics list referenced `argocd_app_reconcile_duration_seconds`, which is not the current Argo CD application controller metric family. Updated the list to use the documented `argocd_app_reconcile` histogram samples.
- The Git fetch error-rate recording rule used a `status="error"` label on `argocd_git_request_total`; the current Argo CD metrics documentation lists `argocd_git_fetch_fail_total` for Git fetch failures instead. Replaced the rule with a fetch-failures-per-hour recording rule using that documented metric.
- The built-in metrics example used PromQL-like label placeholders such as `{name, project}`. Replaced those with valid metric selectors and histogram sample names.
- The Python exporter used `argocd app list -o json` without API credentials. Updated the command to use `--core`, which the Argo CD CLI documents as direct Kubernetes access.
- The Python exporter classified only `spec.source`, missing current multi-source applications that use `spec.sources`. Updated it to inspect `spec.source` or the first item in `spec.sources`.
- Removed unused Python variables/imports from the exporter snippet that had no effect and could confuse readers.
- The Lua health customization used `string.format`, but Argo CD disables standard Lua libraries by default. Added `resource.customizations.useOpenLibs.apps_Deployment: "true"` for that customization.
- The resource customization section described health checks as metric sources. Reworded it to clarify that they feed built-in application health metrics rather than exposing standalone custom metrics.
- The notification webhook configuration defined a trigger and webhook service but did not subscribe applications to the trigger. Added a global `subscriptions` block for the `custom-metrics` webhook.

## Review Notes
The examples are intentionally minimal and would still need production hardening, such as exporter authentication/error handling, a dedicated least-privilege service account, and a Service or ServiceMonitor if the Prometheus setup does not honor pod scrape annotations.
