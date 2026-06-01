# Validation Summary: How to Create Azure Private Endpoints for PaaS Services with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Private Link and Private Endpoints
- Azure Private DNS Zones
- Azure Virtual Network and subnet configuration
- Azure Storage
- Azure SQL Database logical servers
- Azure Key Vault

## Sources Consulted
- Azure Private Endpoint overview: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview
- Azure Private Endpoint private DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Manage network policies for private endpoints: https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy
- Azure SQL private endpoint tutorial: https://learn.microsoft.com/en-us/azure/private-link/tutorial-private-endpoint-sql-cli
- Azure Storage account naming rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Azure SQL Database quickstart and server naming guidance: https://learn.microsoft.com/en-us/azure/azure-sql/database/single-database-create-quickstart
- Azure Key Vault naming guidance: https://learn.microsoft.com/en-us/azure/key-vault/general/quick-create-cli
- Terraform AzureRM `azurerm_private_endpoint` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- Terraform AzureRM `azurerm_subnet` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- Terraform AzureRM `azurerm_private_dns_zone` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone

## Issues Found
- The post said clients without Private DNS Zones would resolve the public IP and route through the internet. Azure public DNS uses a CNAME chain for Private Link names, and the key issue is that clients do not resolve to the private endpoint IP unless DNS is overridden with a private DNS zone or equivalent DNS configuration. I changed the wording to say clients resolve through public DNS to the public endpoint and may be blocked when public network access is disabled.
- The post said Private Endpoints need a dedicated subnet and that the subnet must have `privateEndpointNetworkPolicies` configured. Azure supports multiple private endpoints in the same or different subnets, and network policies are disabled by default unless NSG or user-defined route processing is needed for private endpoints. I changed the text to describe dedicated subnets as a common operational choice and changed the Terraform example to `private_endpoint_network_policies = "Disabled"`.
- The Storage Account, Azure SQL logical server, and Key Vault examples used fixed names that can fail because those names must be unique across Azure. I added comments warning readers to replace them with globally unique names.

## Review Notes
The Private DNS zone names and subresource names for Storage blob, Azure SQL Database, and Key Vault match Microsoft documentation. The reusable module is valid for the shown service types, but a production module should usually allow passing existing Private DNS zone IDs to avoid duplicate-zone conflicts when creating multiple endpoints for the same service type. The local environment did not have the Terraform CLI installed, so the snippets were reviewed against official Terraform AzureRM provider documentation rather than executed with `terraform validate`.
