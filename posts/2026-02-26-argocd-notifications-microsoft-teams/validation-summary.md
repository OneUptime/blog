# Validation Summary: How to Send ArgoCD Notifications to Microsoft Teams

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD notifications
- Microsoft Teams Workflows
- Power Automate webhook URLs
- Kubernetes Secrets and ConfigMaps
- kubectl
- Adaptive Cards

## Sources Consulted
- Argo CD Teams Workflows notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams-workflows/
- Argo CD Teams Office 365 Connectors service deprecation notice: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams/
- Argo CD notification services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Microsoft Teams incoming webhook workflows: https://support.microsoft.com/en-us/office/send-messages-in-teams-using-incoming-webhooks-323660ec-12ca-40b1-a1d3-a3df47e808c4
- Microsoft Teams connector deprecation and Workflows guidance: https://learn.microsoft.com/en-us/microsoftteams/m365-custom-connectors
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post used the legacy Argo CD `service.teams` Office 365 Connectors integration and `teams` subscription annotations. Current Argo CD documentation marks Office 365 Connectors as deprecated and retired on March 31, 2026. I updated the primary flow to use `service.teams-workflows`, `teams-workflows` template blocks, and `notifications.argoproj.io/...teams-workflows` annotations.
- The setup instructions described creating an Incoming Webhook connector and used old `outlook.office.com` webhook URLs. I changed the instructions and examples to Teams Workflows / Power Automate webhook URLs such as `api.powerautomate.com`, `api.powerplatform.com`, and `flow.microsoft.com`.
- The adaptive card example used the generic webhook service as the main recommended path and included the full Teams message envelope. Argo CD Teams Workflows supports `adaptiveCard` directly and wraps it automatically, so I added the native `teams-workflows` adaptive card template and kept the generic webhook example only as an alternative.
- The original Teams template sections used MessageCard-specific `activityTitle` and `activitySubtitle` fields. Argo CD Teams Workflows converts supported fields such as `title`, `text`, `sections[].facts`, `themeColor`, and `potentialAction`, so I moved that information into supported `text` fields and left facts inside sections.
- The trigger examples referenced `app.status.operationState` directly. Current Argo CD trigger examples use optional access for operation state, so I changed the sync triggers to `app.status?.operationState...` and added `oncePer: app.status.sync.revision` to the deployed trigger to avoid repeated deployed notifications for the same revision.
- The direct curl test used a legacy connector-style body and URL. I updated it to post an Adaptive Card message envelope to a Teams Workflow webhook URL.

## Review Notes
The corrected post is technically aligned with current Argo CD Teams Workflows documentation. Existing organizations may still have old connector configurations in place, but those should be treated as migration cases rather than the recommended setup path.
