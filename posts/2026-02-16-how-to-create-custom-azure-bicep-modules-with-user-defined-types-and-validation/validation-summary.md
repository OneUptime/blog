# Validation Summary: How to Create Custom Azure Bicep Modules with User-Defined Types and Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bicep
- Azure Resource Manager templates
- Azure App Service
- Azure Monitor diagnostic settings
- Azure CLI
- Bicep private module registry

## Sources Consulted
- Microsoft Learn: User-defined data types in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/user-defined-data-types
- Microsoft Learn: Imports in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-import
- Microsoft Learn: Bicep CLI commands - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-cli
- Microsoft Learn: Data types in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/data-types
- Microsoft Learn: Microsoft.Web/serverfarms 2023-01-01 - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2023-01-01/serverfarms
- Microsoft Learn: Microsoft.Web/sites 2023-01-01 - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2023-01-01/sites
- Microsoft Learn: Microsoft.Web/sites/hostNameBindings 2023-01-01 - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2023-01-01/sites/hostnamebindings
- Microsoft Learn: Microsoft.Insights/diagnosticSettings - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/diagnosticsettings
- Microsoft Learn: Create an App Service app using an Azure Resource Manager template - https://learn.microsoft.com/en-us/azure/app-service/quickstart-arm-template
- Microsoft Learn: az deployment group - https://learn.microsoft.com/en-us/cli/azure/deployment/group?view=azure-cli-latest
- Microsoft Learn: Create a private container registry in Azure for Bicep modules - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/private-module-registry

## Issues Found
- The `types.bicep` example imported types from another file without exporting them. Added `@export()` to the reusable type declarations because Bicep imports can only access exported statements.
- The `types.bicep` example used `@allowed` on object type properties. Replaced those decorators with string literal union types, because `@allowed` is only valid on `param` declarations.
- The App Service runtime stack example used `DOTNET|8.0`. Changed it to `DOTNETCORE|8.0`, which is the correct Linux App Service `linuxFxVersion` format for ASP.NET Core.
- The diagnostic settings example placed a `for` expression inside a ternary expression where Bicep does not allow it. Split the custom and default diagnostic log arrays into variables, then selected between them.
- The consumer `deploy.bicep` example referenced `logAnalytics.outputs.workspaceId` without defining `logAnalytics`. Replaced it with a `logAnalyticsWorkspaceId` parameter so the snippet is self-contained.
- The discriminated union example omitted the `@discriminator('type')` decorator. Added it to match Bicep's custom tagged union syntax.

## Review Notes
- Verified the corrected Bicep snippets with Bicep CLI 0.43.8. The snippets compile, with non-blocking linter recommendations to use the safe-access operator for optional properties.
