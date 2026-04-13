# How to Use MongoDB with Azure Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Azure, Serverless, Function, Mongoose

Description: Learn how to connect MongoDB from Azure Functions using the connection caching pattern, Key Vault integration, and VNet deployment for secure access.

---

Azure Functions support MongoDB connections through Mongoose, a popular MongoDB ODM for Node.js. The critical optimization is the same as other serverless platforms: cache the connection in module scope to reuse it across warm invocations and avoid reconnecting on every function call.

## Installing Dependencies

```bash
npm install @azure/functions mongoose
```

## Connection Caching Pattern

```javascript
const mongoose = require('mongoose');

let cachedConn = null;

async function connectToDatabase() {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }

  cachedConn = await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
  });

  return cachedConn;
}
```

## HTTP Trigger Function (v4 Programming Model)

```javascript
const { app } = require('@azure/functions');
const Item = require('./models/Item');

app.http('items', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  handler: async (request, context) => {
    await connectToDatabase();

    if (request.method === 'GET') {
      const items = await Item.find().limit(100).lean();
      return {
        status: 200,
        jsonBody: items,
      };
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const item = await Item.create(body);
      return {
        status: 201,
        jsonBody: item,
      };
    }
  },
});
```

## Timer-Triggered Function for Scheduled Work

```javascript
app.timer('cleanupExpiredItems', {
  schedule: '0 0 * * * *', // Every hour
  handler: async (myTimer, context) => {
    await connectToDatabase();

    const result = await Item.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    context.log(`Deleted ${result.deletedCount} expired items`);
  },
});
```

## Service Bus Trigger

```javascript
app.serviceBusTopic('onOrderCreated', {
  connection: 'SERVICE_BUS_CONNECTION_STRING',
  topicName: 'orders',
  subscriptionName: 'process-order',
  handler: async (message, context) => {
    await connectToDatabase();

    const order = await Order.create({
      ...message,
      status: 'processing',
      receivedAt: new Date(),
    });

    context.log(`Order ${order._id} created`);
  },
});
```

## local.settings.json for Local Development

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "MONGODB_CONNECTION_STRING": "mongodb+srv://user:pass@cluster.mongodb.net/mydb"
  }
}
```

## Storing the Connection String in Azure Key Vault

Reference Key Vault secrets directly in Function App settings:

```bash
# Create the secret in Key Vault
az keyvault secret set \
  --vault-name my-keyvault \
  --name MongoDbConnectionString \
  --value "mongodb+srv://..."

# Reference it in Function App settings
az functionapp config appsettings set \
  --name my-function-app \
  --resource-group my-rg \
  --settings "MONGODB_CONNECTION_STRING=@Microsoft.KeyVault(SecretUri=https://my-keyvault.vault.azure.net/secrets/MongoDbConnectionString/)"
```

## Deploying to Azure

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Create the Function App
az functionapp create \
  --resource-group my-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name my-mongodb-app \
  --storage-account mystorageaccount

# Deploy
func azure functionapp publish my-mongodb-app
```

## Summary

Azure Functions and MongoDB work well together when you cache the Mongoose connection in module scope. Use Key Vault references for the connection string, configure `maxPoolSize` between 3 and 5 for consumption plan functions, and use VNet integration with private endpoints to connect MongoDB Atlas over a private network without exposing the connection to the public internet.
