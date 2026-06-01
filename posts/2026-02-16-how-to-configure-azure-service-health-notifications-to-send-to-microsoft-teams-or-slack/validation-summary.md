# Validation Summary: Configure Azure Service Health Notifications to Send to Microsoft Teams or Slack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Service Health
- Azure Monitor activity log alerts
- Azure Monitor action groups
- Azure Logic Apps
- Microsoft Teams Workflows and webhooks
- Slack incoming webhooks and Block Kit
- Azure CLI

## Sources Consulted
- Azure CLI `az monitor action-group`: https://learn.microsoft.com/en-gb/cli/azure/monitor/action-group?view=azure-cli-latest
- Azure CLI `az monitor activity-log alert`: https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert?view=azure-cli-latest
- Azure CLI `az logic workflow`: https://learn.microsoft.com/en-us/cli/azure/logic/workflow?view=azure-cli-latest
- Azure Logic Apps workflow trigger callback URL REST API: https://learn.microsoft.com/en-us/rest/api/logic/workflow-triggers/list-callback-url?view=rest-logic-2016-06-01
- Azure Logic Apps workflow trigger and action schema reference: https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-actions-triggers
- Azure Service Health webhook payload guide: https://learn.microsoft.com/en-us/azure/service-health/service-health-alert-webhook-guide
- Azure Service Health notification properties: https://learn.microsoft.com/en-us/Azure/service-health/service-health-notifications-properties
- Microsoft Teams incoming webhook and Workflows guidance: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Slack incoming webhooks: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks
- Slack Block Kit blocks reference: https://docs.slack.dev/reference/block-kit/blocks/

## Issues Found
- The Logic App creation example passed a nested `definition` object to `az logic workflow create --definition`. The Azure CLI parameter expects the workflow definition itself, so I removed the extra wrapper and left the `$schema`, `triggers`, and `actions` fields at the top level of the supplied definition.
- The Logic App connection example used `az logic workflow show --query "accessEndpoint"` as the action target. That value is not the signed Request trigger callback URL. I changed the example to retrieve the Logic App resource ID, call the Logic Apps `listCallbackUrl` API for the `manual` trigger with `az rest`, and add the receiver with the `logicapp` action type.
- The Slack direct webhook section claimed that Azure Monitor could post the raw alert JSON directly to Slack and have it display as a plain text block. Slack incoming webhooks expect Slack message payload fields such as `text` or `blocks`, so I replaced the nonworking direct action group example with a limitation note that directs readers to the Logic App transformation approach.
- The architecture summary claimed direct webhook delivery to Slack as a main supported approach. I revised the wording so direct webhooks are described as suitable only for endpoints that can accept the Azure Monitor alert schema.

## Review Notes
The Azure Monitor activity log alert commands, action group webhook syntax, Service Health payload field paths, Teams Workflows direction, and Slack Block Kit payload shape are otherwise consistent with the official documentation. Azure CLI was not installed in the local environment, so CLI verification was performed against Microsoft Learn CLI reference pages rather than local `az --help` output.
