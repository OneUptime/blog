# Validation Summary: How to Configure Azure Storage Account Network Security with Service Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage accounts
- Azure Storage firewall and network rules
- Azure Virtual Network service endpoints
- Azure Private Endpoints / Private Link
- Azure CLI
- ARM templates
- Terraform AzureRM provider
- Azure App Service / Azure Functions VNet integration

## Sources Consulted
- Microsoft Learn: Azure Storage firewall rules - https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security
- Microsoft Learn: Set the default public network access rule for an Azure Storage account - https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security-set-default-access
- Microsoft Learn: Manage network security exceptions for Azure Storage - https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security-manage-exceptions
- Microsoft Learn: Trusted Azure services for Azure Storage network security - https://learn.microsoft.com/en-gb/azure/storage/common/storage-network-security-trusted-azure-services
- Microsoft Learn: Azure virtual network service endpoints - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview
- Microsoft Learn: Use private endpoints for Azure Storage - https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- Microsoft Learn: Azure CLI `az storage account network-rule` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account/network-rule
- Microsoft Learn: Azure CLI `az storage account update` reference - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Microsoft.Storage/storageAccounts 2023-01-01 ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.storage/2023-01-01/storageaccounts
- HashiCorp Terraform Registry: `azurerm_storage_account` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Microsoft Learn: Inbound and outbound IP addresses in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/overview-inbound-outbound-ips
- Microsoft Learn: Integrate your app with an Azure virtual network - https://learn.microsoft.com/en-us/azure/app-service/overview-vnet-integration
- Microsoft Learn: Common REST API error codes for Azure Storage - https://learn.microsoft.com/en-us/rest/api/storageservices/common-rest-api-error-codes

## Issues Found
- The request flow diagram showed invalid credentials returning `401 Unauthorized`. Azure Storage commonly reports authentication and authorization failures as `403 Forbidden`, so the diagram was corrected to `403 Forbidden`.
- The example for adding a subnet from a different VNet said "if peered". VNet peering is not required for Azure Storage virtual network rules. The text was changed to a same-resource-group VNet example, and a subnet resource ID example was added for subnets in another resource group.
- The trusted services list was incomplete and included the outdated "Azure SQL Data Warehouse" naming. The list was updated to describe the list as limited to specific services and operations, add currently documented examples, and use "Azure SQL Database and Azure Synapse Analytics".
- The service endpoints vs. private endpoints table described service endpoint cross-region support as only "Limited". The table now notes same/paired-region behavior for `Microsoft.Storage` and any-region support with `Microsoft.Storage.Global`.
- The service endpoint traffic path said "public IP", which could be misread as client public-IP allowlisting. It now says traffic goes over the Azure backbone to the public service endpoint.
- The portal troubleshooting advice referenced an "Allow access from Azure Portal" option. It was corrected to adding the browser's public IP or using the Portal option to add the current client IP address.
- The App Service / Azure Functions troubleshooting section tied the issue specifically to shared plans and then recommended VNet integration. Since VNet integration requires supported plans and outbound IP behavior varies by plan, the wording now refers to unstable outbound networking and calls out supported plans.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against Microsoft Learn command reference instead of local `az --help`. The ARM template uses an older but still valid `2023-01-01` Storage API version; future posts could use the latest API version if no compatibility constraint exists.
