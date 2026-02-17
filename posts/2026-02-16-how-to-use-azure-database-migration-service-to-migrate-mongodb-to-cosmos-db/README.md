# How to Use Azure Database Migration Service to Migrate MongoDB to Cosmos DB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MongoDB, Cosmos DB, Database Migration, DMS, Azure Database Migration Service, NoSQL

Description: A step-by-step guide to migrating MongoDB databases to Azure Cosmos DB for MongoDB using Azure Database Migration Service.

---

If you are running MongoDB on-premises or in a VM and want to move to a fully managed service, Azure Cosmos DB for MongoDB is a natural target. It provides MongoDB wire protocol compatibility, which means your application connects to Cosmos DB using the same MongoDB drivers and connection strings (with minor adjustments). Azure Database Migration Service handles the data migration, including online migration with continuous sync for minimal downtime.

## Why Cosmos DB for MongoDB?

Azure Cosmos DB for MongoDB gives you several advantages over self-managed MongoDB:

- **Global distribution**: Replicate data to any Azure region with a few clicks.
- **Guaranteed SLAs**: 99.999% availability SLA for multi-region deployments.
- **Elastic scale**: Auto-scale throughput based on demand.
- **No server management**: No OS patching, no replica set management, no backup configuration.
- **MongoDB compatibility**: Use existing MongoDB drivers, tools, and queries.

The tradeoff is cost and some feature limitations. Not every MongoDB feature is supported in Cosmos DB's MongoDB API (e.g., some aggregation pipeline stages, certain index types). Assess compatibility before committing.

## Prerequisites

- A source MongoDB instance (3.4 or later, standalone or replica set)
- An Azure Cosmos DB for MongoDB account
- Azure Database Migration Service (Premium tier for online migration)
- Network connectivity between the source MongoDB and Azure
- The source MongoDB must be a replica set (even for standalone, you need to convert it)

## Step 1: Prepare the Source MongoDB

DMS requires the source MongoDB to be configured as a replica set. This is because DMS reads the oplog (operation log) for change tracking during online migration. If your MongoDB is standalone, you need to convert it to a single-node replica set.

```bash
# If running standalone MongoDB, convert to a replica set
# Edit mongod.conf and add:
# replication:
#   replSetName: "rs0"

# Restart MongoDB
sudo systemctl restart mongod

# Initialize the replica set from the mongo shell
mongosh --eval 'rs.initiate({_id: "rs0", members: [{_id: 0, host: "localhost:27017"}]})'

# Verify replica set status
mongosh --eval 'rs.status()'
```

Also verify that the migration user has the necessary permissions:

```javascript
// Create a migration user with read access to source databases
// and read access to the oplog
use admin
db.createUser({
    user: "dms_migration",
    pwd: "secure-password-here",
    roles: [
        { role: "readAnyDatabase", db: "admin" },
        { role: "read", db: "local" }  // Required for oplog access
    ]
})
```

## Step 2: Create the Cosmos DB Target

Create an Azure Cosmos DB for MongoDB account. Choose the right API version and throughput model.

```bash
# Create a Cosmos DB account with MongoDB API
az cosmosdb create \
  --name my-cosmos-mongodb \
  --resource-group rg-mongo-migration \
  --kind MongoDB \
  --server-version 4.2 \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=true

# Create the target database
az cosmosdb mongodb database create \
  --account-name my-cosmos-mongodb \
  --resource-group rg-mongo-migration \
  --name myappdb

# Create collections with the appropriate shard keys
# The shard key is critical for performance - choose wisely
az cosmosdb mongodb collection create \
  --account-name my-cosmos-mongodb \
  --resource-group rg-mongo-migration \
  --database-name myappdb \
  --name users \
  --shard "userId" \
  --throughput 10000

az cosmosdb mongodb collection create \
  --account-name my-cosmos-mongodb \
  --resource-group rg-mongo-migration \
  --name orders \
  --database-name myappdb \
  --shard "customerId" \
  --throughput 10000
```

**Important**: Pre-create collections with shard keys before migration. DMS can create collections automatically, but it will not set shard keys, which means your data will be on a single partition - terrible for performance at scale.

## Step 3: Plan Your Shard Keys

Choosing the right shard key is probably the most important decision in this migration. In self-managed MongoDB, you might have been running without sharding. In Cosmos DB, every collection is distributed, and the shard key determines how data is partitioned.

Good shard keys have:
- High cardinality (many unique values)
- Even distribution of data and operations
- Frequently used in query filters

```javascript
// Example: For a users collection
// Good shard key: userId (high cardinality, used in most queries)
// Bad shard key: country (low cardinality, creates hot partitions)

// Example: For an orders collection
// Good shard key: customerId (distributes orders across customers)
// Bad shard key: orderDate (recent dates become hot partitions)
```

## Step 4: Set Up Azure Database Migration Service

```bash
# Create a DMS instance with Premium tier (required for online migration)
az dms create \
  --name dms-mongo-to-cosmos \
  --resource-group rg-mongo-migration \
  --location eastus \
  --sku-name Premium_4vCores \
  --subnet "/subscriptions/<sub-id>/resourceGroups/rg-mongo-migration/providers/Microsoft.Network/virtualNetworks/vnet-migration/subnets/snet-dms"
```

## Step 5: Configure and Run the Migration

**Using the Azure Portal** (recommended for MongoDB migrations):

