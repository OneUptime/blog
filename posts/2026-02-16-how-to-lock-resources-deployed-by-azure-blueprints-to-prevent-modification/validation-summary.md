# Validation Summary: How to Lock Resources Deployed by Azure Blueprints to Prevent Modification

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Blueprints
- Azure Resource Manager resource locks
- Azure RBAC deny assignments
- ARM templates
- Azure PowerShell Az.Blueprint module

## Sources Consulted
- Microsoft Learn: Understand resource locking in Azure Blueprints: https://learn.microsoft.com/en-us/azure/governance/blueprints/concepts/resource-locking
- Microsoft Learn: Overview of Azure Blueprints: https://learn.microsoft.com/en-us/azure/governance/blueprints/overview
- Microsoft Learn: How to manage assignments with PowerShell: https://learn.microsoft.com/en-us/azure/governance/blueprints/how-to/manage-assignments-ps
- Microsoft Learn: New-AzBlueprintAssignment cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/az.blueprint/new-azblueprintassignment
- Microsoft Learn: Lock your Azure resources to protect your infrastructure: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources
- Microsoft Learn: Apply an Azure Resource Manager lock to a storage account: https://learn.microsoft.com/en-us/azure/storage/common/lock-account-resource

## Issues Found
- Azure Blueprints is now documented by Microsoft as a preview service scheduled for deprecation on July 11, 2026. Added a caveat near the start and adjusted the conclusion to avoid presenting it as the best choice for new designs without migration context.
- The post implied subscription owners could not remove blueprint locks except by changing or deleting the assignment, but did not explain that subscription Owners can usually delete subscription-scoped assignments. Added the management group assignment caveat from Microsoft documentation.
- Clarified that blueprint locks apply to non-extension resources deployed by the blueprint assignment, not to existing resources in already-existing resource groups.
- Clarified the Read Only lock description because Microsoft documents exceptions such as tags.
- The storage account Read Only example incorrectly stated that it prevents any data from being written. Updated it to distinguish Azure Resource Manager control-plane operations from storage data-plane operations.
- The ARM JSON snippet used comments inside a `json` fenced block. Removed comments so the snippet is valid JSON.
- The Azure PowerShell example used `-LockMode`, but the documented `New-AzBlueprintAssignment` parameter is `-Lock`. Updated the command.
- The exclusion example used non-existent `-LockExcludePrincipal` and `-LockExcludeAction` parameters. Replaced it with a JSON assignment-file example using `excludedPrincipals` and `excludedActions`, followed by `New-AzBlueprintAssignment -AssignmentFile`.

## Review Notes
The corrected guidance is valid for existing Azure Blueprints deployments. Because Azure Blueprints is scheduled for deprecation on July 11, 2026, future content should prefer Template Specs and Deployment Stacks for new implementations.
