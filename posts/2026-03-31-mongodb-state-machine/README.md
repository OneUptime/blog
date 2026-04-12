# How to Implement a State Machine with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, State Machine, Pattern, Workflow, Concurrency

Description: Learn how to model and implement a state machine in MongoDB using atomic transitions to safely manage document lifecycle and workflow states.

---

## Why Use a State Machine Pattern?

A state machine constrains what states an entity can be in and which transitions are valid. Storing state in MongoDB without constraints leads to invalid state combinations, race conditions, and audit gaps. Implementing the state machine pattern in MongoDB gives you predictable transitions, audit history, and safe concurrent updates.

## Modeling the State Document

```javascript
{
  "_id": "order-123",
  "status": "pending",
  "statusHistory": [
    { "to": "pending", "at": ISODate("2026-03-31T09:00:00Z"), "by": "system" }
  ],
  "updatedAt": ISODate("2026-03-31T09:00:00Z")
}
```

## Defining Valid Transitions

```python
TRANSITIONS = {
    "pending":    ["processing", "cancelled"],
    "processing": ["shipped",    "cancelled"],
    "shipped":    ["delivered",  "returned"],
    "delivered":  [],
    "cancelled":  [],
    "returned":   ["refunded"],
    "refunded":   [],
}
```

## Atomic Transition Function

```python
from pymongo import MongoClient
from datetime import datetime, timezone

client = MongoClient("mongodb://localhost:27017/")
db = client.myDatabase

def transition(order_id: str, to_status: str, actor: str) -> bool:
    valid_froms = [
        from_status
        for from_status, valid_tos in TRANSITIONS.items()
        if to_status in valid_tos
    ]

    if not valid_froms:
        raise ValueError(f"No valid transition to '{to_status}'")

    now = datetime.now(timezone.utc)

    result = db.orders.find_one_and_update(
        {
            "_id": order_id,
            "status": {"$in": valid_froms}
        },
        {
            "$set": {
                "status": to_status,
                "updatedAt": now
            },
            "$push": {
                "statusHistory": {
                    "to": to_status,
                    "at": now,
                    "by": actor
                }
            }
        },
        return_document=True
    )

    return result is not None
```

## Using the State Machine

```python
# Create an order
db.orders.insert_one({
    "_id": "order-123",
    "status": "pending",
    "statusHistory": [],
    "updatedAt": datetime.now(timezone.utc)
})

# Valid transition
success = transition("order-123", "processing", "warehouse-service")
print(success)  # True

# Invalid transition (pending -> delivered is not allowed)
success = transition("order-123", "delivered", "system")
print(success)  # False - order is now "processing", not a valid from-state for "delivered"
```

## Validating Transitions Explicitly

For better error messages, add an explicit check before attempting the update:

```python
def can_transition(current_status: str, to_status: str) -> bool:
    return to_status in TRANSITIONS.get(current_status, [])

def safe_transition(order_id: str, to_status: str, actor: str) -> bool:
    doc = db.orders.find_one({"_id": order_id}, {"status": 1})
    if not doc:
        raise ValueError(f"Order {order_id} not found")

    if not can_transition(doc["status"], to_status):
        raise ValueError(
            f"Cannot transition from '{doc['status']}' to '{to_status}'"
        )

    return transition(order_id, to_status, actor)
```

## Querying by State

Find all orders in a specific state:

```javascript
db.orders.find({ "status": "processing" })
```

Find orders stuck in processing for more than 1 hour:

```javascript
db.orders.find({
  "status": "processing",
  "updatedAt": { "$lt": new Date(Date.now() - 3600000) }
})
```

## Creating a State Index

For efficient state-based queries:

```javascript
db.orders.createIndex({ "status": 1, "updatedAt": 1 })
```

## Handling Concurrent Transitions

Because `find_one_and_update` filters on `status`, two processes attempting the same transition simultaneously will result in only one succeeding. The second sees no matching document (the status already changed) and returns `null`. This provides atomic mutual exclusion without application-level locking.

## Summary

MongoDB state machines use `findOneAndUpdate` with the current status in the filter to enforce valid transitions atomically. Store `statusHistory` for audit trails, define a transition map as your single source of truth for allowed state changes, and index on `status` for efficient querying. This pattern eliminates invalid state combinations and handles concurrent transitions safely without application-level locking.
