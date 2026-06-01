# Validation Summary: How to Configure Microsoft Sentinel SOAR Connectors to Integrate

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Microsoft Sentinel
- Azure Logic Apps playbooks
- Microsoft Sentinel automation rules
- ServiceNow Table API and ServiceNow Logic Apps connector
- Jira Cloud and Jira Data Center REST APIs
- Azure CLI Sentinel extension
- Azure Monitor / Log Analytics KQL

## Sources Consulted
- Microsoft Sentinel playbooks and automation rules: https://learn.microsoft.com/en-us/azure/sentinel/automation/automate-responses-with-playbooks
- Microsoft Sentinel automation rule creation and permissions: https://learn.microsoft.com/en-us/azure/sentinel/create-manage-use-automation-rules
- Microsoft Sentinel Content Hub deployment permissions: https://learn.microsoft.com/en-us/azure/sentinel/sentinel-solutions-deploy
- Microsoft Sentinel Logic Apps connector reference: https://learn.microsoft.com/en-us/connectors/azuresentinel/
- Azure CLI `az sentinel automation-rule` reference: https://learn.microsoft.com/en-us/cli/azure/sentinel/automation-rule
- Microsoft.SecurityInsights automationRules ARM schema: https://learn.microsoft.com/en-us/azure/templates/microsoft.securityinsights/automationrules
- ServiceNow REST API reference and Table API behavior: https://www.servicenow.com/docs/r/api-reference/rest-api-explorer/c_RESTAPI.html
- ServiceNow Logic Apps connector reference: https://learn.microsoft.com/en-us/connectors/service-now/
- Jira Cloud REST API v3 reference: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
- Jira Cloud Create issue API reference: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/
- Atlassian Basic auth for REST APIs: https://developer.atlassian.com/cloud/jira/service-desk/basic-auth-for-rest-apis/

## Issues Found
- The architecture text said every external integration uses managed API connectors, but the Jira section uses an HTTP action. Updated the wording to include HTTP actions.
- The prerequisites omitted Microsoft Sentinel permissions needed for Content Hub and automation rule/playbook execution. Added Microsoft Sentinel Contributor and Microsoft Sentinel Automation Contributor requirements.
- The ServiceNow workflow snippets were labeled as JSON but contained comments and mixed ServiceNow managed connector usage with direct ServiceNow Table API paths. Reworked the examples as valid JSON using Logic Apps HTTP actions against the ServiceNow Table API.
- The ServiceNow create-ticket example said later sync could extract the Sentinel incident ID from the description, but the description did not include the ARM ID. Added the Sentinel ARM ID to the ServiceNow description.
- The ServiceNow examples passed display values for reference fields without enabling display-value input. Added `sysparm_input_display_value=true` for the direct Table API create call.
- The Jira REST API snippet contained comments inside a JSON block. Removed the comments while preserving the field mapping and Jira REST API v3 payload structure.
- The entity enrichment snippet used an unsupported-looking incident-specific `/entities/{incidentId}` path. Replaced it with the documented Microsoft Sentinel entity extraction pattern using the related entities payload and the `Entities - Get IPs` action path.
- The Azure CLI automation rule example claimed to trigger the Jira playbook but omitted the required `--actions` payload. Added a `RunPlaybook` action with `logicAppResourceId` and `tenantId`.
- The Azure CLI verification could not be run locally because the `az` executable is not installed in this workspace. The command shape was verified against Microsoft Learn CLI and ARM schema documentation instead.

## Review Notes
- The examples remain templates and require real tenant, subscription, Logic App, ServiceNow, Jira, project, priority, issue type, and assignment-group values.
- The ServiceNow and Jira credential examples still point readers to Key Vault in the best practices section; production playbooks should retrieve secrets from Key Vault or use managed connector authentication where possible.
- Microsoft notes that after March 31, 2027, Microsoft Sentinel will no longer be supported in the Azure portal and will be available only in the Microsoft Defender portal. The article is still accurate for the 2026 validation date, but future UI navigation may need updating.
