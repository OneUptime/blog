# Validation Summary: How to Connect to Azure Cosmos DB Using the MongoDB API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cosmos DB for MongoDB
- Azure CLI
- MongoDB connection strings and tools
- Mongoose / Node.js
- PyMongo / Python
- MongoDB Java Driver
- MongoDB .NET Driver

## Sources Consulted
- Microsoft Learn: Azure CLI `az cosmosdb create` reference, https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Microsoft Learn: Azure CLI `az cosmosdb keys list` reference, https://learn.microsoft.com/en-us/cli/azure/cosmosdb/keys
- Microsoft Learn: Connect a MongoDB application to Azure Cosmos DB, https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/connect-account
- Microsoft Learn: Supported features and syntax in Azure Cosmos DB for MongoDB 4.2, https://learn.microsoft.com/en-ca/azure/cosmos-db/mongodb/feature-support-42
- Microsoft Learn: Create a collection in Azure Cosmos DB for MongoDB, https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/how-to-create-container
- Microsoft Learn: Find request unit charge for Azure Cosmos DB for MongoDB operations, https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/find-request-unit-charge
- Microsoft Learn: Change streams in Azure Cosmos DB for MongoDB, https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/change-streams
- Mongoose documentation: Connecting to MongoDB, https://mongoosejs.com/docs/connections.html
- MongoDB Docs: Node.js driver connection options, https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- MongoDB Docs: Java driver MongoClientSettings, https://www.mongodb.com/docs/drivers/java/sync/v5.2/connection/mongoclientsettings/
- MongoDB Docs: .NET/C# driver connection options, https://www.mongodb.com/docs/drivers/csharp/current/connect/connection-options/
- PyMongo documentation: MongoClient options, https://pymongo.readthedocs.io/en/4.10.0/api/pymongo/mongo_client.html

## Issues Found
- Updated the listed Cosmos DB for MongoDB server versions. The post only listed 3.6, 4.0, and 4.2, but current Azure CLI documentation lists 3.2, 3.6, 4.0, 4.2, 5.0, 6.0, and 7.0.
- Removed the portal recommendation to use server version 4.2. The best version depends on application compatibility and feature requirements.
- Clarified `retrywrites=false`. Current Cosmos DB for MongoDB documentation supports enabling retryable writes through an account capability, so disabling retryable writes is no longer universally required.
- Replaced `shardCollection` examples with the Cosmos DB `CreateCollection` extension command using `shardKey`. Azure Cosmos DB manages sharding automatically and requires the shard key when creating the collection rather than through MongoDB manual sharding commands.
- Removed hashed shard key syntax from examples. Cosmos DB collection creation uses a shard key path such as `customerId`, not `{ customerId: "hashed" }` in the `shardCollection` command shown by the post.
- Corrected the feature support list. Text indexes, 2d indexes, and the `$text` operator are not supported in Azure Cosmos DB for MongoDB 4.2, 2dsphere indexes are supported, and transactions are limited to a single non-sharded collection.
- Replaced the `explain("executionStats")` RU-cost guidance with `getLastRequestStatistics`, which is the documented command for retrieving request charge in Azure Cosmos DB for MongoDB.

## Review Notes
The driver examples use current official MongoDB driver configuration options and are reasonable snippets for connecting to a Cosmos DB for MongoDB account. Change streams are supported, but Microsoft documents limitations such as no delete event support and required `$match`, `$project`, and `fullDocument` options for the shown pattern.
