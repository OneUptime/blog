# How to Connect Azure Cosmos DB to a Node.js Application Using @azure/cosmos SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, Node.js, NoSQL, Database, SDK, JavaScript

Description: Connect your Node.js application to Azure Cosmos DB using the official @azure/cosmos SDK with practical examples and best practices.

---

Azure Cosmos DB is Microsoft's globally distributed, multi-model database. It offers single-digit millisecond reads and writes at any scale, which sounds like marketing speak until you actually use it and see those latency numbers. The `@azure/cosmos` SDK for Node.js gives you a clean, promise-based API to work with it. This guide walks through connecting, querying, and managing data in Cosmos DB from a Node.js application.

## Why Cosmos DB

Relational databases work great for many use cases, but they struggle when you need global distribution with low latency or when your data model does not fit neatly into tables. Cosmos DB is designed for exactly those scenarios. It supports multiple APIs (SQL, MongoDB, Cassandra, Gremlin, Table), but the SQL API with the `@azure/cosmos` SDK is the most commonly used and best-supported option for Node.js.

## Prerequisites

- Azure account with an active subscription
- Node.js 18 or later
- Azure CLI installed
- Basic JavaScript or TypeScript knowledge

## Provisioning Cosmos DB

Create a Cosmos DB account using the Azure CLI:

```bash
# Create a resource group
az group create --name cosmos-demo-rg --location eastus

# Create a Cosmos DB account with the SQL API
az cosmosdb create \
  --name my-cosmos-account \
  --resource-group cosmos-demo-rg \
  --locations regionName=eastus failoverPriority=0 \
  --default-consistency-level Session \
  --kind GlobalDocumentDB

# Create a database
az cosmosdb sql database create \
  --account-name my-cosmos-account \
  --resource-group cosmos-demo-rg \
  --name myapp

# Create a container with a partition key
az cosmosdb sql container create \
  --account-name my-cosmos-account \
  --resource-group cosmos-demo-rg \
  --database-name myapp \
  --name users \
  --partition-key-path "/region" \
  --throughput 400
```

The partition key is important. Cosmos DB distributes data across physical partitions based on this key. Choosing a good partition key - one that distributes data evenly and aligns with your query patterns - is the single most impactful decision you make with Cosmos DB.

Get the connection details:

```bash
# Retrieve the endpoint and key
az cosmosdb show --name my-cosmos-account --resource-group cosmos-demo-rg --query documentEndpoint --output tsv
az cosmosdb keys list --name my-cosmos-account --resource-group cosmos-demo-rg --query primaryMasterKey --output tsv
```

## Setting Up the Project

```bash
# Create and initialize the project
mkdir cosmos-node-demo && cd cosmos-node-demo
npm init -y
npm install @azure/cosmos dotenv
npm install --save-dev typescript @types/node ts-node
```

Create a `.env` file:

```env
# Azure Cosmos DB connection details
COSMOS_ENDPOINT="https://my-cosmos-account.documents.azure.com:443/"
COSMOS_KEY="your-primary-key-here"
COSMOS_DATABASE="myapp"
```

## Connecting to Cosmos DB

Here is how to initialize the client and set up database and container references:

```typescript
// src/cosmos-client.ts - Cosmos DB client configuration
import { CosmosClient, Database, Container } from '@azure/cosmos';
import dotenv from 'dotenv';

dotenv.config();

// Create the Cosmos client with endpoint and key
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

// Get references to the database and container
const database: Database = client.database(process.env.COSMOS_DATABASE!);
const usersContainer: Container = database.container('users');

export { client, database, usersContainer };
```

## CRUD Operations

Here is a complete example showing all the basic operations:

```typescript
// src/user-operations.ts - CRUD operations for user documents
import { usersContainer } from './cosmos-client';
import { SqlQuerySpec } from '@azure/cosmos';

// Define the user interface
interface User {
  id: string;
  name: string;
  email: string;
  region: string;    // This is our partition key
  role: string;
  createdAt: string;
}

// Create a new user document
async function createUser(user: User): Promise<User> {
  const { resource } = await usersContainer.items.create(user);
  console.log(`Created user: ${resource?.id}`);
  return resource as User;
}

// Read a user by ID and partition key
async function getUser(id: string, region: string): Promise<User | undefined> {
  // You must provide both the ID and partition key for a point read
  const { resource } = await usersContainer.item(id, region).read<User>();
  return resource;
}

// Update an existing user
async function updateUser(id: string, region: string, updates: Partial<User>): Promise<User> {
  // First read the existing document
  const { resource: existing } = await usersContainer.item(id, region).read<User>();

  if (!existing) {
    throw new Error(`User ${id} not found`);
  }

  // Merge the updates and replace the document
  const updated = { ...existing, ...updates };
  const { resource } = await usersContainer.item(id, region).replace(updated);
  return resource as User;
}

// Delete a user
async function deleteUser(id: string, region: string): Promise<void> {
  await usersContainer.item(id, region).delete();
  console.log(`Deleted user: ${id}`);
}

// Query users with SQL-like syntax
async function queryUsers(region: string, role?: string): Promise<User[]> {
  // Build a parameterized query to prevent injection
  const querySpec: SqlQuerySpec = {
    query: 'SELECT * FROM users u WHERE u.region = @region'
      + (role ? ' AND u.role = @role' : '')
      + ' ORDER BY u.createdAt DESC',
    parameters: [
      { name: '@region', value: region },
      ...(role ? [{ name: '@role', value: role }] : []),
    ],
  };

  const { resources } = await usersContainer.items
    .query<User>(querySpec)
    .fetchAll();

  return resources;
}

// Cross-partition query (use sparingly - more expensive)
async function searchByEmail(email: string): Promise<User | undefined> {
  const querySpec: SqlQuerySpec = {
    query: 'SELECT * FROM users u WHERE u.email = @email',
    parameters: [{ name: '@email', value: email }],
  };

  // Enable cross-partition query explicitly
  const { resources } = await usersContainer.items
    .query<User>(querySpec, { enableCrossPartitionQuery: true })
    .fetchAll();

  return resources[0];
}

export { createUser, getUser, updateUser, deleteUser, queryUsers, searchByEmail };
```

