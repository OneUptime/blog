# Validation Summary: How to Create Azure Cosmos DB in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB for MongoDB
- Azure Resource Manager networking and firewall configuration

## Sources Consulted
- HashiCorp AzureRM provider v3.80.0 documentation for `azurerm_cosmosdb_account`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/cosmosdb_account.html.markdown
- HashiCorp AzureRM provider v3.80.0 documentation for `azurerm_cosmosdb_sql_database`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/cosmosdb_sql_database.html.markdown
- HashiCorp AzureRM provider v3.80.0 documentation for `azurerm_cosmosdb_sql_container`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/cosmosdb_sql_container.html.markdown
- HashiCorp AzureRM provider v3.80.0 documentation for `azurerm_cosmosdb_mongo_collection`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/v3.80.0/website/docs/r/cosmosdb_mongo_collection.html.markdown
- Microsoft Learn, Configure IP firewall for Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-configure-firewall
- Microsoft Learn, Consistency levels in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels
- Microsoft Learn, Introduction to provisioned throughput in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/set-throughput
- Microsoft Learn, Unique key constraints in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/unique-keys
- Microsoft Learn, Hierarchical partition keys in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/hierarchical-partition-keys

## Issues Found
- The Cosmos DB account example used legacy Azure portal middleware IP addresses in `ip_range_filter`. Updated the list to the current Azure Public "All" middleware IPs documented for API for NoSQL portal access.
- The SQL container example said `partition_key_version = 2` is for hierarchical partition keys. In AzureRM v3.80.0 this setting is documented for large partition keys; hierarchical partition keys require multiple partition key paths with `MultiHash` in supported APIs. Updated the comment.
- The unique key comment did not mention scope. Azure Cosmos DB unique keys are enforced within a logical partition, so the comment now states that scope.
- The composite index example used lowercase `ascending` and `descending`. AzureRM v3.80.0 documents `Ascending` and `Descending`, so the values were corrected.
- The consistency section said strong consistency only works within a single region. Microsoft documentation allows strong consistency in some multi-region, single-write configurations, but not with multiple write regions and with distance-related latency limits. Updated the description.

## Review Notes
The article pins AzureRM to `~> 3.80`, so the examples were reviewed against the v3.80.0 provider documentation rather than rewritten for the current v4 provider argument names.
