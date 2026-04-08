# How to Use Connection Pooling with PyMongo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, PyMongo, Connection Pool, Performance

Description: Learn how to configure and monitor PyMongo connection pooling to maximize throughput and minimize latency in production Python applications.

---

## Overview

PyMongo's `MongoClient` manages a connection pool internally. By default it maintains up to 100 connections per server. Understanding how to size and monitor the pool prevents bottlenecks and ensures your application scales under load.

## Default Pool Behavior

PyMongo creates a `MongoClient` with sensible defaults. Share a single instance throughout your application:

```python
from pymongo import MongoClient

# Module-level singleton - do not create per-request
client = MongoClient(
    "mongodb://localhost:27017/",
    maxPoolSize=100,  # default
    minPoolSize=0
)
```

Creating a new `MongoClient` per request wastes connections and causes severe latency. Always use a single shared instance.

## Configuring Pool Size

Tune pool parameters based on your workload:

```python
client = MongoClient(
    "mongodb://localhost:27017/",
    maxPoolSize=50,         # max simultaneous connections to one server
    minPoolSize=5,          # keep min connections alive (warm pool)
    maxIdleTimeMS=60000,    # close idle connections after 60 seconds
    waitQueueTimeoutMS=5000 # raise error if no connection in 5s
)
```

## Flask Integration (Singleton Pattern)

```python
# app.py
from flask import Flask
from pymongo import MongoClient
import os

app = Flask(__name__)
_client = None

def get_client():
    global _client
    if _client is None:
        _client = MongoClient(
            os.environ["MONGO_URI"],
            maxPoolSize=20,
            minPoolSize=2
        )
    return _client

@app.route("/users")
def list_users():
    db = get_client()["mydb"]
    users = list(db.users.find({}, {"_id": 0, "name": 1, "email": 1}))
    return {"users": users}
```

## Monitoring Pool Events

Enable connection pool monitoring with event listeners:

```python
from pymongo import monitoring

class PoolEventListener(monitoring.ConnectionPoolListener):
    def pool_created(self, event):
        print(f"Pool created for {event.address}")

    def connection_checked_out(self, event):
        print(f"Connection checked out: {event.connection_id}")

    def connection_checked_in(self, event):
        print(f"Connection returned: {event.connection_id}")

    def pool_cleared(self, event):
        print(f"Pool cleared for {event.address}")

monitoring.register(PoolEventListener())
client = MongoClient("mongodb://localhost:27017/")
```

## Checking Pool Statistics

Use server status to inspect current connections:

```python
status = client.admin.command("serverStatus")
connections = status["connections"]
print("Current:   ", connections["current"])
print("Available: ", connections["available"])
print("Total created:", connections["totalCreated"])
```

## Tuning for Multithreaded Apps

PyMongo is thread-safe. Each thread checks out a connection from the pool and returns it automatically:

```python
import threading

def worker(client, thread_id):
    col = client["mydb"]["tasks"]
    col.update_one({"worker": thread_id}, {"$inc": {"count": 1}}, upsert=True)

threads = [threading.Thread(target=worker, args=(client, i)) for i in range(20)]
for t in threads: t.start()
for t in threads: t.join()
```

## Summary

PyMongo's connection pool is configured via `maxPoolSize`, `minPoolSize`, `maxIdleTimeMS`, and `waitQueueTimeoutMS` on the `MongoClient`. Share a single client instance across your application to avoid connection exhaustion. Use pool event listeners for observability and check `serverStatus.connections` to monitor usage. PyMongo is thread-safe - connections are automatically checked out and returned per operation.
