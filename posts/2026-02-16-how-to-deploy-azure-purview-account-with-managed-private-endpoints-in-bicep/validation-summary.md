# Validation Summary: How to Deploy Azure Purview Account with Managed Private Endpoints in Bicep

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Purview
- Azure Private Link and private endpoints
- Microsoft Purview managed virtual network and managed private endpoints
- Azure Bicep
- Azure CLI
- Azure Monitor diagnostic settings
- Azure Storage
- Azure role assignments and managed identities

## Sources Consulted
- Microsoft.Purview/accounts Bicep reference: https://learn.microsoft.com/en-us/azure/templates/Microsoft.Purview/2021-12-01/accounts
- Microsoft Purview classic private endpoint deployment guide: https://learn.microsoft.com/en-us/purview/data-gov-classic-private-link-end-to-end
- Microsoft Purview network architecture and best practices: https://learn.microsoft.com/en-us/purview/legacy/concept-best-practices-network
- Microsoft Purview managed private endpoints REST API: https://learn.microsoft.com/en-us/rest/api/purview/scanningdataplane/managed-private-endpoints/create-or-replace?view=rest-purview-scanningdataplane-2023-09-01
- Microsoft.Resources/deploymentScripts Bicep reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.resources/2023-08-01/deploymentscripts
- Azure Resource Manager deployment scripts in Bicep: https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deployment-script-develop
- Microsoft Purview Azure Monitor diagnostic log categories: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-purview-accounts-logs
- Azure CLI private endpoint connection commands: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint-connection

## Issues Found
- The Purview account example used `managedResources: {}`, which is not a valid property for `Microsoft.Purview/accounts@2021-12-01`. Replaced it with `managedResourcesPublicNetworkAccess: 'Disabled'`.
- The post described `managedResourceGroupName` as enabling the managed VNet. Updated the wording because the managed VNet is tied to a Managed VNet integration runtime, not directly enabled by that account property.
- The private endpoint discussion mixed classic account/portal private endpoints, ingestion private endpoints, and managed private endpoints. Clarified which endpoint type applies to each scenario.
- The private endpoint subnet references used `vnet.properties.subnets[0].id`. Replaced them with an explicit subnet resource ID to avoid relying on array ordering and runtime shape.
- The managed private endpoint REST call used an outdated/incorrect URI and API version, omitted `/scan`, used `default` instead of `defaultv2`, and included an unsupported `requestMessage` field. Updated it to the current scanning data plane API path and request body.
- The deployment script identity block was a placeholder that would not deploy. Added a `deploymentScriptIdentityId` parameter and wired it into the user-assigned identity map.
- The deployment script JSON body used single quotes, preventing shell variables from expanding. Changed the body quoting so `$STORAGE_ACCOUNT_ID` is passed correctly.
- The outputs referenced `purviewAccount.properties.endpoints.*`, which is not part of the documented Bicep create schema. Replaced them with deterministic Purview endpoint URLs.
- The approval command assumed the managed private endpoint name matched the generated storage private endpoint connection name. Added a list command and changed the approval example to use the generated connection name.

## Review Notes
Azure CLI and Bicep were not installed in the local environment, so I could not compile or execute the snippets locally. The review was completed against official Microsoft documentation and Azure CLI reference material.
