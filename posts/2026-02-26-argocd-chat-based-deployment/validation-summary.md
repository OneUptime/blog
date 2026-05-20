# Validation Summary: How to Implement Chat-Based Deployment with ArgoCD

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Kubernetes
- Slack
- Slack Bolt for Python
- Microsoft Teams Workflows
- Python
- YAML

## Sources Consulted
- Argo CD Notifications Slack service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD Notifications Teams Workflows service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/teams-workflows/
- Argo CD Notifications services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Swagger API specification: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/swagger.json
- Slack slash command documentation: https://api.slack.com/slash-commands
- Slack Bolt for Python command documentation: https://docs.slack.dev/tools/bolt-python/concepts/commands/

## Issues Found
- The Slack bot used `command["user_name"]` for slash command users. Slack marks `user_name` as deprecated and recommends relying on `user_id`, so the examples now use `command["user_id"]` and mention users with `<@user_id>`.
- The Slack interactive approval examples used `body["user"]["username"]`. This was changed to `body["user"]["id"]` for the same ID-based user handling.
- The Argo CD API helper returned `resp.json()` without raising HTTP errors, so the existing `try`/`except` application existence check would not reliably catch 404 or other API failures. Added `resp.raise_for_status()`.
- The rollback example used `PUT /api/v1/applications/{name}/rollback`, but the current Argo CD API specifies `POST /api/v1/applications/{name}/rollback`. Updated the method to `POST`.
- The notification triggers referenced `app.status.operationState.phase` without checking that `operationState` exists. Added `app.status.operationState != nil` to avoid evaluation failures before an operation state is present.
- The Microsoft Teams section used the legacy Office 365 Connector `service.teams` and an `outlook.office.com/webhook` URL. Office 365 Connectors are retired as of March 31, 2026, so the example now uses the current `service.teams-workflows` service, `recipientUrls`, and Teams Workflows template key.

## Review Notes
- The examples are intentionally simplified and still require production hardening, especially authorization checks for deployment and approval commands, token scoping, request logging, and secret creation for the referenced Argo CD and chat credentials.
