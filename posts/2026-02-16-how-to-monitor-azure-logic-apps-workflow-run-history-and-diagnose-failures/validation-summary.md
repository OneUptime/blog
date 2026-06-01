# Validation Summary: How to Monitor Azure Logic Apps Workflow Run History and Diagnose Failures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Logic Apps
- Azure Monitor
- Log Analytics
- Kusto Query Language (KQL)
- Azure CLI
- Azure REST API

## Sources Consulted
- Azure Logic Apps monitoring overview: https://learn.microsoft.com/en-us/azure/logic-apps/monitor-logic-apps-overview
- Check workflow status, view run history, and set up alerts in Azure Logic Apps: https://learn.microsoft.com/en-us/azure/logic-apps/view-workflow-status-run-history
- Collect diagnostic data for workflows in Azure Logic Apps: https://learn.microsoft.com/en-us/azure/logic-apps/monitor-workflows-collect-diagnostic-data
- Azure Logic Apps monitoring data reference: https://learn.microsoft.com/en-us/azure/logic-apps/monitor-logic-apps-reference
- AzureDiagnostics table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azurediagnostics
- LogicAppWorkflowRuntime table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/logicappworkflowruntime
- Azure CLI `az monitor diagnostic-settings create` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings?view=azure-cli-latest
- Azure CLI `az monitor metrics alert create` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest
- Azure Logic Apps Workflow Trigger Histories - Resubmit REST API: https://learn.microsoft.com/en-us/rest/api/logic/workflow-trigger-histories/resubmit?view=rest-logic-2019-05-01

## Issues Found
- The run status list included `Skipped` as a workflow run status and described `Cancelled` and `Waiting` imprecisely. Microsoft documents `Skipped` as a trigger status, while workflow runs can be `Aborted` and `Timed out`. Updated the run-status entries to match the documented meanings.
- The diagnostic settings command enabled `IntegrationAccountTrackingEvents` on a `Microsoft.Logic/workflows` resource. That category is documented for `Microsoft.Logic/integrationAccounts`, while workflows support `WorkflowRuntime`. Removed the unsupported category and clarified that the resource ID example is for a Consumption Logic App.
- The metric alert command used `--action-group`, but Azure CLI documents the option as `--action`/`-a`. Updated the command to use `--action`.
- The duration KQL examples used `durationInMilliseconds_d`, which is not the documented `AzureDiagnostics` column. Updated the examples to use `duration_milliseconds_d`.
- The REST API resubmission example used API version `2016-06-01`. Updated it to the current documented `2019-05-01` Logic Apps trigger history resubmit API version.

## Review Notes
- The post uses `AzureDiagnostics`, which remains valid when diagnostic settings use Azure Diagnostics mode. Microsoft also documents the resource-specific `LogicAppWorkflowRuntime` table, so future updates could show both table schemas for Standard and resource-specific diagnostic settings.
