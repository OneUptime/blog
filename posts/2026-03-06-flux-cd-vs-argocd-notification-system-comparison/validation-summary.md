# Validation Summary: Flux CD vs ArgoCD: Notification System Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Flux CD notification-controller
- Flux CD Alert, Provider, and Receiver CRDs
- Argo CD Notifications
- Kubernetes ConfigMaps, Secrets, and Application resources
- Slack, Microsoft Teams Workflows, PagerDuty, webhooks, and Git provider webhooks

## Sources Consulted
- Flux CD Notification Controller overview: https://fluxcd.io/flux/components/notification/
- Flux CD Alert API and examples: https://fluxcd.io/flux/components/notification/alerts/
- Flux CD Provider API and supported providers: https://fluxcd.io/flux/components/notification/providers/
- Flux CD Receiver API and supported webhook senders: https://fluxcd.io/flux/components/notification/receivers/
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD Notifications subscriptions: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/subscriptions/
- Argo CD Notifications trigger conditions and templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications services: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/
- Argo CD Teams Workflows service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams-workflows/

## Issues Found
- Flux Alert and Provider examples used `notification.toolkit.fluxcd.io/v1`, but the current documented API version for Alert and Provider is `v1beta3`. Updated those examples to `notification.toolkit.fluxcd.io/v1beta3`.
- The Flux Alert example described `eventMetadata` as event filtering and used the deprecated `spec.summary` field. Updated the comment and moved `summary` under `eventMetadata`.
- The Flux PagerDuty Provider example used a secret reference and channel name instead of the documented PagerDuty Events API address and routing key. Updated it to use `address: https://events.pagerduty.com` and `channel: <pagerduty-routing-key>`.
- The Argo CD notification example subscribed to `app-sync-failed` without defining the template. Added a minimal `template.app-sync-failed`.
- Argo CD trigger conditions accessed `app.status.operationState.phase` directly. Updated the conditions to use optional chaining for the optional `operationState` field.
- The Argo CD inbound webhook configuration showed webhook shared secrets in `argocd-cm`. Updated the example to use the `argocd-secret` Secret, which is where Argo CD documents webhook secrets.
- The feature comparison listed several notification providers incorrectly. Updated Discord, GitLab, Grafana, AWS SNS, Rocket.Chat, Matrix, and inbound webhook support to match current official documentation.
- The Argo CD Teams example used the legacy Teams service and Outlook webhook URLs. Updated it to the documented Teams Workflows service and secret-backed workflow URLs.
- The Flux Teams example referenced a secret without showing the required webhook address. Added the matching Secret example.
- The selection guidance claimed Flux has built-in AWS SNS support. Updated it to cite Azure Event Hub and Google Pub/Sub instead.

## Review Notes
- Flux Receiver examples still use `notification.toolkit.fluxcd.io/v1`, which matches the current documented Receiver API version.
- Slack incoming webhooks remain plausible for Flux examples, while Argo CD Slack examples use the documented bot-token style service configuration.
- The comparison intentionally stays high-level; exact provider behavior can vary by controller version and by provider-specific webhook capabilities.
