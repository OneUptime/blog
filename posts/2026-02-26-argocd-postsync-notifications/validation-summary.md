# Validation Summary: How to Send Notifications as PostSync Hooks in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource hooks and PostSync hooks
- Kubernetes Jobs
- Slack incoming webhooks and Block Kit payloads
- Microsoft Teams incoming webhooks / actionable message cards
- PagerDuty Events API v2 change events
- Discord webhooks
- HTTP webhook notification patterns

## Sources Consulted
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Notifications documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Slack Incoming Webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks
- Microsoft Teams Incoming Webhook documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- PagerDuty Recent Changes / Change Events documentation: https://support.pagerduty.com/main/docs/recent-changes
- Discord Webhook Resource documentation: https://docs.discord.com/developers/resources/webhook

## Issues Found
- The post described PostSync hooks as running after resources are successfully deployed. Argo CD's documentation is more specific: PostSync runs after successful application and once resources are Healthy. Updated the introduction and summary to say resources are deployed and healthy.

## Review Notes
- All YAML snippets parse successfully.
- The Kubernetes Job examples use valid `batch/v1` structure, `restartPolicy: Never`, and `backoffLimit`.
- The Argo CD hook annotations and delete policies are valid. `BeforeHookCreation` leaves the latest successful named hook until the next hook creation; use `HookSucceeded` as well if immediate cleanup after success is desired.
- The Teams example uses the actionable MessageCard format, which Microsoft still documents for Incoming Webhooks. For new Teams webhook workflows, Adaptive Cards may be preferable depending on how the webhook is created.
