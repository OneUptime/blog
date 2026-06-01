# Validation Summary: How to Deploy Azure Logic Apps Using ARM Templates and CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Azure Logic Apps
- ARM templates
- Azure CLI
- Azure DevOps Pipelines
- GitHub Actions
- Azure Key Vault
- Microsoft-managed API connections

## Sources Consulted
- Microsoft Learn: Azure Resource Manager templates for Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-azure-resource-manager-templates-overview
- Microsoft Learn: Microsoft.Logic/workflows ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.logic/workflows
- Microsoft Learn: Microsoft.Web/connections ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/connections
- Microsoft Learn: Logic Apps workflow trigger and action schema reference - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-actions-triggers
- Microsoft Learn: Azure CLI az group export reference - https://learn.microsoft.com/en-us/cli/azure/group
- Microsoft Learn: Azure CLI az deployment group reference - https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Microsoft Learn: AzureResourceManagerTemplateDeployment@3 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-resource-manager-template-deployment-v3
- Azure GitHub Actions: azure/login documentation - https://github.com/Azure/login
- Azure GitHub Actions: azure/arm-deploy documentation - https://github.com/Azure/arm-deploy
- Azure GitHub Actions: azure/bicep-deploy documentation - https://github.com/Azure/bicep-deploy
- Microsoft Learn: Use Azure Key Vault to pass secure parameter value during deployment - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/key-vault-parameter

## Issues Found
- The parameterization example used an `ApiConnection` action without the connector-specific `host`, `method`, `path`, and connection references needed for a working managed connector action. I changed the small illustrative action to a built-in `Compose` action so the JSON remains a valid Logic Apps workflow example while still demonstrating parameter substitution.
- The GitHub Actions workflow used older `azure/login@v1` and `azure/arm-deploy@v1` action versions. I updated them to the current documented major versions, `azure/login@v3` and `azure/arm-deploy@v2`.
- The GitHub Actions section did not mention the Azure team's forward-looking deprecation notice for `azure/arm-deploy`. I added a caveat that `azure/bicep-deploy` is recommended for ongoing support and new ARM or Bicep deployment features.
- The Azure DevOps section said the YAML itself included manual approval gates. Azure DevOps approvals are configured on environments through approvals and checks, so I adjusted the wording to make that requirement explicit.
- The Key Vault section omitted deployment prerequisites. I added that secure template parameters should use `secureString` or `secureObject`, that the key vault must be enabled for template deployment, and that the deployment identity needs `Microsoft.KeyVault/vaults/deploy/action`.

## Review Notes
- The post focuses on Consumption Logic Apps using `Microsoft.Logic/workflows` and managed API connections. Standard Logic Apps have different deployment packaging and connection metadata, so a future article could call out that scope explicitly.
- The local environment did not have the Azure CLI installed, so CLI command validation was performed against current Microsoft Learn CLI documentation rather than local `az --help` output.
