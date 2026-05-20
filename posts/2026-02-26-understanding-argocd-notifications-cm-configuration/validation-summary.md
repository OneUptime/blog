# Validation Summary: Understanding ArgoCD argocd-notifications-cm Configuration

## Status
validated

## Post Type
Technical guide / configuration reference

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps and annotations
- Slack, Email, Webhook, Microsoft Teams Workflows, Opsgenie, PagerDuty V2, Telegram, Grafana, and GitHub notification services
- Go templates and Sprig template functions

## Sources Consulted
- Argo CD Notifications services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Notifications templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Slack notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD Email notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/email/
- Argo CD Webhook notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Teams Workflows notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams-workflows/
- Argo CD Teams Office 365 Connectors deprecation notice: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams/
- Argo CD Opsgenie notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/opsgenie/
- Argo CD PagerDuty V2 notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/pagerduty_v2/
- Argo CD GitHub notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/github/
- Argo CD Grafana notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/grafana/

## Issues Found
- The post described the ConfigMap as having only three categories of keys while also showing `context`. Changed the wording to say there are three main categories plus shared context.
- The Microsoft Teams example used the legacy `service.teams` Office 365 Connectors service. Current Argo CD docs mark that service as deprecated and retired on March 31, 2026, and recommend `service.teams-workflows`; updated the section and example accordingly.
- The PagerDuty example used `service.pagerduty` with `serviceKeys`, but `serviceKeys` belongs to the PagerDuty Events API v2 service. Updated the section and example to `service.pagerdutyv2`.
- The GitHub commit status template used `app.status.sync.revision` for `revisionPath`; Argo CD's GitHub service documentation uses `app.status.operationState.syncResult.revision` for commit status/deployment notifications. Updated the example.
- Trigger examples accessed optional `status.operationState` without optional chaining. Updated operation state checks to use `app.status?.operationState.phase`, matching current Argo CD trigger guidance.
- The composite trigger accessed a label as `app.metadata.labels.environment`; updated it to bracket notation for a map lookup.
- The template function list used `toUpper` and `toLower`; Argo CD templates use Go templates with Sprig functions, where the common function names are `upper` and `lower`. Updated the list.

## Review Notes
The post is technically relevant and salvageable. Some examples are intentionally illustrative and omit surrounding Secret resources; that is acceptable because the text explains `$secret-key` references and the service snippets focus on `argocd-notifications-cm`.