## Bulk Operations

When you need to insert or update many documents at once, use bulk operations:

```typescript
// src/bulk-operations.ts - Efficient bulk operations
import { usersContainer } from './cosmos-client';
import { BulkOperationType } from '@azure/cosmos';

// Insert multiple users in a single batch
async function bulkCreateUsers(users: User[]) {
  const operations = users.map((user) => ({
    operationType: BulkOperationType.Create,
    resourceBody: user,
  }));

  // Bulk operations are executed as a batch
  const response = await usersContainer.items.bulk(operations);

  // Check for individual failures
  const failures = response.filter((r) => r.statusCode >= 400);
  if (failures.length > 0) {
    console.error(`${failures.length} operations failed`);
    failures.forEach((f) => console.error(`Status: ${f.statusCode}`));
  }

  return response;
}
```

## Change Feed

One of Cosmos DB's most powerful features is the change feed. It lets you react to changes in your data in real time:

```typescript
// src/change-feed.ts - Listen for changes in the container
import { usersContainer } from './cosmos-client';

async function processChangeFeed() {
  // Start reading the change feed from the beginning
  const changeFeedIterator = usersContainer.items.changeFeed({
    changeFeedStartFrom: 'Beginning',
  });

  console.log('Listening for changes...');

  // Continuously poll for changes
  while (changeFeedIterator.hasMoreResults) {
    const response = await changeFeedIterator.fetchNext();

    if (response.statusCode === 304) {
      // No new changes - wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }

    // Process each changed document
    for (const item of response.result) {
      console.log(`Changed document: ${item.id}`);
      // Handle the change - send notification, update cache, etc.
    }
  }
}
```

## Stored Procedures

For complex operations that need to run server-side, you can use stored procedures:

```typescript
// src/stored-procedures.ts - Server-side execution
import { database } from './cosmos-client';

// Register a stored procedure that increments a counter atomically
async function registerCounterProcedure() {
  const container = database.container('counters');

  const procedureBody = `
    function incrementCounter(counterId, amount) {
      var collection = getContext().getCollection();
      var response = getContext().getResponse();

      // Query for the counter document
      var query = 'SELECT * FROM c WHERE c.id = "' + counterId + '"';
      var accepted = collection.queryDocuments(
        collection.getSelfLink(),
        query,
        function(err, docs) {
          if (err) throw err;
          if (docs.length === 0) throw new Error('Counter not found');

          var doc = docs[0];
          doc.value += amount;

          // Replace with the updated value
          collection.replaceDocument(doc._self, doc, function(err) {
            if (err) throw err;
            response.setBody(doc);
          });
        }
      );

      if (!accepted) throw new Error('Query was not accepted');
    }
  `;

  await container.scripts.storedProcedures.create({
    id: 'incrementCounter',
    body: procedureBody,
  });
}
```

## Request Units and Cost

Cosmos DB charges in Request Units (RUs). Every operation consumes RUs based on the document size, index complexity, and query patterns. You can check the RU charge of any operation:

```typescript
// Check RU consumption for a query
async function queryWithRUTracking() {
  const { resources, requestCharge } = await usersContainer.items
    .query('SELECT * FROM users u WHERE u.region = "eastus"')
    .fetchAll();

  console.log(`Query returned ${resources.length} documents`);
  console.log(`Request charge: ${requestCharge} RUs`);

  return resources;
}
```

Monitoring RU consumption is essential for cost management. Point reads (by ID and partition key) cost about 1 RU for a 1KB document. Cross-partition queries can cost hundreds of RUs depending on the data volume.

## Connection Best Practices

A few things that matter in production:

```typescript
// src/production-client.ts - Production-ready Cosmos client
import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
  connectionPolicy: {
    // Use direct mode for lower latency
    requestTimeout: 10000,
    // Enable automatic retries on throttled requests
    retryOptions: {
      maxRetryAttemptCount: 9,
      fixedRetryIntervalInMilliseconds: 0,
      maxWaitTimeInSeconds: 30,
    },
  },
});
```

Create the client once and reuse it throughout your application. Do not create a new client per request - that defeats connection pooling and adds unnecessary latency.

## Wrapping Up

The `@azure/cosmos` SDK gives you a straightforward way to work with Cosmos DB from Node.js. The key things to remember are: choose your partition key carefully because you cannot change it later, use point reads instead of queries whenever possible because they are cheaper and faster, and monitor your RU consumption so you do not get surprised by your Azure bill. Cosmos DB is a powerful tool for applications that need global distribution and low latency, and the Node.js SDK makes it accessible without a lot of ceremony.
