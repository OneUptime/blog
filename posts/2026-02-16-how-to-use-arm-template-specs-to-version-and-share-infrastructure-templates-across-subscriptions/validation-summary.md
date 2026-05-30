# Validation Summary: How to Use ARM Template Specs to Version and Share Infra Templates Across

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Resource Manager ARM templates
- Azure Template Specs
- Azure CLI
- Bicep
- Azure App Service
- Azure Storage
- Azure RBAC
- Azure Pipelines

## Sources Consulted
- Microsoft Learn: Azure CLI `az ts` reference, https://learn.microsoft.com/en-us/cli/azure/ts?view=azure-cli-latest
- Microsoft Learn: Create and deploy a template spec, https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/quickstart-create-template-specs
- Microsoft Learn: Create and deploy a template spec with Bicep, https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/quickstart-create-template-specs
- Microsoft Learn: Bicep modules, https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/modules
- Microsoft Learn: Create a template spec with linked templates, https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/template-specs-create-linked
- Microsoft Learn: Quickstart: Create App Service app using an ARM template, https://learn.microsoft.com/en-us/azure/app-service/quickstart-arm-template

## Issues Found
- The Bicep App Service example used lowercase `linuxFxVersion` runtime values such as `dotnet|8.0` and `node|20-lts`. Updated them to documented App Service Linux stack values such as `DOTNETCORE|8.0` and `NODE|20-lts`.
- The Linux App Service plan example omitted `kind: 'linux'`. Added it to align with Microsoft's ARM template examples for Linux App Service plans.
- The Bicep module example used `ts:rg-template-specs/secure-webapp:1.0`, which does not match the documented template-spec module source format. Updated it to the documented full format: `ts:<subscription-id>/<resource-group>/<template-spec-name>:<version>`.
- The linked-template example used an unsupported Azure CLI option, `--linked-templates`. Removed that option and clarified that linked templates are packaged by using `relativePath` references from deployment resources in the main template.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI command verification was performed against the official Microsoft Learn CLI reference instead of local `az --help`.
- The storage account ARM template uses API version `2023-01-01`, which remains valid, although newer API versions are available in current Microsoft examples.
