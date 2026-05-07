# Validation Summary: How to Create Azure Cosmos DB with MongoDB API Using OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cosmos DB
- Azure Cosmos DB for MongoDB
- MongoDB API
- OpenTofu
- AzureRM provider
- HCL

## Sources Consulted
- HashiCorp AzureRM provider: `azurerm_cosmosdb_account` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_account
- HashiCorp AzureRM provider: `azurerm_cosmosdb_mongo_database` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_mongo_database
- HashiCorp AzureRM provider: `azurerm_cosmosdb_mongo_collection` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_mongo_collection
- HashiCorp AzureRM 4.0 upgrade guide - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- Azure Cosmos DB for MongoDB overview - https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/overview
- Provision throughput in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/set-throughput
- Manage indexing in Azure Cosmos DB for MongoDB - https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/indexing
- Expire data with Azure Cosmos DB for MongoDB and per-document TTL - https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/time-to-live

## Issues Found
- The account example mixed `mongo_server_version = "4.2"` with the `MongoDBv3.4` capability. I removed the `MongoDBv3.4` capability because it is specific to the older 3.4 API and conflicts with the stated 4.2 server version.
- The output example used `azurerm_cosmosdb_account.mongodb.connection_strings[0]`, which is a deprecated/removed pattern in current AzureRM v4 documentation. I changed it to `azurerm_cosmosdb_account.mongodb.primary_mongodb_connection_string`.
- The `users` and `products` collection examples defined unique indexes on sharded collections without including the shard key. I changed those to compound unique indexes with the shard key first, which matches Azure Cosmos DB for MongoDB indexing requirements for sharded collections.
- The summary described Cosmos DB for MongoDB as a drop-in replacement that only needs a connection string change. I revised that claim to match Microsoft guidance that compatibility is often achievable with minimal changes, but still depends on the selected server version and supported feature set.

## Review Notes
- The post is technically relevant and salvageable; it has been validated after the corrections above.
- `mongo_server_version = "4.2"` is still supported by the current AzureRM provider, although newer MongoDB API server versions are also available.
