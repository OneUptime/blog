# Validation Summary: ArgoCD Notification Templates Cheat Sheet

## Status
validated

## Post Type
Reference / cheat sheet

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps, Secrets, annotations, and kubectl
- Argo CD notification templates and triggers
- Slack, email, webhook, PagerDuty V2, and Microsoft Teams Workflows notification services
- Go html/template and Sprig template functions

## Sources Consulted
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD notification templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Slack notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD email notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/email/
- Argo CD webhook notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD PagerDuty V2 notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/pagerduty_v2/
- Argo CD Teams Workflows notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams-workflows/
- Argo CD `argocd admin notifications template notify` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_notifications_template_notify/
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml

## Issues Found
- The standalone catalog installation command did not include the current official `--server-side --force-conflicts` flags. Updated the `kubectl apply` command to match the current Argo CD notifications overview.
- Trigger expressions directly accessed `app.status.operationState.phase`, but Argo CD documents `status.operationState` as optional and recommends optional chaining. Updated trigger examples to use `app.status?.operationState.phase`.
- The PagerDuty example used a generic webhook payload and subscription name, but the current Argo CD integration for Events API v2 is the native `pagerdutyv2` service. Replaced the template with `pagerdutyv2` fields, updated the subscription annotation, and added the required `service.pagerdutyv2` configuration.
- The time formatting example used `toDate` and `formatTime`, which are not the documented Argo CD notification time helpers. Updated it to use `call .time.Parse` and Go's `Format` method.
- The Microsoft Teams quick reference used the legacy Office 365 Connectors service. Updated it to `service.teams-workflows`, the current recommended replacement.

## Review Notes
The Slack, email, webhook, template field, repo metadata, annotation, and CLI examples align with current Argo CD documentation after the corrections above. The examples remain generic and still require users to create matching entries in `argocd-notifications-secret` for referenced secret keys.
