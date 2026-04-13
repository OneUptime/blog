# How to Use Transactions with PyMongo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, PyMongo, Transaction, ACID, Python

Description: Learn how to use multi-document ACID transactions in MongoDB with PyMongo, including session management, commit, abort, and retry logic for transient errors.

---

## Overview

MongoDB supports multi-document ACID transactions on replica sets since version 4.0 and on sharded clusters since version 4.2. PyMongo provides two APIs for transactions: the core session-based API and a convenient callback API that handles retries automatically.

## Prerequisites

Transactions require a replica set or sharded cluster. For local development, initialize a replica set:

```bash
mongod --replSet rs0
```

```javascript
// In the mongo shell
rs.initiate()
```

## Installing PyMongo

```bash
pip install pymongo
```

## Connecting with a Session

```python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/?replicaSet=rs0")
db = client["bank"]
```

## Basic Transaction Using the Core API

```python
def transfer_funds(client, from_account, to_account, amount):
    accounts = client["bank"]["accounts"]

    with client.start_session() as session:
        session.start_transaction()
        try:
            # Debit from sender
            result = accounts.update_one(
                {"_id": from_account, "balance": {"$gte": amount}},
                {"$inc": {"balance": -amount}},
                session=session
            )
            if result.modified_count == 0:
                raise ValueError("Insufficient funds or account not found")

            # Credit to receiver
            accounts.update_one(
                {"_id": to_account},
                {"$inc": {"balance": amount}},
                session=session
            )

            session.commit_transaction()
            print("Transaction committed")
        except Exception as e:
            session.abort_transaction()
            print(f"Transaction aborted: {e}")
            raise
```

## Recommended: Callback API with Automatic Retry

The callback API automatically retries the transaction on transient errors (network failures, write conflicts):

```python
def transfer_funds_callback(client, from_account, to_account, amount):
    accounts = client["bank"]["accounts"]

    def txn_callback(session):
        result = accounts.update_one(
            {"_id": from_account, "balance": {"$gte": amount}},
            {"$inc": {"balance": -amount}},
            session=session
        )
        if result.modified_count == 0:
            raise ValueError("Insufficient funds")

        accounts.update_one(
            {"_id": to_account},
            {"$inc": {"balance": amount}},
            session=session
        )

    with client.start_session() as session:
        session.with_transaction(txn_callback)

# Usage
transfer_funds_callback(client, "acc_alice", "acc_bob", 500)
```

## Transaction Options

Control read concern, write concern, and read preference per transaction:

```python
from pymongo import ReadPreference
from pymongo.read_concern import ReadConcern
from pymongo.write_concern import WriteConcern

txn_options = {
    "read_concern": ReadConcern("snapshot"),
    "write_concern": WriteConcern(w="majority"),
    "read_preference": ReadPreference.PRIMARY
}

with client.start_session() as session:
    session.start_transaction(**txn_options)
    try:
        # operations...
        session.commit_transaction()
    except Exception:
        session.abort_transaction()
        raise
```

## Handling Transient Errors Manually

If you use the core API, implement retry logic for `TransientTransactionError`:

```python
from pymongo.errors import PyMongoError

def run_transaction_with_retry(txn_func, session):
    while True:
        try:
            txn_func(session)
            return
        except PyMongoError as exc:
            if exc.has_error_label("TransientTransactionError"):
                print("Transient error, retrying...")
                continue
            raise

def run_commit_with_retry(session):
    while True:
        try:
            session.commit_transaction()
            return
        except PyMongoError as exc:
            if exc.has_error_label("UnknownTransactionCommitResult"):
                print("Unknown commit result, retrying commit...")
                continue
            raise
```

## Multi-Collection Transaction Example

```python
from datetime import datetime

def place_order(client, user_id, items):
    orders = client["store"]["orders"]
    inventory = client["store"]["inventory"]

    def txn(session):
        # Check and reserve inventory
        for item in items:
            result = inventory.update_one(
                {"_id": item["sku"], "qty": {"$gte": item["qty"]}},
                {"$inc": {"qty": -item["qty"]}},
                session=session
            )
            if result.modified_count == 0:
                raise ValueError(f"Insufficient stock for {item['sku']}")

        # Create order
        orders.insert_one({
            "userId": user_id,
            "items": items,
            "status": "confirmed",
            "createdAt": datetime.utcnow()
        }, session=session)

    with client.start_session() as session:
        session.with_transaction(txn)
```

## Summary

PyMongo transactions use client sessions to group multiple operations into an atomic unit. The `with_transaction()` callback API is recommended because it automatically retries on transient errors. Always pass the `session` object to every operation inside the transaction. Use `ReadConcern("snapshot")` and `WriteConcern(w="majority")` for the strongest durability guarantees in critical operations like financial transfers and inventory management.
