# How to Use Transactions with PyMongo in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, PyMongo, Python, Transaction, Database

Description: Learn how to execute ACID-compliant multi-document transactions in Python using PyMongo sessions, with commit, abort, and retry patterns.

---

PyMongo supports multi-document ACID transactions through client sessions. Transactions require MongoDB 4.0+ for replica sets or MongoDB 4.2+ for sharded clusters. This guide shows both the callback API and manual session management.

## Prerequisites

```bash
pip install pymongo>=3.7
```

Connect to a replica set:

```python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/?replicaSet=rs0")
db = client["shop"]
orders = db["orders"]
inventory = db["inventory"]
```

## Using the Callback API (Recommended)

The callback API automatically handles retries for transient errors and unknown transaction commit results:

```python
from pymongo import ReturnDocument

def place_order(session, user_id, cart_items):
    for item in cart_items:
        result = inventory.find_one_and_update(
            {"product_id": item["product_id"], "qty": {"$gte": item["qty"]}},
            {"$inc": {"qty": -item["qty"]}},
            session=session,
            return_document=ReturnDocument.AFTER
        )
        if result is None:
            raise ValueError(f"Insufficient stock: {item['product_id']}")

    orders.insert_one({
        "user_id": user_id,
        "items": cart_items,
        "total": sum(i["price"] * i["qty"] for i in cart_items)
    }, session=session)

with client.start_session() as session:
    session.with_transaction(lambda s: place_order(s, "user123", cart_items))
```

`with_transaction` retries the callback on `TransientTransactionError` and retries only the commit on `UnknownTransactionCommitResult`.

## Manual Transaction Control

For custom retry logic or explicit error handling:

```python
def run_transfer(session, from_id, to_id, amount):
    accounts = db["accounts"]

    with session.start_transaction():
        accounts.update_one(
            {"_id": from_id},
            {"$inc": {"balance": -amount}},
            session=session
        )
        accounts.update_one(
            {"_id": to_id},
            {"$inc": {"balance": amount}},
            session=session
        )

with client.start_session() as session:
    run_transfer(session, "acc_A", "acc_B", 250.00)
```

The `with session.start_transaction()` context manager commits on exit and aborts on exception.

## Configuring Read and Write Concern

```python
from pymongo import WriteConcern
from pymongo.read_concern import ReadConcern
from pymongo.read_preferences import ReadPreference

with client.start_session() as session:
    with session.start_transaction(
        read_concern=ReadConcern("snapshot"),
        write_concern=WriteConcern(w="majority"),
        read_preference=ReadPreference.PRIMARY
    ):
        # operations here
        pass
```

## Retry Pattern for Transient Errors

```python
from pymongo.errors import ConnectionFailure, OperationFailure

def run_with_retry(client, fn):
    while True:
        with client.start_session() as session:
            try:
                with session.start_transaction():
                    fn(session)
                    return
            except (ConnectionFailure, OperationFailure) as exc:
                if exc.has_error_label("TransientTransactionError"):
                    continue
                raise
```

## Bulk Operations in Transactions

```python
from pymongo import UpdateOne

with client.start_session() as session:
    with session.start_transaction():
        requests = [
            UpdateOne({"_id": pid}, {"$inc": {"stock": -qty}})
            for pid, qty in deductions
        ]
        inventory.bulk_write(requests, session=session)
```

## Common Issues

- All operations must pass the same `session` object. Omitting it causes the operation to run outside the transaction.
- Transactions expire after 60 seconds by default (`transactionLifetimeLimitSeconds`). Keep them brief.
- Avoid long-running aggregations or `$lookup` stages inside transactions to minimize lock contention.

## Summary

PyMongo transactions use a session-centric model. The `with_transaction` callback API is the safest choice because it handles both transient errors and ambiguous commit results automatically. Always pass the session to every operation and use snapshot read concern with majority write concern for the strongest consistency guarantees.

