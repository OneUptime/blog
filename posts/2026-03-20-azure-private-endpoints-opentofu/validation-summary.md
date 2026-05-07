# Validation Summary: How to Configure Azure Private Endpoints with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- Azure Private Endpoint
- Azure Private Link
- Azure Virtual Network (VNet)
- Azure Private DNS
- Azure Storage Account
- Azure SQL Database / Azure SQL Server
- Azure Key Vault
- AzureRM provider

## Sources Consulted
- Azure Private Endpoint overview: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview
- Azure Private Endpoint DNS integration scenarios: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration
- Azure Private Endpoint private DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Manage network policies for private endpoints: https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy
- Azure Cosmos DB Private Link configuration: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-configure-private-endpoints
- Azure Container Registry private link and DNS configuration: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-link
- AzureRM `azurerm_subnet` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- AzureRM `azurerm_storage_account` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM `azurerm_mssql_server` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- AzureRM `azurerm_key_vault` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- AzureRM `azurerm_private_endpoint` resource docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint

## Issues Found
- The dedicated subnet example used the deprecated and removed AzureRM argument `private_endpoint_network_policies_enabled`. I changed it to the current AzureRM v4 syntax, `private_endpoint_network_policies = "Disabled"`, which matches current provider documentation and keeps the example valid for modern OpenTofu/Terraform AzureRM usage.
- The DNS guidance incorrectly implied that traffic still flows privately when the private DNS zone is missing. I corrected the wording to match Azure documentation: without private DNS zone integration or equivalent DNS configuration, the service FQDN resolves to the public endpoint instead of the private IP.
- The public-access guidance was made explicit to match Azure Private Endpoint behavior: private endpoints provide private connectivity, but they do not automatically disable public network access on the target service.
- The generic `cosmosdb` DNS-zone example was too broad. I renamed it to `cosmosdb_nosql` because `privatelink.documents.azure.com` applies to the Azure Cosmos DB NoSQL/SQL API, while other Cosmos DB APIs use different private DNS zones.
- The VNet-link guidance was tightened to reflect Azure Private DNS behavior accurately: VNets without the zone link will not resolve the private IP through Azure Private DNS and typically fall back to the public endpoint unless another DNS design is in place.

## Review Notes
- The post is technically sound after the fixes above.
- Some Azure services have API-specific or endpoint-specific DNS nuances beyond this article's examples. In particular, Azure Cosmos DB uses different private DNS zones for different APIs, and Azure Container Registry can require additional private DNS records for data endpoints.
