# How to Share Data Between Microservices Using MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Microservice, Data Sharing, Event, API

Description: Explore safe patterns for sharing data between microservices using MongoDB, including API composition, event publishing, and shared read models.

---

In a microservices architecture, data sharing is inevitable but must be done carefully. Direct database-to-database access breaks service boundaries. MongoDB offers several patterns to share data safely while preserving service autonomy.

## The Core Challenge

Each microservice owns its data. If the user service needs order data, it cannot query the order service's MongoDB database directly. Doing so creates tight coupling: the user service now depends on the order service's internal schema, making independent deployments impossible.

The solution is to share data through well-defined interfaces, not through direct database access.

## Pattern 1 - API Composition

The simplest approach: one service calls another service's REST or gRPC API to get the data it needs. The calling service composes the result.

```javascript
// BFF (Backend for Frontend) aggregates data from multiple services
async function getOrderSummary(orderId) {
  // First fetch the order, then use its data to fetch related resources
  const order = await fetch(`http://order-service/orders/${orderId}`).then(r => r.json());

  const [user, inventory] = await Promise.all([
    fetch(`http://user-service/users/${order.userId}`).then(r => r.json()),
    fetch(`http://inventory-service/products/${order.productId}`).then(r => r.json()),
  ]);

  return { order, user, product: inventory };
}
```

This works well for read-heavy operations but adds latency from multiple network hops.

## Pattern 2 - Event-Driven Data Replication

When service A frequently needs data from service B, replicate only the fields it needs into service A's MongoDB database. Service B publishes events when its data changes; service A subscribes and maintains a local copy.

```python
# User service publishes events when user data changes
async def update_user(user_id: str, data: dict):
    await db.users.update_one({"_id": user_id}, {"$set": data})
    await message_broker.publish("user.updated", {
        "userId": user_id,
        "name": data.get("name"),
        "email": data.get("email")
    })

# Order service subscribes and caches minimal user data
async def handle_user_updated(event: dict):
    await order_db.user_cache.update_one(
        {"userId": event["userId"]},
        {"$set": {"name": event["name"], "email": event["email"]}},
        upsert=True
    )
```

## Pattern 3 - Shared Read Model (CQRS)

For complex cross-service queries, maintain a dedicated read model database that aggregates data from multiple services. Write services publish events; a read model service subscribes and builds denormalized documents optimized for queries.

```javascript
// Read model service builds denormalized order view
async function handleOrderCreated(event, readDb) {
  const { orderId, userId, productId, total } = event;

  // Fetch from other services to build the full view
  const user = await userServiceClient.getUser(userId);
  const product = await productServiceClient.getProduct(productId);

  await readDb.collection('order_views').insertOne({
    _id: orderId,
    userId,
    userName: user.name,
    userEmail: user.email,
    productId,
    productName: product.name,
    total,
    createdAt: new Date()
  });
}
```

## Pattern 4 - MongoDB Change Streams as Event Bus

Use MongoDB change streams on the publishing service to automatically detect data changes and push them to a shared message broker:

```javascript
async function publishChanges(db, collection, broker) {
  const stream = db.collection(collection).watch(
    [{ $match: { operationType: { $in: ['insert', 'update'] } } }],
    { fullDocument: 'updateLookup' }
  );

  stream.on('change', async (change) => {
    await broker.publish(`${collection}.changed`, {
      id: change.documentKey._id,
      data: change.fullDocument,
      operation: change.operationType
    });
  });
}
```

## Choosing the Right Pattern

| Scenario | Pattern |
|---|---|
| Occasional cross-service read | API Composition |
| Frequent read of another service's data | Event-Driven Replication |
| Complex cross-service reporting | Shared Read Model |
| Real-time data propagation | Change Streams |

## Summary

Sharing data between MongoDB-backed microservices should never involve direct cross-database access. Use API composition for infrequent reads, event-driven replication for frequent cross-service data needs, and shared read models for complex reporting queries. MongoDB change streams provide a reliable mechanism to detect and publish data changes without polling, enabling reactive data sharing patterns that respect service boundaries.
