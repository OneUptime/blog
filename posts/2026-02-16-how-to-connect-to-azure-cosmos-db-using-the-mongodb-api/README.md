# How to Connect to Azure Cosmos DB Using the MongoDB API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Cosmos DB, MongoDB, API Compatibility, NoSQL, Database Migration

Description: Connect your existing MongoDB applications to Azure Cosmos DB using the MongoDB API with minimal code changes and full managed service benefits.

---

Azure Cosmos DB supports the MongoDB wire protocol, which means you can point your existing MongoDB applications at Cosmos DB and they just work - mostly. You use the same MongoDB drivers, the same query syntax, and the same tools. Behind the scenes, Cosmos DB provides global distribution, automatic scaling, and guaranteed SLAs that native MongoDB deployments do not offer out of the box. This guide covers how to set up the connection, what works, what does not, and how to optimize your application for this hybrid setup.

## Creating a Cosmos DB Account with MongoDB API

First, create a Cosmos DB account configured for the MongoDB API:

### Using Azure CLI

```bash
# Create a Cosmos DB account with MongoDB API
# The --kind MongoDB flag sets the API type
az cosmosdb create \
    --name myMongoCosmosAccount \
    --resource-group myResourceGroup \
    --kind MongoDB \
    --server-version 4.2 \
    --locations regionName=eastus failoverPriority=0 \
    --default-consistency-level Session
```

Available server versions are 3.6, 4.0, and 4.2. Choose the version that matches your application's MongoDB driver compatibility.

### Using Azure Portal

1. Go to Create a resource and search for Azure Cosmos DB
2. Select Azure Cosmos DB API for MongoDB
3. Choose a server version (4.2 recommended)
4. Select your capacity mode (provisioned or serverless)
5. Complete the creation wizard

## Getting the Connection String

Cosmos DB provides a MongoDB-compatible connection string. Get it from the portal or CLI:

```bash
# Get the MongoDB connection string
az cosmosdb keys list \
    --name myMongoCosmosAccount \
    --resource-group myResourceGroup \
    --type connection-strings \
    --query "connectionStrings[0].connectionString" -o tsv
```

The connection string looks like this:

```
mongodb://myMongoCosmosAccount:PRIMARY_KEY@myMongoCosmosAccount.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@myMongoCosmosAccount@
```

Notice the differences from a standard MongoDB connection string:

- Port 10255 instead of the default 27017
- SSL is required
- The `replicaSet=globaldb` parameter
- `retrywrites=false` (important for Cosmos DB compatibility)

## Connecting from Different Languages

### Node.js (Mongoose)

```javascript
// Connect to Cosmos DB MongoDB API using Mongoose
const mongoose = require('mongoose');

// The connection string from Azure Portal
const connectionString = process.env.COSMOS_MONGODB_CONNECTION_STRING;

// Connect with recommended options for Cosmos DB
mongoose.connect(connectionString, {
    // These options are recommended for Cosmos DB compatibility
    retryWrites: false,
    maxIdleTimeMS: 120000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
}).then(() => {
    console.log('Connected to Cosmos DB MongoDB API');
}).catch((err) => {
    console.error('Connection error:', err);
});

// Define a schema and model - works exactly like regular MongoDB
const orderSchema = new mongoose.Schema({
    customerId: { type: String, required: true, index: true },
    product: String,
    quantity: Number,
    price: Number,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Create a document
async function createOrder() {
    const order = new Order({
        customerId: 'cust-123',
        product: 'Widget Pro',
        quantity: 3,
        price: 49.99
    });
    await order.save();
    console.log('Order created:', order._id);
}
```

### Python (PyMongo)

```python
# Connect to Cosmos DB MongoDB API using PyMongo
from pymongo import MongoClient
import os

# Get the connection string from environment variable
connection_string = os.environ["COSMOS_MONGODB_CONNECTION_STRING"]

# Create the client with recommended settings
client = MongoClient(
    connection_string,
    retryWrites=False,
    serverSelectionTimeoutMS=5000,
    socketTimeoutMS=30000
)

# Access a database and collection
db = client["mydb"]
orders = db["orders"]

# Insert a document
order = {
    "customerId": "cust-456",
    "product": "Gadget X",
    "quantity": 1,
    "price": 129.99,
    "status": "pending"
}
result = orders.insert_one(order)
print(f"Inserted order: {result.inserted_id}")

# Query documents
for order in orders.find({"customerId": "cust-456"}):
    print(f"Order: {order['product']} - ${order['price']}")
```

### Java (MongoDB Driver)

