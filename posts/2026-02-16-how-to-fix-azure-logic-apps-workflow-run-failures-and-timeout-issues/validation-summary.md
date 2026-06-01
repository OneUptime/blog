# Validation Summary: How to Fix Azure Logic Apps Workflow Run Failures and Timeout Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Logic Apps Consumption
- Azure Logic Apps Standard
- Workflow Definition Language
- Azure managed connectors and API connections
- Managed identities
- Azure CLI
- Azure Monitor alerts and diagnostic settings

## Sources Consulted
- Microsoft Learn: View workflow status and run history in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/view-workflow-status-run-history
- Microsoft Learn: Workflow Definition Language schema reference - https://learn.microsoft.com/en-us/azure/logic-apps/workflow-definition-language-schema
- Microsoft Learn: Schema reference for trigger and action types - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-actions-triggers
- Microsoft Learn: Limits and configuration reference for Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-limits-and-config
- Microsoft Learn: Handle errors and exceptions in Azure Logic Apps workflows - https://learn.microsoft.com/en-us/azure/logic-apps/error-exception-handling
- Microsoft Learn: Handle large messages with chunking - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-handle-large-messages
- Microsoft Learn: Monitor and collect diagnostic data for workflows - https://learn.microsoft.com/en-us/azure/logic-apps/monitor-workflows-collect-diagnostic-data
- Microsoft Learn: View metrics for workflow health and performance - https://learn.microsoft.com/en-us/azure/logic-apps/view-workflow-metrics
- Microsoft Learn: Workflow Triggers - List Callback Url REST API - https://learn.microsoft.com/en-us/rest/api/logic/workflow-triggers/list-callback-url?view=rest-logic-2016-06-01
- Microsoft Learn: Azure CLI az monitor metrics alert - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest
- Microsoft Learn: Azure CLI az monitor diagnostic-settings - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings?view=azure-cli-latest

## Issues Found
- The run history section implied every Logic Apps execution has persisted run history. Updated it to specify stateful workflow executions, because stateless Standard workflows do not store run history by default.
- The HTTP timeout section implied the 2-minute Consumption outbound request timeout can be fixed simply by setting a longer action timeout. Updated the wording to distinguish synchronous HTTP request timeout from asynchronous operation duration, and kept `limit.timeout` scoped to asynchronous polling.
- The long-running workflow example showed `operationOptions: "DisableAsyncPattern"` while recommending the async polling pattern. Removed that option from the example and clarified that it should only be used when intentionally disabling Location-header polling.
- The managed identity section said managed identities do not expire. Updated this to explain that they avoid user-owned secrets and Azure manages the credential lifecycle.
- The large payload section said Consumption supports 100 MB for HTTP actions and 50 MB for other actions. Updated it to the current documented 100 MB default message size limit, with chunking and connector-specific caveats.
- The retry policy JSON placed `retryPolicy` as a sibling of `inputs`. Moved it inside the `inputs` object, matching the documented workflow definition shape.
- The trigger callback URL command omitted the trigger segment. Updated it to call `/workflows/{workflowName}/triggers/{triggerName}/listCallbackUrl`.
- The Azure Monitor metric alert example used ISO 8601 durations for Azure CLI options. Updated those options to the CLI-documented `5m` and `1m` format.
- The Standard vs Consumption section stated stateless workflows have no run history. Updated it to note that run history is not stored by default, but temporary debug run history can be enabled.
- The Standard performance claim was too absolute. Updated it to say performance can be better on single-tenant infrastructure with configurable compute.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI syntax was verified against official Microsoft Learn CLI reference pages rather than local `az --help` output.
