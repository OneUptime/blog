# Validation Summary: How to Fix 'Logic App' Workflow Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Logic Apps
- Azure CLI
- Azure REST API
- Workflow Definition Language
- Logic Apps workflow JSON definitions
- Managed identities
- Azure Monitor diagnostic settings

## Sources Consulted
- Azure Logic Apps workflow trigger and action schema reference: https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-actions-triggers
- Azure Logic Apps workflow definition language schema reference: https://learn.microsoft.com/en-us/azure/logic-apps/workflow-definition-language-schema
- Azure Logic Apps expression functions reference: https://learn.microsoft.com/en-us/azure/logic-apps/expression-functions-reference
- Azure Logic Apps Recurrence trigger documentation: https://learn.microsoft.com/en-us/azure/connectors/connectors-native-recurrence
- Azure Logic Apps run history documentation: https://learn.microsoft.com/en-us/azure/logic-apps/view-workflow-status-run-history
- Azure Logic Apps limits and run history retention documentation: https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-limits-and-config
- Azure CLI `az logic workflow` reference: https://learn.microsoft.com/en-us/cli/azure/logic/workflow
- Azure Logic Apps Workflow Runs REST API: https://learn.microsoft.com/en-us/rest/api/logic/workflow-runs/list
- Azure Logic Apps Workflow Run Actions REST API: https://learn.microsoft.com/en-us/rest/api/logic/workflow-run-actions/list
- Azure Logic Apps Workflow Trigger callback URL REST API: https://learn.microsoft.com/en-us/rest/api/logic/workflow-triggers/list-callback-url
- Azure Logic Apps regenerate access key REST API: https://learn.microsoft.com/en-us/rest/api/logic/workflows/regenerate-access-key
- Azure Logic Apps managed identity documentation: https://learn.microsoft.com/en-us/azure/logic-apps/authenticate-with-managed-identity
- Azure Monitor diagnostic settings CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings

## Issues Found
- The run history commands used non-existent `az logic workflow run` subcommands and the unsupported `--workflow-name` flag. Replaced them with documented `az rest` calls to the Workflow Runs and Workflow Run Actions REST APIs.
- The HTTP trigger SAS callback URL command queried `accessEndpoint`, which is not the trigger callback URL with SAS parameters. Replaced it with the documented `listCallbackUrl` REST call.
- The SAS key regeneration command used a non-existent Azure CLI subcommand. Replaced it with the documented `regenerateAccessKey` REST call and request body.
- The Logic Apps workflow show/update examples used `--workflow-name`; the Azure CLI reference uses `--name`. Updated those command examples.
- The Recurrence trigger example combined a `timeZone` value with a UTC `startTime` ending in `Z`. Microsoft documentation states the `Z` marks UTC and causes Azure Logic Apps to ignore the time zone, so the example now uses a local timestamp without `Z`.
- The Recurrence troubleshooting bullet incorrectly said a past `startTime` fires immediately once. Updated the guidance to describe the documented immediate first run behavior when `startTime` is omitted, and the `Z` plus `timeZone` pitfall.
- The "Service Principal Connection" section described service principal authentication but showed managed identity JSON. Renamed the section and text to managed identity.
- The For each example combined `operationOptions: "Sequential"` with an explicit concurrency count. Microsoft documentation says sequential mode and concurrency count should not both be used. Removed the sequential operation option from the controlled concurrency example.
- The run history retention command used an unsupported `runHistoryRetentionDays` property. Updated it to set `properties.runtimeConfiguration.lifetime.unit` and `properties.runtimeConfiguration.lifetime.count`, matching the ARM template shape documented for Consumption workflows.

## Review Notes
The examples are primarily Consumption workflow examples. Azure Logic Apps Standard uses different hosting and management surfaces for some operations, so future revisions could explicitly label Consumption versus Standard where CLI or REST management commands differ.
