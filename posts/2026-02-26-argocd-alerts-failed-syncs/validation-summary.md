# Validation Summary: How to Set Up Alerts for Failed ArgoCD Syncs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- Alertmanager and `amtool`
- PagerDuty and Slack Alertmanager receivers

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/notifications/subscriptions/
- Argo CD Slack notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager overview and silences documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Argo CD sync phases were missing the documented `Terminating` phase. Added it to the phase list.
- The repeated-failure PromQL expression did not aggregate `Failed` and `Error` phases per application, so an application with failures split across phases could be undercounted. Changed it to `sum by (name, namespace, project)(increase(...))`.
- The mass-failure PromQL expression counted matching time series rather than unique applications. Changed it to group by application labels before counting.
- The environment-specific examples filtered on `dest_namespace`, which is not a documented label for `argocd_app_sync_total`. Changed the examples to filter on the documented `project` label.
- Alertmanager routing used deprecated `match` and `match_re` fields. Updated the example to use current `matchers` syntax.
- The PagerDuty receiver used `service_key`, which is only for the older Prometheus integration type. Updated the example to use `routing_key` for PagerDuty Events API v2.
- The Argo CD notification trigger accessed `app.status.operationState` directly. Current Argo CD notification docs recommend optional chaining because `operationState` can be absent. Updated the trigger to `app.status?.operationState.phase`.
- The Argo CD notifications example configured the trigger, template, and Slack service but did not subscribe any recipient, so it would not send notifications by itself. Added a minimal global subscription for the `on-sync-failed` trigger.

## Review Notes
The Prometheus alert examples assume Argo CD application projects are named by environment. If a deployment uses another environment labeling scheme, the PromQL selectors should be adjusted to match labels that are actually exported by Argo CD metrics.
