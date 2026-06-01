# Validation Summary: How to Fix 'InvalidTemplateDeployment' Errors in Azure Bicep Deployments

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Resource Manager deployments
- Azure Bicep
- Azure CLI
- Azure RBAC role assignments
- Azure virtual machine SKUs and quotas
- Azure resource naming rules

## Sources Consulted
- Microsoft Learn: Azure CLI `az deployment group` reference - https://learn.microsoft.com/en-us/cli/azure/deployment/group?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az deployment operation group` reference - https://learn.microsoft.com/en-us/cli/azure/deployment/operation/group?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm` reference - https://learn.microsoft.com/cli/azure/vm?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az network list-usages` reference - https://learn.microsoft.com/en-us/cli/azure/network?view=azure-cli-latest
- Microsoft Learn: Deploy ARM templates and Bicep files with Azure CLI - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-cli
- Microsoft Learn: Set resource dependencies in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/resource-dependencies
- Microsoft Learn: Bicep string functions, `uniqueString` - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-functions-string#uniquestring
- Microsoft Learn: Azure resource naming rules and restrictions - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Microsoft Learn: Use Bicep to create Azure RBAC resources - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/scenarios-rbac
- Microsoft Learn: Understand Azure role assignments - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments

## Issues Found
- The post said `az deployment group validate` gives the same validation errors as a full deployment. I changed this to say it catches many of the same preflight validation errors, because Azure validation and what-if do not guarantee catching every runtime deployment failure.
- The Key Vault naming summary was incomplete. I updated it to include allowed characters, hyphens, and the consecutive-hyphen restriction from Azure resource naming documentation.
- The dependency example contradicted Bicep behavior by saying `subnet.id` does not create an implicit dependency while the inline comment said it does. I corrected the comment and changed the explicit `dependsOn` example to a web app config resource whose name is built from a string, so Bicep cannot infer the dependency from a symbolic parent reference.
- The role assignment explanation over-specified the implementation as skipping a graph lookup. I changed it to the documented effect: setting `principalType` helps avoid intermittent principal resolution errors for service principals and managed identities.

## Review Notes
The Azure CLI commands and Bicep snippets were reviewed against current Microsoft documentation. Azure CLI and Bicep executables were not installed in the local workspace, so command validation was performed against official Microsoft Learn command references rather than local `--help` output.
