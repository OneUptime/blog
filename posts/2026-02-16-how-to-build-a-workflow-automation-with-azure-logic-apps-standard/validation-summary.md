# Validation Summary: How to Build a Workflow Automation with Azure Logic Apps Standard

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Logic Apps Standard
- Azure Logic Apps Consumption
- Azure CLI
- Azure App Service plans
- Azure Storage accounts
- Workflow Definition Language JSON
- Logic Apps stateful and stateless workflows
- Visual Studio Code Azure Logic Apps extension
- Azure Functions runtime and zip deployment
- Application Insights

## Sources Consulted
- Microsoft Learn: Azure Logic Apps overview - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-overview
- Microsoft Learn: Create Standard workflows with Visual Studio Code - https://learn.microsoft.com/en-us/azure/logic-apps/create-single-tenant-workflows-visual-studio-code
- Microsoft Learn: DevOps deployment for Standard logic apps - https://learn.microsoft.com/en-us/azure/logic-apps/devops-deployment-single-tenant-azure-logic-apps
- Microsoft Learn: Create cross-environment parameters for workflow inputs - https://learn.microsoft.com/en-us/azure/logic-apps/create-parameters-workflows
- Microsoft Learn: Workflow Definition Language schema reference - https://learn.microsoft.com/en-us/azure/logic-apps/update-workflow-definition-language-schema
- Microsoft Learn: Workflow Definition Language functions reference - https://learn.microsoft.com/en-us/azure/logic-apps/workflow-definition-language-functions-reference
- Microsoft Learn: View workflow status and run history - https://learn.microsoft.com/en-us/azure/logic-apps/view-workflow-status-run-history
- Microsoft Learn: Azure CLI az logicapp reference - https://learn.microsoft.com/en-us/cli/azure/logicapp
- Microsoft Learn: Azure CLI az logicapp deployment source reference - https://learn.microsoft.com/en-us/cli/azure/logicapp/deployment/source
- Microsoft Learn: Azure CLI az appservice plan reference - https://learn.microsoft.com/en-us/cli/azure/appservice/plan
- Microsoft Learn: Azure Functions app settings reference - https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings
- Microsoft Learn: Application Insights connection strings - https://learn.microsoft.com/en-us/azure/azure-monitor/app/connection-strings

## Issues Found
- The Logic App creation command used `--runtime-version ~4`, but Azure CLI uses `--functions-version 4` for the Azure Functions runtime. Changed the command to use `--functions-version 4`.
- The App Service plan command passed `--is-linux false`. The documented CLI pattern for a Windows plan is to omit `--is-linux`, so the flag was removed.
- The storage account example used a fixed name without noting Azure's global uniqueness requirement. Added a short note to change the name if needed.
- The HTTP action URI expressions used `@parameters('apiBaseUrl')/orders` and `@parameters('apiBaseUrl')/notifications`, which mix a full expression with literal text. Changed them to string interpolation with `@{parameters('apiBaseUrl')}/...`.
- The `parameters.json` example used capitalized parameter types (`String`, `Bool`, `Int`). Updated them to the lowercase Workflow Definition Language types (`string`, `bool`, `int`) used in Standard project examples.
- The parameter override guidance said to use application settings named `Workflows.{parameterName}`, which is not the documented Standard project model. Replaced this with guidance to promote environment-specific `parameters.json` files or reference app settings with `@appsetting(...)`.
- The stateless workflow description said stateless workflows do not persist run history. Clarified that they do not persist run history by default, because run history can be enabled for stateless workflows.
- The Application Insights example set both `APPINSIGHTS_INSTRUMENTATIONKEY` and `APPLICATIONINSIGHTS_CONNECTION_STRING`. Microsoft recommends connection strings and Azure Functions documentation says not to use both settings together, so the example now sets only `APPLICATIONINSIGHTS_CONNECTION_STRING`.

## Review Notes
The tutorial is technically relevant and accurate after the fixes above. The Azure CLI was not installed in the local environment, so CLI validation was done against current Microsoft Learn command reference pages rather than local `az --help` output.
