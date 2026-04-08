# How to Create a Sequence/Auto-Increment Field in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sequence, Counter, Pattern

Description: Learn how to implement auto-incrementing numeric IDs in MongoDB using a counters collection and findOneAndUpdate with atomic operations.

---

## Why MongoDB Does Not Have Built-In Auto-Increment

MongoDB's default `ObjectId` is unique and sortable but not a sequential integer. Many applications need human-readable sequential IDs - order numbers, invoice IDs, ticket numbers. The recommended approach is a dedicated counters collection with atomic increment operations.

## The Counters Collection Pattern

Create a `counters` collection where each document tracks the last-used value for one sequence:

```javascript
// Initialize a counter for orders
db.counters.insertOne({ _id: "orderId", seq: 0 })
```

Use `findOneAndUpdate` with `$inc` and `returnDocument: "after"` to atomically increment and return the new value:

```javascript
function getNextSequence(name) {
  const result = db.counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  return result.seq;
}

// Use it when inserting
const nextId = getNextSequence("orderId");
db.orders.insertOne({
  _id: nextId,
  customerId: "cust-001",
  total: 99.99,
  createdAt: new Date()
});
```

The `upsert: true` option creates the counter document if it does not exist yet.

## Node.js Implementation

```javascript
async function getNextSequence(db, sequenceName) {
  const result = await db.collection("counters").findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  return result.seq;
}

async function createOrder(db, orderData) {
  const orderId = await getNextSequence(db, "orderId");
  const order = { _id: orderId, ...orderData, createdAt: new Date() };
  await db.collection("orders").insertOne(order);
  return order;
}
```

## Python Implementation

```python
from pymongo import MongoClient, ReturnDocument

client = MongoClient("mongodb://localhost:27017")
db = client["shop"]

def get_next_sequence(name: str) -> int:
    result = db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        return_document=ReturnDocument.AFTER,
        upsert=True
    )
    return result["seq"]

def create_order(data: dict) -> dict:
    order = {
        "_id": get_next_sequence("orderId"),
        **data,
        "createdAt": __import__("datetime").datetime.utcnow()
    }
    db.orders.insert_one(order)
    return order
```

## Using a Prefixed Sequence

For human-readable IDs like `ORD-0001`, build the prefix in application code:

```javascript
const seq = getNextSequence("orderId");
const orderId = `ORD-${String(seq).padStart(4, "0")}`;
// e.g. "ORD-0042"
```

Store the numeric sequence in the counters collection and format the string ID in the application layer. This keeps the counter as a compact integer while exposing a pretty string to users.

## Handling Gaps

Gaps in the sequence can occur if an insert fails after the counter was already incremented. For most use cases (order numbers, ticket IDs) gaps are acceptable. If gap-free sequences are critical, wrap the counter increment and document insert in a transaction:

```javascript
async function getNextSequenceWithSession(db, name, session) {
  const result = await db.collection("counters").findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, session }
  );
  return result.seq;
}

const session = client.startSession();
await session.withTransaction(async () => {
  const seq = await getNextSequenceWithSession(db, "invoiceId", session);
  await db.collection("invoices").insertOne(
    { _id: seq, amount: 250, customer: "cust-001" },
    { session }
  );
});
```

## Summary

Use a `counters` collection with `findOneAndUpdate` + `$inc` to implement atomic auto-incrementing sequences. The `upsert: true` option initialises the counter on first use. Wrap in a transaction when you need gap-free guarantees. Format the integer as a human-readable string at the application layer rather than storing formatted strings in the counter document.