1. Navigate to the DMS instance.
2. Click "New Migration Activity".
3. Select source type "MongoDB" and target type "Cosmos DB (MongoDB API)".
4. Configure the source connection:
   - Connection string: `mongodb://dms_migration:password@source-host:27017/?authSource=admin&replicaSet=rs0`
   - SSL: Enable if your source uses TLS
5. Configure the target connection:
   - Use the Cosmos DB connection string from the Azure Portal
6. Select the databases and collections to migrate.
7. Map source collections to target collections.
8. Choose migration type: Online (continuous sync) or Offline (one-time copy).
9. Start the migration.

For the source connection string, make sure to include:
- The replica set name (`replicaSet=rs0`)
- The authentication database (`authSource=admin`)
- SSL settings if applicable

## Step 6: Pre-Provision Throughput

Before starting the migration, temporarily increase the throughput (RU/s) on your Cosmos DB collections. The migration generates significant write load, and insufficient throughput causes rate limiting (HTTP 429 errors) that slow down the migration dramatically.

```bash
# Increase throughput during migration
az cosmosdb mongodb collection throughput update \
  --account-name my-cosmos-mongodb \
  --resource-group rg-mongo-migration \
  --database-name myappdb \
  --name users \
  --throughput 50000

az cosmosdb mongodb collection throughput update \
  --account-name my-cosmos-mongodb \
  --resource-group rg-mongo-migration \
  --database-name myappdb \
  --name orders \
  --throughput 50000
```

A rough estimate: for every 10 GB of data, allocate about 10,000-20,000 RU/s for the migration to complete in a reasonable timeframe. You can scale back down after migration.

## Step 7: Monitor the Migration

Track the migration progress through the Azure Portal or CLI.

```bash
# Check migration task status
az dms project task show \
  --name mongo-migration-task \
  --resource-group rg-mongo-migration \
  --service-name dms-mongo-to-cosmos \
  --project-name mongo-to-cosmos \
  --expand output
```

In the portal, you will see:
- Documents migrated per collection
- Current migration phase (initial load or oplog replay)
- Errors and warnings
- Estimated time remaining

Watch for these during migration:
- **429 errors on Cosmos DB**: Increase RU/s on the target collection.
- **Oplog size warnings**: If the migration takes longer than the oplog retention period, changes might be lost. Increase the oplog size on the source.
- **Network timeouts**: Check connectivity and bandwidth.

## Step 8: Handle Index Migration

DMS can migrate indexes, but not all MongoDB index types are supported in Cosmos DB. Check and plan for these differences:

**Supported in Cosmos DB**:
- Single field indexes
- Compound indexes
- Unique indexes
- TTL indexes

**Not supported or different**:
- Text indexes (use Azure Cognitive Search instead)
- 2dsphere indexes (supported but with limitations)
- Partial indexes (not supported)
- Wildcard indexes (limited support)

Create any indexes on the target before or after data migration:

```javascript
// Connect to Cosmos DB and create indexes
// Cosmos DB charges RU/s for index operations, so do this during low traffic
use myappdb

// Create a compound index on the orders collection
db.orders.createIndex(
    { customerId: 1, orderDate: -1 },
    { name: "idx_customer_orders" }
)

// Create a unique index
db.users.createIndex(
    { email: 1 },
    { unique: true, name: "idx_unique_email" }
)

// Create a TTL index for session data (auto-expire after 24 hours)
db.sessions.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 86400, name: "idx_session_ttl" }
)
```

## Step 9: Perform the Cutover (Online Migration)

For online migration, DMS continuously replays oplog entries from the source to the target. When you are ready to switch:

1. **Stop application writes** to the source MongoDB.
2. **Wait for DMS to catch up**: The oplog replay lag should drop to zero.
3. **Verify data consistency**: Compare document counts between source and target.

```bash
# Compare document counts
# On source:
mongosh --eval 'db.users.countDocuments({})'

# On target (using mongosh with Cosmos DB connection string):
mongosh "mongodb://my-cosmos-mongodb:password@my-cosmos-mongodb.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb" \
  --eval 'use myappdb; db.users.countDocuments({})'
```

4. **Update application connection strings**: Point to the Cosmos DB connection string.
5. **Complete the migration task** in DMS.

## Step 10: Post-Migration Optimization

After migration, optimize your Cosmos DB setup:

```bash
# Scale throughput back down to normal operational levels
az cosmosdb mongodb collection throughput update \
  --account-name my-cosmos-mongodb \
  --resource-group rg-mongo-migration \
  --database-name myappdb \
  --name users \
  --throughput 4000

# Or enable autoscale for variable workloads
az cosmosdb mongodb collection throughput migrate \
  --account-name my-cosmos-mongodb \
  --resource-group rg-mongo-migration \
  --database-name myappdb \
  --name users \
  --throughput-type autoscale
```

Test your application thoroughly. Pay attention to:
- Query performance (some queries may behave differently with Cosmos DB's distributed architecture)
- Aggregation pipeline compatibility (some stages may not be supported)
- Write patterns (Cosmos DB has a 2 MB document size limit vs. MongoDB's 16 MB)

## Wrapping Up

Migrating MongoDB to Cosmos DB with Azure DMS is a well-supported path, especially for online migrations where downtime must be minimal. The critical success factors are: pre-create collections with proper shard keys, provision enough RU/s during migration to avoid throttling, ensure the source is a replica set with oplog access, and plan for index and feature differences between MongoDB and Cosmos DB's MongoDB API. Test your application against Cosmos DB before cutting over - the wire protocol compatibility is good but not perfect, and you want to find any issues before production traffic hits the new database.
