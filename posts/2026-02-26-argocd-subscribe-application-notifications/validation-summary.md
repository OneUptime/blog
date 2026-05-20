# Validation Summary: How to Subscribe to Specific Application Notifications in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes Application custom resources
- Kubernetes annotations
- kubectl
- Slack notifications
- Email notifications
- Webhook notifications
- Microsoft Teams Workflows

## Sources Consulted
- Argo CD notification subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notification service overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Slack notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD email notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/email/
- Argo CD webhook notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Teams Workflows notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams-workflows/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Linked OneUptime article: https://oneuptime.com/blog/post/2026-01-25-notifications-argocd/view

## Issues Found
- The trigger examples accessed `app.status.operationState.phase` directly. Argo CD's official trigger documentation recommends optional chaining because `operationState` can be absent. Updated those trigger predicates to use `app.status?.operationState.phase`.
- The annotation explanation described `<service-name>` as only the service type, but Argo CD subscriptions use the service name, which can be a custom service name. Updated the wording and examples to include custom names such as `deployment-tracker`.
- The audit webhook subscription examples used `notifications.argoproj.io/subscribe.<trigger>.webhook.audit-log`, but Argo CD webhook subscriptions use the custom webhook service name directly. Updated those annotations to `notifications.argoproj.io/subscribe.<trigger>.audit-log`.
- The multiple-trigger example said "Health events to PagerDuty" while the annotation used Slack. Updated the comment to match the Slack annotation.
- The introductory service list referred generically to Microsoft Teams. Updated it to Microsoft Teams Workflows, the current Argo CD-recommended Teams integration after Office 365 Connectors retirement.

## Review Notes
The notification subscription format, semicolon-separated recipients, Slack/email/webhook service configuration shapes, and `kubectl annotate` command syntax are consistent with official documentation. `kubectl` is not installed in this workspace, so the CLI syntax was verified against the official Kubernetes command reference instead of local `--help` output.
