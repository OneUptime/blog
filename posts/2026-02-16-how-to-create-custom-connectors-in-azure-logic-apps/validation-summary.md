# Validation Summary: How to Create Custom Connectors in Azure Logic Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Logic Apps
- Custom connectors
- OpenAPI/Swagger 2.0
- Power Platform custom connector CLI (`paconn`)
- Azure Resource Manager API connections
- OAuth 2.0, API key, and Basic authentication
- C# custom connector scripts

## Sources Consulted
- Microsoft Learn: Custom connectors in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/custom-connector-overview
- Microsoft Learn: Create a custom connector from an OpenAPI definition - https://learn.microsoft.com/en-ie/connectors/custom-connectors/define-openapi-definition
- Microsoft Learn: Create a custom connector with the CLI - https://learn.microsoft.com/en-ie/connectors/custom-connectors/paconn-cli
- Microsoft Learn: Specify connection parameters - https://learn.microsoft.com/en-us/connectors/custom-connectors/connection-parameters
- Microsoft Learn: Write code in a custom connector - https://learn.microsoft.com/en-us/connectors/custom-connectors/write-code
- Microsoft Learn: Share a custom connector in your organization - https://learn.microsoft.com/en-us/connectors/custom-connectors/share
- Microsoft Learn: Microsoft.Web/connections ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/connections
- Microsoft Learn: Microsoft.Web/customApis ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/customapis
- Microsoft Learn: Recurrence trigger workflow definition - https://learn.microsoft.com/en-us/azure/connectors/connectors-native-recurrence
- Microsoft Learn: Workflow Definition Language schema reference - https://learn.microsoft.com/en-us/azure/logic-apps/update-workflow-definition-language-schema

## Issues Found
- The post claimed the connector could wrap "any REST API." Microsoft documentation qualifies custom connectors as wrappers around REST or SOAP APIs that meet connector requirements, commonly public endpoints. Changed the phrasing to "a REST API that meets the connector requirements."
- The prerequisites said only that the API must be accessible over HTTPS. Microsoft custom connector documentation describes public APIs/endpoints as the supported baseline for custom connectors. Updated this to "a public HTTPS endpoint."
- The post showed a `New-CustomConnector` PowerShell command from `Microsoft.PowerApps.Administration.PowerShell`. That cmdlet is not part of the current official module documentation, and the official command-line tool for custom connector creation is `paconn`. Replaced the PowerShell section with a documented `paconn` CLI example.
- The API connection example used a custom API resource ID without the resource group segment. `Microsoft.Web/customApis` is a resource-group scoped resource, so the example now includes `/resourceGroups/rg-workflows/`.
- The sharing section implied an Azure Portal "Share" option for Logic Apps custom connectors. Microsoft documents Logic Apps custom connectors as visible to users in the same tenant, subscription, and region, while explicit invite-style sharing applies to Power Apps and Power Automate. Updated the section to distinguish these behaviors.

## Review Notes
The JSON examples were parsed successfully. The C# custom code pattern matches the documented `Script : ScriptBase` and `ExecuteAsync` model. The workflow sample is illustrative and omits full deployment scaffolding such as `$schema`, `contentVersion`, and full `$connections` parameter definitions.
