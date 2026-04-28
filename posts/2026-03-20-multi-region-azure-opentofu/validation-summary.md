# Validation Summary: How to Build a Multi-Region Architecture with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform)
- AzureRM provider (v4.x)
- Azure Cosmos DB (multi-region writes / multi-master)
- Azure Traffic Manager (Performance routing)
- Azure App Service
- Azure Resource Groups / multi-region deployment patterns

## Sources Consulted
- AzureRM Terraform provider docs: `azurerm_cosmosdb_account` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_account)
- AzureRM Terraform provider docs: `azurerm_traffic_manager_profile` and `azurerm_traffic_manager_azure_endpoint`
- Azure Cosmos DB consistency levels documentation (Bounded Staleness `max_interval_in_seconds` 5–86400, `max_staleness_prefix` 10–2147483647)
- Azure Traffic Manager routing methods documentation (Performance, Priority, Weighted, Geographic, Subnet, MultiValue)
- Azure cross-region replication / paired regions documentation (https://learn.microsoft.com/en-us/azure/reliability/cross-region-replication-azure)
- Terraform `provider` aliases / multi-provider configuration documentation

## Issues Found
- **Incorrect Azure region pair example.** The Summary stated "Azure paired regions (like East US / West Europe)". East US and West Europe are not an Azure region pair — East US is paired with West US, and West Europe is paired with North Europe. Updated the example to use real region pairs.
- **Inaccurate description of paired-region behavior.** The Summary claimed paired regions "ensure Azure-managed failover during planned maintenance events." Azure paired regions actually provide sequential (staggered) platform maintenance so both regions in a pair are not updated simultaneously; they do not perform automatic application failover. Reworded to reflect the actual benefit.

## Review Notes
- The post uses current AzureRM v4.x attribute names (`multiple_write_locations_enabled`, `automatic_failover_enabled`). Older v3.x used `enable_multiple_write_locations` / `enable_automatic_failover`. If a reader is pinned to v3.x they will need the older names.
- The provider blocks define only aliased providers (`primary`, `secondary`) with no default `azurerm` provider. Several resources in the post (e.g., `azurerm_cosmosdb_account.global`, the Traffic Manager resources) do not specify a `provider = azurerm.<alias>` argument. As a complete config this would fail because no default provider is configured. The snippets are presented as illustrative excerpts rather than a runnable end-to-end module, so this was left as-is, but readers will need to either define a default provider or annotate every resource with an explicit provider alias.
- `is_virtual_network_filter_enabled = false` is the default value on `azurerm_cosmosdb_account` and is not strictly required.
- The Cosmos DB Bounded Staleness values (`max_interval_in_seconds = 300`, `max_staleness_prefix = 100000`) are within the documented allowed ranges.
- Traffic Manager `tolerated_number_of_failures = 3` and `interval_in_seconds = 30` / `timeout_in_seconds = 10` are within the documented valid ranges.
- The `./modules/app-service` module is referenced but not shown; readers will need to author or supply that module themselves.
