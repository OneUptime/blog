# Validation Summary: How to Set Up Webhook-Based Alert Integrations from OpenTelemetry to Microsoft

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- Prometheus
- Alertmanager
- Alertmanager webhook receivers
- Microsoft Teams incoming webhooks and Workflows
- Discord incoming webhooks
- Python
- Flask
- Docker Compose
- Kubernetes
- curl

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager Alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- Microsoft Teams incoming webhook documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Microsoft Teams actionable message documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using
- Microsoft 365 Developer Blog on Office 365 connector retirement in Teams: https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/
- Microsoft Support documentation for Teams webhook workflows: https://support.microsoft.com/en-US/Workflows/send-messages-in-teams-using-incoming-webhooks
- Discord Webhook Resource documentation: https://docs.discord.com/developers/resources/webhook
- Discord rate limit documentation: https://docs.discord.com/developers/topics/rate-limits
- Discord Safety Center guide for webhooks and embeds: https://discord.com/safety/using-webhooks-and-embeds

## Issues Found
- The post said Alertmanager does not have native support for Teams or Discord. Current Alertmanager documentation includes `discord_config`, deprecated `msteams_config`, and current `msteamsv2_config`, so the architecture section now explains that a generic webhook adapter is useful for custom payload control rather than required by lack of native receivers.
- The Teams setup steps used the older channel connector flow. Microsoft is retiring Office 365 connectors in Teams and points webhook users to Workflows, so the Teams instructions now describe creating an incoming webhook workflow.
- The Docker Compose example used an old `outlook.office.com/webhook` Teams connector URL placeholder. It now uses a generic workflow webhook URL placeholder.
- The Python code called the Teams payload an Adaptive Card even though it builds a MessageCard. The comment now correctly says MessageCard.
- The Python adapter returned HTTP 200 to Alertmanager even when Teams or Discord returned an error. Added `raise_for_status()` after each outbound webhook call so Alertmanager can see a failed delivery and retry according to its normal notification behavior.
- The Alertmanager route example used deprecated `match` keys. Updated the routes to use current `matchers` syntax.
- Removed an unused `json` import from the Python snippet.

## Review Notes
The Python code block was parsed with Python's `ast` module and is syntactically valid. `amtool` was not installed locally, so the Alertmanager configuration was checked against the official documented schema rather than with the local CLI validator.
