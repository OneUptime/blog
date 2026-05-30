# Validation Summary: How to Set Up Azure Private Link for Azure SQL Database to Eliminate Public

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Private Link
- Azure SQL Database
- Azure Private Endpoint
- Azure Private DNS Zones
- Azure DNS Private Resolver
- Azure CLI
- Azure Monitor metric alerts
- Terraform AzureRM provider

## Sources Consulted
- Microsoft Learn: Azure Private Link for Azure SQL Database and Azure Synapse Analytics: https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview
- Microsoft Learn: Azure SQL Database network access controls: https://learn.microsoft.com/en-us/azure/azure-sql/database/network-access-controls-overview
- Microsoft Learn: Azure SQL Database connectivity settings: https://learn.microsoft.com/en-us/azure/azure-sql/database/connectivity-settings
- Microsoft Learn: Tutorial, connect to an Azure SQL server using an Azure Private Endpoint with Azure CLI: https://learn.microsoft.com/en-us/azure/private-link/tutorial-private-endpoint-sql-cli
- Microsoft Learn: Private endpoint DNS configuration and zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Private endpoint DNS integration scenarios: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration
- Microsoft Learn: Azure DNS Private Resolver inbound endpoint CLI: https://learn.microsoft.com/en-us/cli/azure/dns-resolver/inbound-endpoint
- Microsoft Learn: Azure CLI private endpoint DNS zone group: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: Azure CLI SQL server commands: https://learn.microsoft.com/en-us/cli/azure/sql/server
- Microsoft Learn: Monitor Azure SQL Database with metrics and alerts: https://learn.microsoft.com/en-us/azure/azure-sql/database/monitoring-metrics-alerts
- Microsoft Learn: Supported Azure Monitor metrics for Microsoft.Sql/servers/databases: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-sql-servers-databases-metrics
- Terraform Registry: azurerm_private_endpoint: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- Terraform Registry: azurerm_mssql_server: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server

## Issues Found
- The post said DNS resolution from outside the VNet returns the private IP. Updated this to clarify that linked VNets resolve the server name to the private endpoint IP, while public endpoint connections are denied after public network access is disabled.
- The prerequisites said the subnet must not have a `Microsoft.Sql` service endpoint. Updated this to migration guidance, because Private Link setup does not require that absolute prerequisite.
- The private endpoint creation step said to create the private endpoint in the same region as the SQL Database. Updated it to the same region as the virtual network, matching Azure private endpoint regional requirements.
- The private endpoint verification command claimed to verify `Approved` state but did not query connection status. Added `privateLinkServiceConnections[0].privateLinkServiceConnectionState.status` to the query and updated the explanation.
- The on-premises DNS option incorrectly suggested forwarding directly to Azure DNS at `168.63.129.16` over VPN or ExpressRoute. Updated it to forward to an Azure-based DNS forwarder that then forwards to Azure DNS.
- The Azure Monitor metric alert used a server scope and average aggregation for `connection_failed`. Updated the scope to a database resource ID and used `total connection_failed > 0`, matching the documented database metric and supported aggregation.
- The auditing note implied Azure SQL auditing directly distinguishes private endpoint versus public endpoint traffic. Updated it to say auditing can track connection activity and source IPs.

## Review Notes
Azure CLI was not installed in the local workspace, so command validation was performed against current Microsoft Learn CLI reference pages instead of local `az --help` output. The Terraform snippet matches the AzureRM resource arguments reviewed, but it remains partial because prerequisite resources such as the resource group, subnet, VNet, and SQL server settings are intentionally elided in the post.
