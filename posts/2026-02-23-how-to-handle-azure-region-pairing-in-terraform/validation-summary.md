# Validation Summary: How to Handle Azure Region Pairing in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Terraform AzureRM provider
- Azure regions and region pairing
- Azure Resource Groups
- Azure Storage (GRS, RA-GRS)
- Azure Virtual Networks and Global VNet peering
- Azure SQL Database / SQL Server (failover groups, active geo-replication)
- Azure Traffic Manager
- Azure Cosmos DB (mentioned in best practices)

## Sources Consulted
- Microsoft Learn: Azure paired regions / cross-region replication (https://learn.microsoft.com/en-us/azure/reliability/cross-region-replication-azure)
- Microsoft Learn: Azure Storage redundancy / GRS and RA-GRS (https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy)
- Microsoft Learn: Azure SQL Database failover groups (https://learn.microsoft.com/en-us/azure/azure-sql/database/auto-failover-group-overview)
- Microsoft Learn: Azure Traffic Manager monitoring configuration (https://learn.microsoft.com/en-us/azure/traffic-manager/traffic-manager-monitoring)
- Microsoft Learn: Azure Cosmos DB global distribution (https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- Terraform AzureRM provider docs: `azurerm_mssql_failover_group` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_failover_group)
- Terraform AzureRM provider docs: `azurerm_storage_account` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account)
- Terraform AzureRM provider docs: `azurerm_virtual_network_peering` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering)
- Terraform AzureRM provider docs: `azurerm_traffic_manager_profile` / `azurerm_traffic_manager_azure_endpoint`

## Issues Found
1. **Cosmos DB does not "leverage region pairing"** (Best Practices section). The original text said "GRS storage, Azure SQL failover groups, and Cosmos DB multi-region writes all leverage region pairing." Cosmos DB allows users to configure replication and multi-region writes across any combination of Azure regions and has no built-in dependency on Azure's region-pair mapping (unlike GRS storage, which always replicates to the paired region). Reworded that paragraph to clarify that GRS storage and SQL failover groups make use of paired regions automatically/by recommendation, while Cosmos DB lets you choose any regions and should be manually configured to use your paired region for consistency with the rest of the DR setup.

## Review Notes
- The Azure region pairs map matches Microsoft's published pairings as of the current Microsoft Learn documentation, including the asymmetric pairs: `westus3 → eastus` (East US itself pairs with West US) and `brazilsouth → southcentralus` (the cross-geography exception). These asymmetric pairings are intentional and accurate.
- Newer Azure regions that do not have a paired region (e.g., Qatar Central, Italy North, Poland Central, Sweden Central, Israel Central, Spain Central) are correctly omitted from the map. Microsoft has been steering newer regions toward availability-zone-based resiliency instead of pairs.
- Terraform `azurerm_mssql_failover_group` resource: the attributes used (`server_id`, `databases`, `partner_server.id`, `read_write_endpoint_failover_policy.mode = "Automatic"`, `grace_minutes = 60`, and the top-level `readonly_endpoint_failover_policy_enabled` boolean) are all valid for current azurerm provider v3.x/v4.x.
- Traffic Manager `monitor_config` values used (`interval_in_seconds = 30`, `timeout_in_seconds = 10`, `tolerated_number_of_failures = 3`, HTTPS on port 443) are all within the allowed ranges and use the default cadence (not "fast monitoring" which requires interval 10).
- Storage account names produced by the templates (`stwebappprod`, `stwebappprodra`) satisfy the 3–24 character lowercase alphanumeric constraint when `workload = "webapp"`.
- `azurerm_linux_web_app` resources referenced by the Traffic Manager example are not defined in the snippet — this is fine for illustration but readers will need to create them separately.
- The post is technically aligned with Microsoft's region-pair documentation. Note for future updates: Microsoft has retired some of the formal region-pair messaging and is recommending availability zones as the primary resiliency story. The region-pair concept is still real and still used by services like GRS storage, but consumers reading this in 12+ months may want to weigh AZ-based designs alongside region-pair-based DR.
