# Validation Summary: How to Handle Notification Rate Limiting in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps, AppProjects, and Deployments
- kubectl
- Slack API and incoming webhooks
- PagerDuty Events API
- Gmail / SMTP sending limits
- Microsoft Teams connectors and Teams Workflows
- NGINX rate limiting
- Prometheus metrics and alert rules

## Sources Consulted
- Argo CD Notifications trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications subscription documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Notifications monitoring documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/monitoring/
- Argo CD FAQ for repository polling and `timeout.reconciliation`: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Argo CD Notifications service overview and Teams deprecation note: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Teams service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams/
- Argo CD Teams Workflows service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams-workflows/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Slack rate limit documentation: https://api.slack.com/apis/rate-limits
- Microsoft Teams connector rate limit documentation: https://learn.microsoft.com/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using
- PagerDuty service settings documentation for event throughput: https://support.pagerduty.com/main/docs/configurable-service-settings
- Google Gmail sending limits documentation: https://support.google.com/mail/answer/22839
- Google Workspace Gmail sending limits documentation: https://support.google.com/a/answer/166852

## Issues Found
- The post described Argo CD reconciliation as a fixed 180-second / 3-minute interval. Argo CD currently documents the default repository polling interval as `120s` plus up to `60s` of jitter. Updated the explanation and command comment accordingly.
- The Slack rate-limit bullet stated a flat "50 messages per minute for web API." Slack documents Web API limits as tiered per method, per app, per workspace, with posted messages generally limited to one message per second per channel. Updated the wording.
- The Microsoft Teams bullet presented connector limits without noting that Office 365 Connectors are deprecated/retired and Teams Workflows are the current replacement. Updated the wording to distinguish legacy connector throttles from current Teams Workflows guidance.
- The Kubernetes `apps/v1` Deployment example for the rate-limited proxy omitted the required `spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels`.

## Review Notes
- Argo CD's current notification webhook service supports configurable retries for network errors and `5xx` responses. The post's advice to use an intermediate aggregator or rate-limiting proxy remains appropriate for external service throttling and batching.
- The post's `argocd_notifications_deliveries_total` metric name matches the current Argo CD Notifications monitoring documentation.
- The final OneUptime links point to plausible related local blog posts.
