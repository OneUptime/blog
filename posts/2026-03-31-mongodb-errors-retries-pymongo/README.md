# How to Handle Errors and Retries with PyMongo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, PyMongo, Error Handling, Retry

Description: Learn how to catch PyMongo exceptions, implement retry logic with exponential backoff, and configure automatic retries for resilient MongoDB operations.

---

## Overview

PyMongo raises specific exceptions for different failure modes. Understanding each exception type and implementing appropriate retry strategies ensures your Python application remains resilient during transient failures, network issues, and replica set elections.

## PyMongo Exception Hierarchy

```text
PyMongoError (base)
  ConnectionFailure
    AutoReconnect
      NetworkTimeout
      NotPrimaryError
    ServerSelectionTimeoutError
  OperationFailure
    DuplicateKeyError
    BulkWriteError
  InvalidOperation
  ConfigurationError
```

## Catching Common Exceptions

```python
from pymongo import MongoClient
from pymongo.errors import (
    DuplicateKeyError,
    OperationFailure,
    ConnectionFailure,
    ServerSelectionTimeoutError
)

client = MongoClient("mongodb://localhost:27017/")
col = client["mydb"]["users"]

# Create a unique index on email
col.create_index("email", unique=True)

# Catch duplicate key on insert
try:
    col.insert_one({"email": "alice@example.com", "name": "Alice"})
    col.insert_one({"email": "alice@example.com", "name": "Duplicate"})
except DuplicateKeyError as e:
    print("Duplicate key:", e.details["keyValue"])

# Catch operation failure
try:
    col.create_index([("nonexistent", 1)], unique=True)
except OperationFailure as e:
    print("Operation failed:", e.code, e.details)
```

## Retry with Exponential Backoff

Implement a retry decorator for transient connection errors:

```python
import time
import functools
from pymongo.errors import ConnectionFailure, AutoReconnect

def with_retry(max_retries=5, base_delay=0.5, backoff=2):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            delay = base_delay
            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except (ConnectionFailure, AutoReconnect) as e:
                    if attempt == max_retries:
                        raise
                    print(f"Attempt {attempt} failed: {e}. Retrying in {delay}s...")
                    time.sleep(delay)
                    delay *= backoff
        return wrapper
    return decorator

@with_retry(max_retries=5)
def find_user(col, email):
    return col.find_one({"email": email})
```

## Configuring retryWrites and retryReads

PyMongo 3.9+ supports automatic server-side retries for eligible operations:

```python
client = MongoClient(
    "mongodb://localhost:27017/?replicaSet=rs0",
    retryWrites=True,   # default True - retry writes once on network error
    retryReads=True     # default True - retry reads once on network error
)
```

## Startup Connection Retry

```python
import time
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError

def connect_with_retry(uri, retries=10, delay=3):
    for i in range(1, retries + 1):
        try:
            c = MongoClient(uri, serverSelectionTimeoutMS=3000)
            c.admin.command("ping")
            print("Connected to MongoDB")
            return c
        except ServerSelectionTimeoutError as e:
            print(f"Attempt {i}/{retries}: {e}")
            if i < retries:
                time.sleep(delay)
    raise RuntimeError("Could not connect to MongoDB")
```

## Handling BulkWriteError

```python
from pymongo.errors import BulkWriteError

try:
    col.insert_many([
        {"_id": 1, "name": "A"},
        {"_id": 1, "name": "B"},  # duplicate
        {"_id": 2, "name": "C"}
    ], ordered=False)
except BulkWriteError as bwe:
    print("Write errors:", bwe.details["writeErrors"])
    print("Inserted count:", bwe.details["nInserted"])
```

## Summary

PyMongo's exception hierarchy provides specific classes for duplicates (`DuplicateKeyError`), connectivity (`ConnectionFailure`, `AutoReconnect`), and server availability (`ServerSelectionTimeoutError`). Enable `retryWrites=True` and `retryReads=True` for automatic server-side retries. For startup resilience, implement a retry loop with exponential backoff. Use `ordered=False` with `insert_many` to continue after partial failures and inspect `BulkWriteError.details` for individual error reports.
