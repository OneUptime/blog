# Validation Summary: How to Create Azure Cosmos DB with SQL API Using OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Cosmos DB
- Azure Cosmos DB SQL API / API for NoSQL
- OpenTofu
- HashiCorp AzureRM provider
- HCL

## Sources Consulted
- AzureRM provider `azurerm_cosmosdb_account` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cosmosdb_account.html.markdown
- AzureRM provider `azurerm_cosmosdb_sql_database` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cosmosdb_sql_database.html.markdown
- AzureRM provider `azurerm_cosmosdb_sql_container` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/cosmosdb_sql_container.html.markdown
- Microsoft Learn: Create and manage Azure Cosmos DB resources with Terraform: https://learn.microsoft.com/en-us/azure/cosmos-db/manage-with-terraform
- Microsoft Learn: How to choose between provisioned throughput and serverless: https://learn.microsoft.com/en-us/azure/cosmos-db/throughput-serverless
- Microsoft Learn: Introduction to provisioned throughput in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/set-throughput
- Microsoft Learn: Configure time to live in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-time-to-live
- Microsoft Learn: Indexing policies in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/index-policy

## Issues Found
- The account example enabled the `EnableServerless` capability while also configuring multi-region geo-replication and database-level provisioned throughput. Azure Cosmos DB serverless accounts are single-region and the AzureRM SQL database resource docs explicitly say not to set `throughput` when the account uses `EnableServerless`. I removed the serverless capability block so the example is internally consistent.
- The `consistency_policy` block set `max_interval_in_seconds` and `max_staleness_prefix` while using `consistency_level = "Session"`. In the current AzureRM provider docs, those settings are for `BoundedStaleness`. I removed them from the example.
- The SQL container examples used `partition_key_path`, but the current AzureRM provider resource uses `partition_key_paths` as a required list. I updated both container examples to use `partition_key_paths = ["/..."]`.
- The TTL explanation said `default_ttl = -1` disables TTL. Current provider and Microsoft Learn TTL docs say omitted/null disables TTL, while `-1` keeps TTL enabled with no default expiration. I corrected the comment.
- The `is_virtual_network_filter_enabled = false` line was incorrectly labeled as enabling server-side encryption. That setting controls virtual network filtering, not encryption. I corrected the comment.
- The outputs example referenced `azurerm_cosmosdb_account.cosmos.connection_strings`, which is not listed as an exported attribute in the current provider docs. I replaced it with an object built from the documented SQL connection string attributes.

## Review Notes
- Microsoft’s current product docs mostly use the name "API for NoSQL" for this Azure Cosmos DB API, though "SQL API" still appears in some official references and remains a recognizable label for this account kind.
- The examples still assume a separately defined `azurerm_resource_group` and provider configuration elsewhere in the OpenTofu project, which is consistent with the post’s scope.
