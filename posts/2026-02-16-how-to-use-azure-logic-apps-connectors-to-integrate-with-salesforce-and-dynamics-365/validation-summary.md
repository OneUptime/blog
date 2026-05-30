# Validation Summary: How to Use Azure Logic Apps Connectors to Integrate

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Azure Logic Apps
- Salesforce connector
- Microsoft Dataverse connector
- Dynamics 365 Sales / CRM data
- Azure Service Bus
- Azure Monitor metrics alerts
- Azure CLI

## Sources Consulted
- Microsoft Learn: Salesforce connector reference - https://learn.microsoft.com/en-gb/connectors/salesforce/
- Microsoft Learn: Microsoft Dataverse connector reference - https://learn.microsoft.com/en-us/connectors/commondataserviceforapps/
- Microsoft Learn: Connect to Microsoft Dataverse from Azure Logic Apps workflows - https://learn.microsoft.com/azure/logic-apps/connectors/dataverse
- Microsoft Learn: Dynamics 365 connector deprecation announcement - https://learn.microsoft.com/power-platform/important-changes-coming#dynamics-365-connector-is-deprecated
- Microsoft Learn: Logic Apps error and exception handling / retry policies - https://learn.microsoft.com/azure/logic-apps/error-exception-handling
- Microsoft Learn: Logic Apps workflow action and trigger schema - https://learn.microsoft.com/azure/logic-apps/logic-apps-workflow-actions-triggers
- Microsoft Learn: Azure Monitor `az monitor metrics alert create` CLI reference - https://learn.microsoft.com/cli/azure/monitor/metrics/alert
- Microsoft Learn: Supported metrics for `Microsoft.Logic/Workflows` - https://learn.microsoft.com/azure/azure-monitor/reference/supported-metrics/microsoft-logic-workflows-metrics
- Microsoft Learn: Dataverse service protection API limits - https://learn.microsoft.com/power-apps/developer/data-platform/api-limits
- Salesforce Developers Blog: API Limits and Monitoring Your API Usage - https://developer.salesforce.com/blogs/2024/11/api-limits-and-monitoring-your-api-usage

## Issues Found
- The post described using the Dynamics 365 connector for new Logic Apps. That connector is deprecated; I changed the guidance to use the Microsoft Dataverse connector for Dataverse-backed Dynamics 365 apps.
- The Salesforce setup section treated `API Enabled` as a connected-app permission. I changed the wording to clarify that API access is enabled on the Salesforce user profile or permission set, while OAuth connected-app restrictions must allow the connector scopes.
- Several Dynamics 365 action names used legacy "record" terminology. I updated them to current Dataverse "row" action names such as "When a row is added, modified or deleted", "List rows", "Add a new row", and "Update a row".
- The Salesforce trigger section suggested a webhook-based trigger. The managed Salesforce connector trigger is polling-based, so I removed the webhook claim and kept the polling-frequency/API-consumption guidance.
- The contact field mapping used `company`, which is not the standard Dataverse contact company field. I changed it to `parentcustomerid` or a custom text column, depending on the intended modeling.
- The `LeadSource` mapping implied that a Salesforce value could be written directly to Dataverse `leadsourcecode`. I clarified that it must be mapped to the Dataverse choice value.
- The date-format section said Salesforce uses only `YYYY-MM-DD`. I clarified the distinction between Salesforce date fields and Salesforce datetime fields such as `CreatedDate`.
- The Azure CLI example used `--action-group`, which is not the current `az monitor metrics alert create` flag. I changed it to `--action`.
- The Dynamics 365 API limit note was too narrow. I updated it to describe Dataverse service protection limits as 6,000 requests per user per 5-minute sliding window plus execution-time and concurrency limits.

## Review Notes
The Logic Apps retry policy snippet matches the documented `retryPolicy` shape for supported operations. The Salesforce upsert example uses the current V2 external ID upsert operation pattern. The `RunsFailed` metric name is valid for `Microsoft.Logic/Workflows`.
