# Validation Summary: How to Use Azure Database Migration Service to Migrate MongoDB to Cosmos DB

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Database Migration Service
- Azure Cosmos DB for MongoDB
- MongoDB replica sets and oplog
- Azure CLI
- MongoDB shell / mongosh
- Cosmos DB request units, partitioning, and indexing

## Sources Consulted
- Microsoft Learn: Tutorial: Migrate MongoDB to Azure Cosmos DB for MongoDB online using Azure Database Migration Service: https://learn.microsoft.com/azure/dms/tutorial-mongodb-cosmos-db-online
- Microsoft Learn: Tutorial: Migrate MongoDB to Azure Cosmos DB for MongoDB offline using Azure Database Migration Service: https://learn.microsoft.com/azure/dms/tutorial-mongodb-cosmos-db
- Microsoft Learn: Premigration steps for data migrations from MongoDB to Azure Cosmos DB for MongoDB: https://learn.microsoft.com/azure/cosmos-db/mongodb/pre-migration-steps
- Microsoft Learn: Azure CLI `az dms`: https://learn.microsoft.com/cli/azure/dms
- Microsoft Learn: Azure CLI `az dms project task`: https://learn.microsoft.com/cli/azure/dms/project/task
- Microsoft Learn: Azure CLI `az cosmosdb`: https://learn.microsoft.com/cli/azure/cosmosdb
- Microsoft Learn: Azure CLI `az cosmosdb mongodb collection`: https://learn.microsoft.com/cli/azure/cosmosdb/mongodb/collection
- Microsoft Learn: Supported features and syntax in Azure Cosmos DB for MongoDB 3.6, 4.0, 4.2, 5.0, and 6.0 server versions: https://learn.microsoft.com/azure/cosmos-db/mongodb/feature-support-36
- Microsoft Learn: Expire data with Azure Cosmos DB for MongoDB and per-document TTL: https://learn.microsoft.com/azure/cosmos-db/mongodb/time-to-live
- Microsoft Learn: Overview of indexing in Azure Cosmos DB: https://learn.microsoft.com/azure/cosmos-db/index-overview
- Microsoft Learn: Azure Cosmos DB for MongoDB FAQ: https://learn.microsoft.com/azure/cosmos-db/mongodb/faq

## Issues Found
- The prerequisites stated MongoDB 3.4 or later. Microsoft migration tooling support starts at MongoDB 3.2 for DMS-backed migrations to Azure Cosmos DB for MongoDB, so this was corrected to 3.2 or later.
- The post implied that a replica set is always required. This is specifically required for online migration because DMS uses the oplog for change tracking, so the prerequisite and preparation text were scoped to online migration.
- The post said DMS can create collections but will not set shard keys. Microsoft documentation says DMS collection settings can specify a shard key when creating target collections, so the warning was corrected to say either pre-create collections or specify the shard key in DMS.
- The partitioning explanation said every Cosmos DB collection is distributed. This was narrowed to say the shard key determines partitioning for scalable collections.
- The post claimed DMS can migrate indexes. I removed that unsupported claim and kept the guidance focused on Cosmos DB index support differences.
- The TTL index example used `createdAt`. Cosmos DB for MongoDB TTL indexes are based on the `_ts` timestamp field, so the example now creates the TTL index on `_ts`.
- The post said Cosmos DB has a 2 MB document limit versus MongoDB's 16 MB limit. Current Azure Cosmos DB for MongoDB API versions support up to 16 MB documents, with older-account caveats, so the post now reflects that.

## Review Notes
The Azure CLI syntax used in the post matches the current command references where checked. The `az` CLI was not installed locally, so command verification used Microsoft Learn CLI reference pages rather than local `--help` output.
