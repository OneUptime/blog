# Validation Summary: How to Subscribe Applications to Notification Channels in ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Notifications
- Argo CD Application resources
- Kubernetes annotations
- kubectl
- Slack, email, PagerDuty, and webhook notification services

## Sources Consulted
- Argo CD Notification subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Notification triggers and defaultTriggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Triggers and Templates Catalog: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/catalog/
- Argo CD Notification services overview and custom service names: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Slack notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD Webhook notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD PagerDuty notification service: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/pagerduty/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found
- The post used empty string recipients for PagerDuty subscriptions. Argo CD's PagerDuty notification service expects a PagerDuty service ID as the subscription recipient, so the examples now use `"<pagerduty-service-id>"`.
- The webhook subscription example used `notifications.argoproj.io/subscribe.on-sync-failed.webhook.deployment-tracker`. Argo CD's webhook documentation uses the configured webhook service name directly in the subscription key, so the example now uses `notifications.argoproj.io/subscribe.on-sync-failed.deployment-tracker`.
- Several examples used `on-deploy-failed` and `on-health-healthy`, which are not in Argo CD's built-in notifications catalog. These were changed to built-in triggers such as `on-sync-failed`, `on-deployed`, and `on-health-degraded`.
- The default trigger explanation implied that `defaultTriggers` automatically subscribes all applications. Argo CD applies `defaultTriggers` when a subscription annotation omits the trigger name, so the wording was corrected.

## Review Notes
The post assumes the referenced triggers and services are present in `argocd-notifications-cm`, which is consistent with the troubleshooting section. `kubectl` was not installed in the local workspace, so CLI syntax was verified against the official Kubernetes command reference instead of local `kubectl --help` output.