```java
// Connect to Cosmos DB MongoDB API using the Java driver
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.MongoCollection;
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import org.bson.Document;

// Build client settings with Cosmos DB recommendations
String connString = System.getenv("COSMOS_MONGODB_CONNECTION_STRING");
MongoClientSettings settings = MongoClientSettings.builder()
    .applyConnectionString(new ConnectionString(connString))
    .retryWrites(false)
    .build();

// Create the client
MongoClient client = MongoClients.create(settings);
MongoDatabase database = client.getDatabase("mydb");
MongoCollection<Document> orders = database.getCollection("orders");

// Insert a document
Document order = new Document()
    .append("customerId", "cust-789")
    .append("product", "SuperTool")
    .append("quantity", 2)
    .append("price", 79.99);
orders.insertOne(order);
```

### C# (MongoDB .NET Driver)

```csharp
// Connect to Cosmos DB MongoDB API using the .NET driver
using MongoDB.Driver;
using MongoDB.Bson;

// Build the client with recommended settings
var connectionString = Environment.GetEnvironmentVariable("COSMOS_MONGODB_CONNECTION_STRING");
var settings = MongoClientSettings.FromConnectionString(connectionString);
settings.RetryWrites = false;
settings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);

var client = new MongoClient(settings);
var database = client.GetDatabase("mydb");
var orders = database.GetCollection<BsonDocument>("orders");

// Insert a document
var order = new BsonDocument
{
    { "customerId", "cust-101" },
    { "product", "MegaWidget" },
    { "quantity", 10 },
    { "price", 19.99 }
};
await orders.InsertOneAsync(order);
```

## Creating Collections and Indexes

Collections in Cosmos DB MongoDB API map to Cosmos DB containers. You can create them with specific options:

```javascript
// Create a collection with a shard key (maps to Cosmos DB partition key)
// The shard key is critical for performance - same rules as partition keys
db.createCollection("orders");
db.runCommand({
    shardCollection: "mydb.orders",
    key: { customerId: "hashed" }
});

// Create indexes for your query patterns
// Single field index
db.orders.createIndex({ status: 1 });

// Compound index
db.orders.createIndex({ customerId: 1, createdAt: -1 });

// TTL index (automatically deletes documents after specified seconds)
db.orders.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 2592000 } // 30 days
);
```

## Shard Keys and Partition Keys

In Cosmos DB MongoDB API, the shard key maps directly to the partition key. The same rules apply:

- Choose a shard key with high cardinality
- Ensure even data distribution
- Align with your most common query patterns
- The shard key cannot be changed after creation

```javascript
// Good shard key - high cardinality, aligns with queries
db.runCommand({ shardCollection: "mydb.orders", key: { customerId: "hashed" } });

// Bad shard key - low cardinality
db.runCommand({ shardCollection: "mydb.orders", key: { status: "hashed" } });
```

## What Works and What Does Not

Most MongoDB operations work, but there are some notable exceptions:

**Supported:**
- CRUD operations (insert, find, update, delete)
- Aggregation pipeline (most stages)
- Indexes (single, compound, TTL, unique, geo)
- Change streams
- Transactions (with version 4.0+)
- Text search (basic)

**Not supported or limited:**
- `$graphLookup` aggregation stage
- Capped collections
- Map-Reduce (deprecated in MongoDB anyway)
- Full-text search with `$text` (use Azure Cognitive Search instead)
- Some aggregation operators (check documentation for the full list)

## Optimizing for Cosmos DB

Even though the MongoDB API is compatible, some optimizations are specific to Cosmos DB:

```javascript
// Use projection to return only needed fields (reduces RU cost)
// Instead of: db.orders.find({ customerId: "cust-123" })
db.orders.find(
    { customerId: "cust-123" },
    { product: 1, price: 1, status: 1 }  // Only return these fields
);

// Use the explain command to see RU costs
db.orders.find({ customerId: "cust-123" }).explain("executionStats");
// Look at the "executionStats.totalRequestCharge" field
```

## Connecting with MongoDB Compass

MongoDB Compass, the GUI tool, works with Cosmos DB:

1. Open MongoDB Compass
2. Paste the Cosmos DB connection string
3. Click Connect

You can browse collections, run queries, view documents, and analyze schema - all through the familiar Compass interface.

## Connecting with mongosh

The MongoDB shell also works:

```bash
# Connect using mongosh with the Cosmos DB connection string
mongosh "mongodb://myMongoCosmosAccount:PRIMARY_KEY@myMongoCosmosAccount.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb" \
    --tls \
    --authenticationDatabase admin
```

Using Cosmos DB with the MongoDB API is a practical approach for teams that want the benefits of a globally distributed, fully managed database without rewriting their MongoDB applications. The compatibility is not 100%, but for most standard CRUD and aggregation workloads, the transition is smooth. The key is understanding that under the hood you are running on Cosmos DB, so partition key design and RU optimization still matter.
