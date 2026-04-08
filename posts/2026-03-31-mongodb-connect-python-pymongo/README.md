# How to Connect to MongoDB from Python Using PyMongo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, PyMongo, Connection, Driver

Description: Learn how to connect to MongoDB from Python using the official PyMongo driver, configure connection options, and follow best practices for production use.

---

## Overview

PyMongo is the official Python driver for MongoDB. It provides a synchronous API for connecting to standalone servers, replica sets, and sharded clusters. A `MongoClient` instance manages the connection pool and should be shared across your application.

## Installation

```bash
pip install pymongo
```

> **Note:** PyMongo 4.x includes `dnspython` as a core dependency, so SRV connection strings (`mongodb+srv://`) work out of the box. No extra install is needed.

## Basic Connection

```python
from pymongo import MongoClient

# Local MongoDB
client = MongoClient("mongodb://localhost:27017/")

# With authentication
client = MongoClient("mongodb://username:password@localhost:27017/mydb")

# MongoDB Atlas (SRV)
client = MongoClient("mongodb+srv://user:pass@cluster.mongodb.net/mydb?retryWrites=true&w=majority")

db = client["mydb"]
print("Connected to:", db.name)
```

## Connection Options

Configure timeouts, TLS, and pool settings:

```python
client = MongoClient(
    host="localhost",
    port=27017,
    username="admin",
    password="secret",
    authSource="admin",
    serverSelectionTimeoutMS=5000,   # how long to find a server
    connectTimeoutMS=10000,          # TCP connect timeout
    socketTimeoutMS=30000,           # socket operation timeout
    maxPoolSize=50,
    minPoolSize=5,
    tls=True,
    tlsCAFile="/path/to/ca.pem"
)
```

## Testing the Connection

Use `admin.command("ping")` to verify connectivity:

```python
try:
    client.admin.command("ping")
    print("MongoDB connection successful")
except Exception as e:
    print("Connection failed:", e)
```

## Selecting Database and Collection

```python
# Access by attribute or dictionary syntax
db  = client.mydb          # or client["mydb"]
col = db.users             # or db["users"]

# List databases and collections
print(client.list_database_names())
print(db.list_collection_names())
```

## Environment-Based Configuration

Use environment variables to avoid hardcoding credentials:

```python
import os
from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client[os.environ.get("MONGO_DB", "mydb")]
```

## Context Manager for Short-Lived Connections

For scripts and batch jobs, use a context manager to ensure the client is closed:

```python
from pymongo import MongoClient

with MongoClient("mongodb://localhost:27017/") as client:
    db = client["mydb"]
    docs = list(db.users.find({}))
    print(f"Found {len(docs)} users")
# Client automatically closed here
```

## Connection Pooling in Production

PyMongo manages a connection pool automatically. Share a single client across your app:

```python
# db.py - module-level singleton
from pymongo import MongoClient
import os

_client = None

def get_client():
    global _client
    if _client is None:
        _client = MongoClient(os.environ["MONGO_URI"])
    return _client

def get_db(name="mydb"):
    return get_client()[name]
```

## Summary

PyMongo's `MongoClient` connects to MongoDB with a connection string or individual parameters. Configure `serverSelectionTimeoutMS`, `maxPoolSize`, and TLS options for production. Create a single client instance per process and share it across your application. Use `client.admin.command("ping")` to verify connectivity at startup.
