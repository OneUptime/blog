# Validation Summary: How to Use Azure Bicep Loops and Iterations to Deploy Multiple Similar Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bicep
- Azure Resource Manager templates
- Azure Storage accounts
- Azure Virtual Network and network interfaces
- Azure Virtual Machines
- Azure App Service plans and Web Apps

## Sources Consulted
- Microsoft Learn: Iterative loops in Bicep - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/loops
- Microsoft Learn: Conditional deployments in Bicep with the if expression - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/conditional-resource-deployment
- Microsoft Learn: Bicep string functions - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-functions-string
- Microsoft Learn: Bicep diagnostic code BCP076 - https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/diagnostics/bcp076
- Microsoft Learn: Azure Storage account overview - https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview
- Microsoft Learn: Microsoft.Storage/storageAccounts template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts
- Microsoft Learn: Microsoft.Network/networkInterfaces template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.network/networkinterfaces
- Microsoft Learn: Microsoft.Compute/virtualMachines template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.compute/virtualmachines
- Microsoft Learn: Microsoft.Web/serverfarms template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2023-01-01/serverfarms
- Microsoft Learn: Microsoft.Web/sites template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2023-01-01/sites
- Microsoft Learn: Azure CLI webapp create reference - https://learn.microsoft.com/en-us/cli/azure/webapp

## Issues Found
- The first storage account loop used `storage${env}${uniqueString(...)}`, which made the `staging` account name exceed Azure Storage's 24-character limit. Changed the prefix to `st`.
- The VM range-loop example referenced `subnetId` without declaring it. Added `param subnetId string` so the snippet is self-contained.
- The conditional storage example used `Premium_LRS` with `StorageV2`. Changed the storage account kind to `BlockBlobStorage` for premium accounts and `StorageV2` for standard accounts.
- The nested-loop section said Bicep cannot directly nest `for` expressions in resource definitions, which was too broad and conflicted with supported property-loop patterns. Reworded the statement to focus on modules for per-outer-item resource sets.
- The variable-loop example indexed a string with `role[0]`, which Bicep rejects. Replaced it with `substring(role, 0, 1)`.
- The output-loop storage account example generated names from full region strings, which could exceed the 24-character storage account limit. Changed it to use the loop index and a location-specific unique string.
- The `@batchSize` example used an incomplete VM resource with placeholder properties. Replaced it with a valid storage account resource loop that still demonstrates batched deployment.
- The multi-region Web App example used default names that were unlikely to be globally unique. Added a deterministic unique suffix to the Web App resource names.

## Review Notes
The examples use older but still valid resource API versions. They are acceptable for demonstrating Bicep loop syntax, though future updates could refresh them to newer API versions from the Azure template reference.
