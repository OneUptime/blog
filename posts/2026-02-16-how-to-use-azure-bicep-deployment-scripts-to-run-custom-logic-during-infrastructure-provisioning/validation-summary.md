# Validation Summary: How to Use Azure Bicep Deployment Scripts to Run Custom Logic During Infra

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bicep
- Azure Resource Manager deployment scripts
- Azure CLI deployment scripts
- Azure PowerShell deployment scripts
- Azure managed identities
- Azure RBAC role assignments
- Azure Storage Blob
- Azure Container Instances
- Azure SQL Database migration placeholders
- Azure virtual networks and private deployment script execution

## Sources Consulted
- Microsoft Learn: Use deployment scripts in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-script-bicep
- Microsoft Learn: Develop deployment scripts in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-script-develop
- Microsoft Learn: Microsoft.Resources/deploymentScripts 2023-08-01 resource reference - https://learn.microsoft.com/en-us/azure/templates/Microsoft.Resources/2023-08-01/deploymentscripts
- Microsoft Learn: Run Bicep deployment script privately over a private endpoint - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-script-vnet-private-endpoint
- Microsoft Learn: Azure CLI az deployment-scripts reference - https://learn.microsoft.com/en-us/cli/azure/deployment-scripts
- Microsoft Learn: Azure CLI az sql db reference - https://learn.microsoft.com/en-us/cli/azure/sql/db
- Microsoft Learn: Azure built-in roles for Storage - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage

## Issues Found
- The post said deployment scripts have full access to the Azure context of the deployment. Updated this to say they access Azure through the identity assigned to the script, which matches the managed identity model in the official documentation.
- The post said the container instance and storage account are retained for the retention interval and then deleted. Updated this to distinguish `retentionInterval`, which controls the deployment script resource, from `cleanupPreference`, which controls the supporting container instance and storage account.
- The basic example comment said the role assignment grants Contributor, but the role definition ID is for Storage Blob Data Contributor. Corrected the comment.
- The blob upload example was not idempotent because a redeployment could fail if the blob already existed. Added `--overwrite true`.
- The secure environment variable example used `az sql db execute`, which is not a current Azure CLI command in the official `az sql db` reference. Replaced it with a safe validation check and a placeholder for invoking a real migration tool with the secure connection string.
- The idempotency section said a deployment script runs every time the template is deployed by default. Microsoft documentation says a deployment script does not rerun on redeploy when none of the `deploymentScripts` resource properties changed. Corrected the explanation and kept `forceUpdateTag` as the explicit rerun mechanism.

## Review Notes
- The Azure PowerShell example creates Microsoft Entra application objects. The syntax is consistent with the deployment script examples, but in a real deployment the assigned identity also needs appropriate Microsoft Graph permissions configured outside the Bicep file.
- The virtual network example uses `containerSettings.subnetIds`, which is valid for API version `2023-08-01`. In a real private deployment, the subnet and storage account setup also need the documented private networking prerequisites.
