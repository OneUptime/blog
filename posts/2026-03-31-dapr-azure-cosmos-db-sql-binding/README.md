# How to Use Dapr Azure Cosmos DB SQL Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Cosmos DB, SQL, NoSQL

Description: Learn how to configure and use the Dapr Azure Cosmos DB SQL API output binding to create and query documents in Cosmos DB containers from your microservices.

---

## What Is the Dapr Cosmos DB SQL Output Binding?

Azure Cosmos DB's SQL API (also called Core API) provides a JSON document model with SQL-like query syntax. The Dapr Cosmos DB output binding lets your microservices create documents in a Cosmos DB container without using the Azure Cosmos DB SDK directly.

## Setting Up the Cosmos DB Account and Container

```bash
# Create the Cosmos DB account
az cosmosdb create \
  --name my-cosmos-account \
  --resource-group my-rg \
  --default-consistency-level Session

# Create database and container
az cosmosdb sql database create \
  --account-name my-cosmos-account \
  --resource-group my-rg \
  --name OrdersDB

az cosmosdb sql container create \
  --account-name my-cosmos-account \
  --resource-group my-rg \
  --database-name OrdersDB \
  --name Orders \
  --partition-key-path "/customerId"
```

## Configuring the Cosmos DB Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-container
  namespace: default
spec:
  type: bindings.azure.cosmosdb
  version: v1
  metadata:
    - name: url
      value: "https://my-cosmos-account.documents.azure.com:443/"
    - name: masterKey
      secretKeyRef:
        name: cosmos-secrets
        key: masterKey
    - name: database
      value: "OrdersDB"
    - name: collection
      value: "Orders"
    - name: partitionKey
      value: "customerId"
```

## Creating a Document

The Cosmos DB binding uses the `create` operation to insert a new document into the container. If a document with the same `id` and partition key already exists, a 409 Conflict error is returned:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function saveOrder(order) {
  await client.binding.send("orders-container", "create", {
    id: order.orderId,
    customerId: order.customerId,
    status: order.status,
    items: order.items,
    totalAmount: order.totalAmount,
    shippingAddress: order.shippingAddress,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log(`Order ${order.orderId} saved to Cosmos DB`);
}

await saveOrder({
  orderId: "ORD-2026-001",
  customerId: "CUST-42",
  status: "CONFIRMED",
  items: [
    { sku: "WIDGET-A", name: "Widget A", quantity: 2, unitPrice: 29.99 },
    { sku: "GADGET-B", name: "Gadget B", quantity: 1, unitPrice: 89.99 },
  ],
  totalAmount: 149.97,
  shippingAddress: {
    street: "123 Main St",
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
  },
});
```

## Creating Multiple Documents in Bulk

```javascript
async function bulkSaveOrders(orders) {
  const promises = orders.map((order) =>
    client.binding.send("orders-container", "create", {
      id: order.orderId,
      customerId: order.customerId,
      ...order,
    })
  );

  await Promise.all(promises);
  console.log(`Saved ${orders.length} orders`);
}
```

## Working with TTL for Expiring Documents

```javascript
async function saveTemporarySession(sessionId, userId, data) {
  await client.binding.send("sessions-container", "create", {
    id: sessionId,
    userId,
    data,
    createdAt: new Date().toISOString(),
    ttl: 3600, // Cosmos DB TTL field: expires in 1 hour
  });
}
```

## Hierarchical Documents

Cosmos DB handles nested objects naturally:

```javascript
await client.binding.send("orders-container", "create", {
  id: "ORD-2026-002",
  customerId: "CUST-99",
  timeline: [
    { status: "CREATED", timestamp: "2026-03-31T08:00:00Z" },
    { status: "CONFIRMED", timestamp: "2026-03-31T08:01:00Z" },
    { status: "SHIPPED", timestamp: "2026-03-31T12:00:00Z" },
  ],
  metadata: {
    source: "mobile-app",
    appVersion: "3.2.1",
    deviceType: "ios",
  },
});
```

## Error Handling

```javascript
async function safeSaveOrder(order) {
  try {
    await client.binding.send("orders-container", "create", order);
  } catch (err) {
    if (err.message.includes("409")) {
      console.warn(`Order ${order.id} already exists - skipping duplicate`);
    } else if (err.message.includes("429")) {
      console.error("Cosmos DB rate limit hit - check RU/s provisioning");
      throw err; // Let Dapr resiliency retry
    } else {
      throw err;
    }
  }
}
```

## Summary

The Dapr Azure Cosmos DB SQL output binding provides a straightforward `create` operation for inserting JSON documents into a Cosmos DB container. Combined with Cosmos DB's flexible schema, TTL support, and global distribution, this binding is well suited for storing orders, events, sessions, and any other JSON data that benefits from low-latency reads and automatic scaling.
