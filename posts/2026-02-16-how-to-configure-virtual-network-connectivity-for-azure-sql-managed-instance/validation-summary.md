# Validation Summary: How to Configure Virtual Network Connectivity for Azure SQL Managed Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Managed Instance
- Azure Virtual Network
- Azure subnets and subnet delegation
- Azure Network Security Groups
- Azure route tables and user-defined routes
- Azure VPN Gateway and ExpressRoute
- Azure App Service VNet integration
- Azure CLI
- Azure DNS and hybrid DNS resolution

## Sources Consulted
- Azure SQL Managed Instance connectivity architecture: https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/connectivity-architecture-overview
- Determine required subnet size and range for Azure SQL Managed Instance: https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/vnet-subnet-determine-size
- Service-aided subnet configuration for Azure SQL Managed Instance: https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/subnet-service-aided-configuration-enable
- Azure SQL Managed Instance connection types: https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/connection-types-overview
- Configure public endpoints in Azure SQL Managed Instance: https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/public-endpoint-configure
- Azure CLI reference for `az sql mi update`: https://learn.microsoft.com/en-us/cli/azure/sql/mi
- Azure CLI reference for `az network nsg rule create`: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Azure CLI reference for `az network route-table route create`: https://learn.microsoft.com/en-us/cli/azure/network/route-table/route
- Azure App Service VNet integration: https://learn.microsoft.com/en-us/azure/app-service/configure-vnet-integration-enable
- Azure service tags for NSGs and user-defined routes: https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview
- Azure DNS Private Resolver architecture: https://learn.microsoft.com/en-us/azure/architecture/networking/architecture/azure-dns-private-resolver

## Issues Found
- The post described the old pattern of manually creating required Managed Instance management NSG rules. Updated this to reflect service-aided subnet configuration and network intent policy, which automatically add and maintain mandatory service rules.
- The route table section suggested adding a `SqlManagement` route for management traffic in forced tunneling scenarios. Updated it to avoid overriding service-managed routes and to show a user-owned on-premises route example instead.
- The App Service subnet example reused a generic app subnet. Updated it to use a separate empty subnet delegated to `Microsoft.Web/serverFarms`, which is required for App Service VNet integration.
- The post used "private endpoint" for the default Managed Instance endpoint. Updated the language to "VNet-local endpoint" to avoid confusing the default endpoint with Azure Private Link private endpoints.
- The post recommended using a private IP address from on-premises. Updated connection guidance to use the VNet-local fully qualified domain name because the underlying IP address can change and direct IP connections are not the recommended pattern.
- The DNS section implied that on-premises DNS can simply forward to Azure DNS in all cases. Updated it to distinguish public `database.windows.net` name resolution from hybrid private DNS patterns that use Azure DNS Private Resolver or a DNS forwarder VM.
- Updated Azure CLI NSG examples to use the current documented plural parameters, such as `--source-address-prefixes` and `--destination-address-prefixes`.
- The public endpoint section omitted routing considerations when a default route points to an appliance. Added a note that public endpoint return traffic must route back to the internet.
- The subnet sizing guidance stated that Microsoft strongly recommends `/24`. Updated it to align with current documentation, which requires at least `/27` and recommends calculating the subnet size based on instance count, service tier, hardware configuration, and scaling needs.

## Review Notes
The Azure CLI executable was not installed in the local workspace, so CLI validation was performed against current Microsoft Learn Azure CLI reference pages instead of local `az --help` output.
