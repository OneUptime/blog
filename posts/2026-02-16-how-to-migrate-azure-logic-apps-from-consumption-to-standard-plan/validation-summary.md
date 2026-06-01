# Validation Summary: How to Migrate Azure Logic Apps from Consumption to Standard Plan

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Azure Logic Apps Consumption
- Azure Logic Apps Standard
- Azure CLI
- Workflow Definition Language
- Standard Logic Apps project structure
- Logic Apps managed API connections and service provider connections

## Sources Consulted
- Microsoft Learn: Export Workflows from Consumption to Standard - Azure Logic Apps: https://learn.microsoft.com/en-us/azure/logic-apps/export-from-consumption-to-standard-logic-app
- Microsoft Learn: DevOps Deployment for Standard Workflows - Azure Logic Apps: https://learn.microsoft.com/en-us/azure/logic-apps/devops-deployment-single-tenant-azure-logic-apps
- Microsoft Learn: Edit App and Host Settings for Standard Logic Apps: https://learn.microsoft.com/en-us/azure/logic-apps/edit-app-settings-host-settings
- Microsoft Learn: Authenticate workflow connections by using managed identities in Azure Logic Apps: https://learn.microsoft.com/en-us/azure/logic-apps/authenticate-with-managed-identity
- Microsoft Learn: Azure CLI `az logicapp`: https://learn.microsoft.com/en-us/cli/azure/logicapp
- Microsoft Learn: Azure CLI `az logic workflow`: https://learn.microsoft.com/en-us/cli/azure/logic/workflow
- Microsoft Learn: Azure CLI `az logicapp deployment source`: https://learn.microsoft.com/en-us/cli/azure/logicapp/deployment/source

## Issues Found
- The post said Consumption has no local development and no CI/CD. This was too absolute, so it now says local development is limited and CI/CD is more complex, which better matches the documented Standard advantages.
- The post said VNET integration requires the Premium App Service plan. This was changed to the Workflow Standard hosting plan or App Service Environment, which matches current Standard hosting options.
- Integration Account features were listed as not available in Standard. This was changed to say they work differently and may need manual setup after export.
- `local.settings.json` used `FUNCTIONS_WORKER_RUNTIME: node`. Current Microsoft documentation requires `dotnet` for new and existing deployed Standard logic apps, so the snippet now uses `dotnet` and includes `APP_KIND` and `FUNCTIONS_EXTENSION_VERSION`.
- The workflow JSON used `"uri": "@appsetting('BackendApiUrl')/orders"`, which mixes a full-string expression with literal text. It now uses interpolation: `"@{appsetting('BackendApiUrl')}/orders"`.
- The Azure CLI create command used `--runtime-version ~4`, but `az logicapp create` accepts Functions version `4` via `--functions-version`, while `--runtime-version` is for Node runtime versions such as `~18`. The command now uses `--functions-version 4`, and the app settings include the required runtime settings.

## Review Notes
The migration guidance is technically relevant and generally aligned with Azure's current Consumption-to-Standard export model. In practice, Microsoft's Visual Studio Code export tool is the preferred starting point for many migrations because it generates a Standard project plus remediation notes, but the manual steps in the post remain useful as long as teams verify connector-specific behavior.
