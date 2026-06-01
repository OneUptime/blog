# Validation Summary: How to Configure Azure DevOps Audit Logging and Compliance Tracking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure DevOps auditing
- Azure DevOps Audit REST API
- Azure Monitor Logs and Log Analytics
- Kusto Query Language (KQL)
- Azure CLI
- Splunk HTTP Event Collector
- Azure Event Grid
- Python requests

## Sources Consulted
- Azure DevOps audit log access, export, retention, and limitations: https://learn.microsoft.com/en-us/azure/devops/organizations/audit/azure-devops-auditing
- Azure DevOps audit streaming setup and supported targets: https://learn.microsoft.com/en-us/azure/devops/organizations/audit/auditing-streaming
- Azure DevOps auditing events list: https://learn.microsoft.com/en-us/azure/devops/organizations/audit/auditing-events
- Azure DevOps Audit Log Query REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/audit/audit-log/query?view=azure-devops-rest-7.1
- Azure Monitor Logs table reference for AzureDevOpsAuditing: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/azuredevopsauditing
- Azure CLI scheduled query command reference: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Azure CLI Log Analytics table command reference: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/table
- Azure Monitor Log Analytics data retention configuration: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure
- Azure CLI Log Analytics data export command reference: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/data-export

## Issues Found
- The Audit REST API examples used `api-version=7.1`, but the official REST API requires `7.1-preview.1`. Updated the curl and Python examples.
- The curl example used BSD `date -v-1d`, which fails on common Linux environments. Replaced it with a portable Python timestamp command.
- The Audit REST API sample parsing assumed `decoratedAuditLogEntries` was always at the response root. Official examples wrap the result in `value`, so the curl and Python examples now handle that shape.
- The Python example used `datetime.utcnow()`, which is deprecated in modern Python. Updated it to use timezone-aware UTC datetimes and added `raise_for_status()`.
- The Log Analytics KQL examples used REST-style `ActionId` field names. The `AzureDevOpsAuditing` table uses `OperationName`, so the queries now use the correct column.
- Several KQL filters used incorrect Azure DevOps audit areas and action IDs, including `Permissions`, `ServiceEndpoint`, `Pipeline.ModifyPipeline`, and `Release.UpdateReleaseDefinition`. Updated them to use documented event names such as `Security.*`, `Group.*`, `Pipelines.PipelineModified`, `Release.ReleasePipelineModified`, and `Library.ServiceConnection*`.
- The Azure Monitor scheduled query alert example embedded the full query directly in `--condition`. Azure CLI scheduled query rules use query placeholders with `--condition-query`, so the command was corrected.
- The Log Analytics streaming setup described selecting an Azure subscription and workspace in Azure DevOps. Current Azure DevOps streaming setup requires the workspace ID and primary key, so those steps were corrected.
- The article said audit events appear in Log Analytics within a few minutes. Official documentation says within half an hour or less, so this was updated.
- The table retention command only set analytics retention to 730 days. Current guidance uses `--retention-time` with `--total-retention-time` for long-term retention, so the example now sets 30 days analytics retention and 730 days total retention.
- The data export command omitted `--enable true`. Added it to match Azure CLI examples for creating an enabled data export rule.
- The article omitted the Microsoft Entra ID requirement and the fact that auditing must be enabled. Added this prerequisite near the introduction.

## Review Notes
Azure DevOps auditing is still documented as public preview, and Microsoft notes that new audit actions are continually added. Future updates should re-check event names before relying on exact `OperationName` filters in compliance reports.
