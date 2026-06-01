# Validation Summary: How to Create Microsoft Sentinel Custom Connectors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Sentinel
- Codeless Connector Framework
- Azure Resource Manager templates
- Azure Monitor Data Collection Rules
- Azure Monitor Data Collection Endpoints
- Log Analytics custom tables
- Azure CLI
- Kusto Query Language
- OAuth2 client credentials

## Sources Consulted
- Microsoft Learn: Create a codeless connector for Microsoft Sentinel - https://learn.microsoft.com/en-us/azure/sentinel/create-codeless-connector
- Microsoft Learn: RestApiPoller data connector reference for the Codeless Connector Framework - https://learn.microsoft.com/en-us/azure/sentinel/data-connector-connection-rules-reference
- Microsoft Learn: Data connector definitions reference for the Codeless Connector Framework - https://learn.microsoft.com/en-us/azure/sentinel/data-connector-ui-definitions-reference
- Microsoft Learn: Microsoft.SecurityInsights/dataConnectors ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.securityinsights/2025-09-01/dataconnectors
- Microsoft Learn: Microsoft.SecurityInsights/dataConnectorDefinitions ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.securityinsights/2025-09-01/dataconnectordefinitions
- Microsoft Learn: az monitor log-analytics workspace table - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/table
- Microsoft Learn: Create data collection rules using JSON - https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-rule-create-edit
- Microsoft Learn: Add or delete tables and columns in Azure Monitor Logs - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/create-custom-table
- Microsoft Learn: What's new in Microsoft Sentinel - https://learn.microsoft.com/en-us/azure/sentinel/whats-new

## Issues Found
- Microsoft renamed Codeless Connector Platform (CCP) to Codeless Connector Framework (CCF) in June 2025. Updated the post to use CCF terminology while preserving the old CCP name as an alias on first mention.
- The polling connector sample used `kind: "APIPolling"`, which does not match the current CCF RestApiPoller reference. Updated it to `kind: "RestApiPoller"` and moved the examples to API version `2025-09-01`.
- The connector UI sample used `HasDataConnectors`; Microsoft documents `hasDataConnectors` for API polling connector connectivity criteria. Updated the value.
- The connector UI sample collected credentials but did not include a `ConnectionToggleButton`, which is the documented UI control that triggers deployment of the DCR based on the entered parameters. Added the button.
- The request sample used unsupported `{datetime:...}` and `{now:...}` placeholders in `queryParameters`. Replaced them with the documented `startTimeAttributeName`, `endTimeAttributeName`, `queryTimeFormat`, and `queryWindowInMin` pattern.
- The request sample used `rateLimitQps`; the documented property is `rateLimitQPS`. Updated the field and added `paginatedCallsPerSecond` so pagination calls are throttled as well.
- The text incorrectly said `queryWindowInMin` controls how frequently Sentinel polls. Updated it to describe the query window used for each poll.
- The Step 4 command block claimed to create a DCR but only created a custom table and DCE. Added the documented `az monitor data-collection rule create --rule-file` command and clarified that the rule file must declare the custom stream and route it to the custom table.

## Review Notes
The local workspace does not have the Azure CLI installed, so CLI syntax was checked against Microsoft Learn rather than local `az --help`. The embedded JSON blocks were parsed successfully with `python3`.
