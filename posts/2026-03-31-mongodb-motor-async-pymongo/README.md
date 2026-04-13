# How to Use Motor (Async PyMongo) with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, Motor, Async, FastAPI

Description: Learn how to use Motor, the async Python driver for MongoDB, to build non-blocking database operations with asyncio, FastAPI, and other async frameworks.

---

## Overview

Motor is the official async Python driver for MongoDB, built on top of PyMongo. It uses `asyncio` under the hood and provides the same API as PyMongo but with `async/await` syntax, making it the right choice for FastAPI, Starlette, and other async Python frameworks.

## Installation

```bash
pip install motor
```

## Connecting with Motor

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient("mongodb://localhost:27017/")
db = client["mydb"]
col = db["users"]
```

## Basic Async CRUD

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    col = client["mydb"]["users"]

    # Insert
    result = await col.insert_one({"name": "Alice", "email": "alice@example.com"})
    print("Inserted:", result.inserted_id)

    # Find one
    user = await col.find_one({"name": "Alice"})
    print("Found:", user)

    # Update
    await col.update_one({"name": "Alice"}, {"$set": {"age": 30}})

    # Delete
    await col.delete_one({"name": "Alice"})

asyncio.run(main())
```

## Iterating Cursors

Motor cursors must be iterated with `async for`:

```python
async def list_users():
    async for user in col.find({"active": True}, {"name": 1, "email": 1}):
        print(user["name"])

# Or convert to list
users = await col.find({"active": True}).to_list(length=100)
```

## FastAPI Integration

```python
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
import os

app = FastAPI()
client = AsyncIOMotorClient(os.environ.get("MONGO_URI", "mongodb://localhost:27017/"))
db = client["mydb"]

@app.get("/users")
async def get_users():
    users = await db.users.find({}, {"_id": 0, "name": 1, "email": 1}).to_list(50)
    return users

@app.post("/users")
async def create_user(user: dict):
    result = await db.users.insert_one(user)
    return {"id": str(result.inserted_id)}

@app.on_event("shutdown")
async def shutdown():
    client.close()
```

## Aggregation Pipelines

```python
pipeline = [
    {"$match": {"active": True}},
    {"$group": {"_id": "$role", "count": {"$sum": 1}}}
]

async for doc in col.aggregate(pipeline):
    print(doc)

# Or as list
results = await col.aggregate(pipeline).to_list(length=None)
```

## Running Concurrent Operations

```python
import asyncio

async def get_dashboard_data():
    users_task   = col.count_documents({"active": True})
    orders_task  = db.orders.count_documents({"status": "pending"})
    revenue_task = db.orders.aggregate([
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)

    users, orders, revenue = await asyncio.gather(users_task, orders_task, revenue_task)
    return {"users": users, "pending_orders": orders, "revenue": revenue[0]["total"]}
```

## Summary

Motor provides an async API identical to PyMongo but with `async/await`. Use `AsyncIOMotorClient` as a module-level singleton, iterate cursors with `async for` or `.to_list()`, and run concurrent database operations with `asyncio.gather`. Motor integrates naturally with FastAPI and any other `asyncio`-based framework for building high-performance, non-blocking MongoDB applications.
