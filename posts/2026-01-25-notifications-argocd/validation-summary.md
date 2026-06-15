# Validation Summary: How to Configure Notifications in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps, Secrets, Applications, and AppProjects
- Slack notifications
- Microsoft Teams Workflows notifications
- SMTP email notifications
- Webhook notifications
- PagerDuty Events API v2 notifications
- Argo CD CLI notification troubleshooting commands

## Sources Consulted
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD v2.2 to v2.3 upgrade notes: https://argo-cd.readthedocs.io/en/latest/operator-manual/upgrading/2.2-2.3/
- Argo CD notification services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification templates and functions: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Slack notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD Teams Workflows notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams-workflows/
- Argo CD Teams Office 365 Connectors deprecation notice: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams/
- Argo CD Webhook notification service: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/webhook/
- Argo CD PagerDuty V2 notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/pagerduty_v2/
- Argo CD notification subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notification troubleshooting commands: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/troubleshooting-commands/

## Issues Found
- The Microsoft Teams example used the legacy `service.teams` Office 365 Connector path and `outlook.office.com` webhook URLs. Office 365 Connectors are retired as of March 31, 2026, so the example was changed to the current `service.teams-workflows`, `teams-workflows:` template field, Power Automate webhook URL shape, and `teams-workflows` subscription annotation.
- The PagerDuty example used `service.pagerduty` and a template structure with `routingKey`, `eventAction`, `payload`, and `customDetails`, which does not match the current Argo CD PagerDuty Events API v2 integration. It was changed to `service.pagerdutyv2`, `pagerdutyv2:` template fields, and supported fields such as `summary`, `severity`, `source`, `component`, `dedupKey`, and `url`.
- The best-practices PagerDuty subscription annotation was updated from `.pagerduty` to `.pagerdutyv2` to match the corrected service.
- The CLI testing section used outdated/nonexistent commands: `trigger list`, `template list`, and `notifications test`. These were corrected to `argocd admin notifications trigger get`, `argocd admin notifications template get`, and `argocd admin notifications template notify`.
- Trigger predicates that access `app.status.operationState.phase` were updated to use `app.status?.operationState.phase`, matching the safer optional-access pattern used in Argo CD examples and avoiding evaluation errors before an operation state exists.

## Review Notes
The local `argocd` CLI was not installed in the review environment, so CLI command validation was performed against the official Argo CD command reference. The older standalone `argoproj-labs/argocd-notifications` installation URL still returns a valid manifest, but for modern Argo CD versions the notification controller is bundled and the official docs focus on installing the notification catalog.
