# Validation Summary: How to Configure Azure Key Vault Firewall Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Key Vault
- Azure Key Vault firewall and virtual network rules
- Azure Virtual Network service endpoints
- Azure Private Link and private endpoints
- Azure CLI
- Bicep / ARM templates
- Azure Monitor diagnostic settings and Log Analytics

## Sources Consulted
- Microsoft Learn: Configure network security for Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/general/network-security
- Microsoft Learn: Virtual network service endpoints for Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/general/overview-vnet-service-endpoints
- Microsoft Learn: Azure virtual network service endpoints - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview
- Microsoft Learn: Access Azure Key Vault behind a firewall - https://learn.microsoft.com/en-us/azure/key-vault/general/access-behind-firewall
- Microsoft Learn: Integrate Key Vault with Azure Private Link - https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-service
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure CLI az keyvault network-rule - https://learn.microsoft.com/en-us/cli/azure/keyvault/network-rule
- Microsoft Learn: Microsoft.KeyVault/vaults Bicep/ARM reference - https://learn.microsoft.com/en-us/azure/templates/Microsoft.KeyVault/vaults
- Microsoft Learn: Use Key Vault references as app settings in Azure App Service and Azure Functions - https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references

## Issues Found
- The prerequisites listed "Key Vault Administrator or Contributor role" as sufficient for all tasks. Key Vault Administrator is a data-plane role and does not by itself grant permission to update vault networking properties. Changed the prerequisite to management-plane roles such as Key Vault Contributor, Contributor, Owner, or equivalent custom permissions, and noted that data-plane permissions are still needed for the secret-list test.
- The trusted Microsoft services section incorrectly implied that Azure App Service and Azure Functions Key Vault references are covered by the trusted-services firewall bypass. Microsoft documents App Service as trusted only for deploying Web App certificates from Key Vault, while app secret reads need network access to the vault. Updated the example and guidance accordingly.
- The lockout recovery section said the Azure portal accesses Key Vault through Azure Resource Manager and can bypass the firewall if trusted services are enabled. Firewall rules do not apply to control-plane operations, but portal data-plane browsing still requires the client to be inside the allowed network boundary. Clarified that only portal/ARM management of networking settings remains available.
- The service endpoints comparison said cross-region access is not supported. Azure service endpoint documentation states that, except for specific services such as Azure SQL, supported services can be secured to virtual networks in any region. Updated the table to say Key Vault service endpoints support cross-region scenarios, and clarified the private endpoint region constraint.
- Removed "You need cross-region access" from the private endpoint recommendation list because cross-region access alone is not a reason to prefer private endpoints for Key Vault.

## Review Notes
Azure CLI could not be validated locally because the `az` command is not installed in this workspace. Commands and parameters were checked against Microsoft Learn Azure CLI documentation instead. The Bicep resource uses API version `2023-07-01`, which remains documented, although newer API versions are available.
