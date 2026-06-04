# Validation Summary: How to set up ArgoCD notification triggers for Slack and email alerts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes
- Slack notification service
- SMTP email notification service
- Argo CD Application annotations
- Argo CD notification triggers and templates
- Prometheus metrics for Argo CD Notifications

## Sources Consulted
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD notification service overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Slack notification service: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/slack/
- Argo CD email notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/email/
- Argo CD webhook notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/triggers/
- Argo CD notification templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notification subscriptions: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/subscriptions/
- Argo CD notification monitoring: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/monitoring/
- Archived argoproj-labs/argocd-notifications repository: https://github.com/argoproj-labs/argocd-notifications
- Current Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Current Argo CD notifications catalog manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/notifications_catalog/install.yaml

## Issues Found
- The post used the archived `argoproj-labs/argocd-notifications` install URL and described notifications as a separate component. Updated the installation section to use the current Argo CD notifications catalog URL and clarified that the notifications controller is included with current Argo CD installations.
- The Slack example described `service.slack` as webhook-based and showed an unsupported `webhookUrl` field. Updated the text to use Slack bot-token configuration and noted that incoming webhooks should use Argo CD's webhook notification service.
- Several trigger predicates accessed `app.status.operationState.phase` without optional chaining. Updated those trigger conditions to use `app.status?.operationState.phase`, matching current Argo CD guidance for optional `operationState`.
- The deployed triggers could repeatedly fire for the same revision. Added `oncePer: app.status.sync.revision` to the Slack and email deployed triggers.
- The slow-sync trigger did not actually check elapsed time. Updated it to use Argo CD notification trigger time functions and fire only after a running operation has lasted at least 10 minutes.
- The multi-channel health-degraded annotations referenced a trigger name that was not defined in the post. Updated that example to subscribe to the defined `on-health-degraded-email` trigger.
- The testing JSON Patch example used `replace`, which fails when the annotation is absent. Changed it to `add`.
- The throttling section used an unsupported `throttle` trigger field. Reworked the section to describe documented `oncePer` deduplication instead.

## Review Notes
The post is now technically aligned with current Argo CD Notifications documentation. A future improvement would be to add a complete incoming-webhook Slack example using `service.webhook.<name>` and a webhook-specific template, but that is outside the current bot-token Slack path shown in the guide.
