# Validation Summary: How to Fix Azure Storage Account Firewall Rules Blocking Application Access

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- Azure Storage Accounts
- Azure Storage firewall and virtual network rules
- Azure CLI
- Azure App Service VNet integration
- Azure Functions networking
- Azure Private Endpoint and Private DNS
- Azure Kubernetes Service networking
- Azurite

## Sources Consulted
- Microsoft Learn: Azure Storage firewall rules - https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security
- Microsoft Learn: Guidelines and limitations for the Azure Storage firewall - https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security-limitations
- Microsoft Learn: Use private endpoints for Azure Storage - https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- Microsoft Learn: Trusted Azure services for Azure Storage network security - https://learn.microsoft.com/en-gb/azure/storage/common/storage-network-security-trusted-azure-services
- Microsoft Learn: Enable virtual network integration in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-vnet-integration-enable
- Microsoft Learn: Configure virtual network integration routing in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-vnet-integration-routing
- Microsoft Learn: How to use a secured storage account with Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/configure-networking-how-to
- Microsoft Learn Azure CLI reference: az storage account network-rule - https://learn.microsoft.com/en-us/cli/azure/storage/account/network-rule
- Microsoft Learn Azure CLI reference: az functionapp config - https://learn.microsoft.com/en-us/cli/azure/functionapp/config
- Microsoft Learn Azure CLI reference: az storage logging - https://learn.microsoft.com/en-us/cli/azure/storage/logging
- Microsoft Learn Azure CLI reference: az network private-endpoint dns-zone-group - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group

## Issues Found
- The App Service service endpoint example did not explicitly route all outbound traffic through VNet integration. Added the current `az resource update --set properties.outboundVnetRouting.allTraffic=true` command so traffic to the storage public endpoint is routed through the integrated subnet.
- The Azure Functions example used the legacy `WEBSITE_VNET_ROUTE_ALL=1` app setting. Replaced it with the current site property configuration through `az resource update`, and added content share routing for Function Apps that use Azure Files.
- The AKS example used `--resource-group-for-vnet`, which is not a valid `az storage account network-rule add` option. Replaced it with a subnet resource ID, which Microsoft documents as the supported approach when the subnet is in another resource group.
- The trusted services list included outdated or imprecise names. Updated the list to match current Microsoft documentation, including Azure Monitor, Azure networking services, Azure Synapse Analytics, and Azure SQL Database / Azure SQL Servers.
- The claim that "The Azure portal always works" was too broad. Replaced it with the documented distinction that storage firewall rules apply to data plane operations, while control plane operations are not subject to those firewall restrictions.

## Review Notes
The local environment did not have the Azure CLI installed, so command verification was performed against official Microsoft Learn Azure CLI reference pages instead of local `az --help` output.
