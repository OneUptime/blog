# Validation Summary: How to Set Up CI/CD Pipelines for Azure Marketplace Offer Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DevOps Pipelines
- Azure Marketplace / Partner Center publishing
- Microsoft Marketplace Product Ingestion API
- Azure Resource Manager templates
- createUiDefinition.json for Azure Managed Applications
- ARM Template Test Toolkit
- Azure CLI
- Azure PowerShell
- Azure Blob Storage SAS URLs
- PowerShell
- YAML

## Sources Consulted
- ARM Template Test Toolkit documentation: https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/test-toolkit
- Microsoft Marketplace Product Ingestion API documentation: https://learn.microsoft.com/en-us/partner-center/marketplace-offers/product-ingestion-api
- createUiDefinition.json for Azure Managed Applications: https://learn.microsoft.com/en-us/azure/azure-resource-manager/managed-applications/create-uidefinition-overview
- Azure Managed Applications artifact reference documentation: https://learn.microsoft.com/en-us/azure/azure-resource-manager/managed-applications/artifacts-location
- Azure CLI az storage blob reference: https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Azure CLI az deployment group reference: https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Azure DevOps PowerShell@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/powershell-v2
- Azure DevOps path trigger documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/azure-repos-git
- Azure DevOps PublishBuildArtifacts@1 documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-build-artifacts-v1
- Azure PowerShell New-AzResourceGroupDeployment documentation: https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azresourcegroupdeployment
- Azure PowerShell Remove-AzResourceGroup documentation: https://learn.microsoft.com/en-us/powershell/module/az.resources/remove-azresourcegroup

## Issues Found
- The Azure Pipelines path filter used `src/*`, which can miss nested template updates. Changed it to `src/**` to match recursive source changes.
- The ARM TTK example ran `Test-AzTemplate` against `./src/mainTemplate.json` and checked a nonstandard `Passed` property. Updated it to run against the template/package folder and fail on returned `Errors`, matching the official ARM TTK pipeline examples.
- The createUiDefinition validation treated `$schema` as required and did not check `version`. Official documentation says `$schema` is recommended but optional, while `handler`, `version`, and `parameters` are required. Updated the validation accordingly.
- The UI output-to-template-parameter check would incorrectly reject `applicationResourceName`, which is a documented managed application output used to name the managed application resource. Updated the loop to skip that special output.
- The blob SAS command used `--auth-mode login` without `--as-user`. For a user delegation SAS with Microsoft Entra authentication, Azure CLI requires `--as-user` with `--auth-mode login`. Added `--as-user`.
- The Marketplace API example used the older `https://api.partner.microsoft.com` OAuth resource and endpoint. Current Product Ingestion API documentation uses Microsoft Graph, the v2 token endpoint, `scope=https://graph.microsoft.com/.default`, and `https://graph.microsoft.com/rp/product-ingestion/...` endpoints. Updated the sample authentication and resource-tree GET call.
- The publishing message said certification review would begin automatically. Current Product Ingestion API flow requires publishing draft changes to preview before pushing live, so the message was corrected.

## Review Notes
The Partner Center update snippet is still intentionally simplified, as the post states. A complete production implementation would need to retrieve the relevant product resources, update the package-specific resource for the offer type, submit a configure request, poll configure status, publish to preview, test preview, and then push the preview submission live.
