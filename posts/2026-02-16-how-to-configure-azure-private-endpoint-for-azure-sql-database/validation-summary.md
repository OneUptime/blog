# Validation Summary: How to Configure Azure Private Endpoint for Azure SQL Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Private Endpoint
- Azure Private Link
- Azure SQL Database
- Azure CLI
- Azure Private DNS Zones
- Azure DNS Private Resolver
- ExpressRoute and VPN hybrid connectivity

## Sources Consulted
- Microsoft Learn: Tutorial - Connect to an Azure SQL server using an Azure Private Endpoint using Azure CLI: https://learn.microsoft.com/en-us/azure/private-link/tutorial-private-endpoint-sql-cli
- Microsoft Learn: Azure Private Link for Azure SQL Database and Azure Synapse Analytics: https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview
- Microsoft Learn: Azure Private Endpoint private DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure Private Endpoint DNS integration scenarios: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration
- Microsoft Learn: Azure CLI `az network private-endpoint`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Microsoft Learn: Azure CLI `az sql server`: https://learn.microsoft.com/en-us/cli/azure/sql/server
- Microsoft Azure: Azure Private Link pricing: https://azure.microsoft.com/en-us/pricing/details/private-link/

## Issues Found
- The `az sql server update` command used `--public-network-access Disabled`, but current Azure CLI documentation for `az sql server update` does not list that option. Changed it to `--set publicNetworkAccess="Disabled"`, which matches Microsoft documentation for disabling public network access on an Azure SQL logical server.
- The hybrid DNS section said to forward `privatelink.database.windows.net` from on-premises DNS. Microsoft Private Endpoint DNS guidance says conditional forwarding should be made to the public zone, such as `database.windows.net`, so the original server FQDN can resolve through the private DNS setup. Updated the section accordingly.
- The troubleshooting section said a `Microsoft.Sql` service endpoint can conflict with Private Endpoint. Microsoft documentation does not support that as a general Private Endpoint troubleshooting rule. Replaced it with checks for NSGs, route tables, Azure SQL ports/connection policy, and Private Endpoint approval.

## Review Notes
- The Azure Private DNS zone name, Azure SQL subresource/group ID, Private Endpoint create command, DNS zone group command, FQDN-based connection guidance, public access behavior, peered VNet DNS linking, and Private Link pricing model were consistent with official Microsoft documentation.
