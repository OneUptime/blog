# How to Implement Check-and-Set (CAS) Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Concurrency, Optimistic Locking, CA, Update

Description: Learn how to implement check-and-set (CAS) operations in MongoDB using version fields and findOneAndUpdate for safe concurrent updates.

---

## What Is Check-and-Set?

Check-and-Set (CAS) is a concurrency pattern where an update is applied only if the document still matches the expected state at the time of the write. If another process modified the document first, the update is rejected. This prevents lost updates without requiring locks.

CAS is the foundation of optimistic concurrency control - assume no conflict, check at commit time, retry if needed.

## The CAS Pattern in MongoDB

MongoDB does not have built-in CAS, but you can implement it using `findOneAndUpdate` with a filter that includes the expected version or field value:

```javascript
// Attempt to update only if version matches
db.inventory.findOneAndUpdate(
  { _id: "item-001", version: 3 },
  {
    $set: { stock: 45 },
    $inc: { version: 1 }
  },
  { returnDocument: "after" }
)
```

If the document's version is still 3, the update succeeds and version becomes 4. If another process already incremented it to 4, the filter matches nothing and the result is `null`.

## Python Implementation

```python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client.myDatabase

def cas_update(item_id: str, expected_version: int, new_stock: int) -> bool:
    result = db.inventory.find_one_and_update(
        {"_id": item_id, "version": expected_version},
        {
            "$set": {"stock": new_stock},
            "$inc": {"version": 1}
        },
        return_document=True
    )
    return result is not None

# Read-modify-write with retry
def update_stock_with_retry(item_id: str, delta: int, max_retries: int = 5) -> bool:
    for attempt in range(max_retries):
        doc = db.inventory.find_one({"_id": item_id})
        if doc is None:
            return False

        new_stock = doc["stock"] + delta
        if new_stock < 0:
            raise ValueError("Insufficient stock")

        success = cas_update(item_id, doc["version"], new_stock)
        if success:
            return True

    raise RuntimeError(f"CAS update failed after {max_retries} retries")
```

## Node.js Implementation

```javascript
async function casUpdate(collection, id, expectedVersion, updates) {
  const result = await collection.findOneAndUpdate(
    { _id: id, version: expectedVersion },
    { $set: updates, $inc: { version: 1 } },
    { returnDocument: "after" }
  );
  return result !== null;
}

async function updateWithRetry(collection, id, applyFn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const doc = await collection.findOne({ _id: id });
    const updated = applyFn(doc);
    const success = await casUpdate(collection, id, doc.version, updated);
    if (success) return updated;
  }
  throw new Error("Too many CAS retries");
}
```

## Using a Timestamp Instead of Version

If you cannot add a version field, use an `updatedAt` timestamp:

```javascript
db.settings.findOneAndUpdate(
  { _id: "config", updatedAt: ISODate("2026-03-31T10:00:00Z") },
  {
    $set: { maxConnections: 200, updatedAt: new Date() }
  }
)
```

## CAS for Status Transitions

CAS is particularly useful for safe state machine transitions:

```python
def transition_order(order_id: str, from_status: str, to_status: str) -> bool:
    result = db.orders.find_one_and_update(
        {"_id": order_id, "status": from_status},
        {"$set": {"status": to_status, "updatedAt": datetime.utcnow()}}
    )
    return result is not None

# Safe: only moves from "pending" to "processing"
success = transition_order("order-123", "pending", "processing")
```

## When to Choose CAS vs. Transactions

- Use CAS when updating a single document - it is simpler, faster, and does not require a replica set session
- Use multi-document transactions when the operation must span multiple documents or collections atomically

## Summary

CAS in MongoDB is implemented with `findOneAndUpdate` using a filter that includes an expected version or state field. If the filter matches, the update proceeds and the version increments. If not, the result is null and the caller should retry. CAS is efficient, lock-free, and works well for high-concurrency scenarios where conflicts are infrequent.
