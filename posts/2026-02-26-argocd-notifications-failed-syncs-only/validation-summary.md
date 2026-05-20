# Validation Summary: How to Configure ArgoCD Notifications for Failed Syncs Only

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps, Secrets, and Application resources
- Helm
- kubectl
- argocd CLI
- Slack notifications
- Microsoft Teams Workflows notifications
- SMTP email notifications
- Webhook notifications

## Sources Consulted
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD notification services overview: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/overview/
- Argo CD Slack notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notification templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Email notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/email/
- Argo CD Webhook notification service: https://argo-cd.readthedocs.io/en/release-2.5/operator-manual/notifications/services/webhook/
- Argo CD Teams Workflows notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams-workflows/
- Argo CD Teams Office 365 Connectors deprecation notice: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams/
- Argo CD official install manifest and notifications catalog in GitHub: https://github.com/argoproj/argo-cd
- Argo Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml

## Issues Found
- The install command was described as installing Argo CD Notifications itself, but the `notifications_catalog/install.yaml` manifest installs catalog triggers and templates. The post now says the controller is typically included with Helm or official install manifests, and that the command installs catalog triggers/templates. The command was also updated to use the official `--server-side --force-conflicts` flags shown in current Argo CD docs.
- Trigger expressions referenced `app.status.operationState` directly. Argo CD documentation recommends optional chaining because `operationState` can be absent. The failed-sync examples now use `app.status?.operationState`.
- The global subscription section conflated `defaultTriggers` with global subscriptions. The wording now distinguishes default trigger selection from the `subscriptions` field that applies globally.
- The Microsoft Teams example used `service.teams` with an Office 365 Connector webhook. Office 365 Connectors are retired as of March 31, 2026, so the example was updated to `service.teams-workflows`, a Power Automate webhook URL, and a `teams-workflows` template block.
- The prolonged OutOfSync example claimed to measure how long the app had been OutOfSync, but the expression used `operationState.finishedAt`, which is the last operation finish time. The comment was corrected, and the expression now checks that `finishedAt` exists before parsing it.

## Review Notes
- The examples target a single-source Argo CD Application by using `app.spec.source.repoURL`. Multi-source Applications should use `app.spec.sources` handling similar to the official notification catalog templates.
- The Slack, email, webhook, subscription annotation, and CLI examples are otherwise consistent with current official documentation.
