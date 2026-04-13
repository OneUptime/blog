# How to Handle Distributed Transactions Across Microservices with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Microservice, Saga, Distributed System

Description: Learn strategies for handling distributed transactions across microservices with MongoDB, including the Saga pattern and compensating transactions.

---

Distributed transactions - operations that span multiple services and databases - are one of the hardest problems in microservices. MongoDB provides multi-document ACID transactions within a single cluster, but when operations span multiple service databases, you need higher-level coordination patterns.

## Why You Cannot Use a Single MongoDB Transaction Across Services

MongoDB multi-document transactions work within one session on one cluster. When each microservice has its own database (even on a shared cluster, if accessed via separate connections), you cannot wrap their operations in one transaction:

```javascript
// THIS DOES NOT WORK across separate service connections
const session = client.startSession();
await session.withTransaction(async () => {
  // These are separate clients - different connections, different sessions
  await orderServiceDb.collection('orders').insertOne(order, { session });       // fails
  await inventoryServiceDb.collection('stock').updateOne(filter, update, { session }); // fails
});
```

## The Saga Pattern

The Saga pattern breaks a distributed transaction into a sequence of local transactions, each published as an event. If any step fails, compensating transactions undo the previous steps.

### Choreography-Based Saga

Each service listens for events and publishes its own events:

```javascript
// Order service creates order and publishes event
async function createOrder(orderData) {
  await db.collection('orders').insertOne({ ...orderData, status: 'pending' });
  await publishEvent('order.created', orderData);
}

// Inventory service listens and reserves stock
async function onOrderCreated(event) {
  const reserved = await tryReserveStock(event.productId, event.quantity);
  if (reserved) {
    await publishEvent('stock.reserved', { orderId: event.orderId });
  } else {
    await publishEvent('stock.reservation.failed', { orderId: event.orderId });
  }
}

// Order service listens for compensation
async function onStockReservationFailed(event) {
  await db.collection('orders').updateOne(
    { _id: new ObjectId(event.orderId) },
    { $set: { status: 'cancelled', reason: 'out_of_stock' } }
  );
}
```

### Orchestration-Based Saga

A central orchestrator coordinates the saga steps:

```javascript
async function placeOrderSaga(orderData) {
  const orderId = await orderService.createOrder(orderData);

  try {
    await inventoryService.reserveStock(orderData.productId, orderData.quantity);
    await paymentService.chargePayment(orderData.userId, orderData.total);
    await orderService.confirmOrder(orderId);
  } catch (err) {
    // Compensate in reverse order
    await paymentService.refundPayment(orderData.userId, orderData.total);
    await inventoryService.releaseStock(orderData.productId, orderData.quantity);
    await orderService.cancelOrder(orderId, err.message);
    throw err;
  }
}
```

## Tracking Saga State in MongoDB

Store saga state in MongoDB so you can resume or compensate after failures:

```javascript
async function updateSagaState(db, sagaId, step, status) {
  await db.collection('sagas').updateOne(
    { _id: sagaId },
    {
      $set: { [`steps.${step}`]: status, updatedAt: new Date() },
      $push: { history: { step, status, timestamp: new Date() } }
    },
    { upsert: true }
  );
}

// Usage
await updateSagaState(db, orderId, 'inventory_reserved', 'completed');
await updateSagaState(db, orderId, 'payment_charged', 'failed');
```

## Idempotency Keys for Safe Retries

Each saga step must be idempotent. Use idempotency keys stored in MongoDB:

```javascript
async function idempotentOperation(db, key, operation) {
  const existing = await db.collection('idempotency_keys').findOne({ key });
  if (existing) return existing.result;

  const result = await operation();

  await db.collection('idempotency_keys').insertOne({
    key,
    result,
    createdAt: new Date()
  });

  return result;
}
```

## Summary

MongoDB's ACID transactions are limited to a single cluster session, making cross-service distributed transactions impossible without higher-level patterns. The Saga pattern - either choreography or orchestration based - handles this by chaining local transactions with compensating rollbacks. Store saga state in MongoDB to track progress, and use idempotency keys to safely retry failed steps without double-processing.
