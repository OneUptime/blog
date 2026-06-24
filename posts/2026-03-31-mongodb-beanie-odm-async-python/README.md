# How to Use Beanie ODM for Async MongoDB with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, Beanie, ODM, Async

Description: Learn how to use Beanie, an async MongoDB ODM built on Motor and Pydantic, to define typed documents and build async MongoDB applications with FastAPI.

---

## Overview

Beanie is an async ODM for MongoDB that combines Async PyMongo with Pydantic for schema definition and validation. Documents are Pydantic models, giving you automatic data validation, serialization, and IDE autocompletion alongside async MongoDB operations.

## Installation

```bash
pip install beanie
```

## Defining a Document

Beanie documents extend `beanie.Document` which itself extends `pydantic.BaseModel`:

```python
from typing import Optional, List
from datetime import datetime
from beanie import Document, Indexed
from pydantic import EmailStr, Field

class User(Document):
    name:       str
    email:      Indexed(EmailStr, unique=True)
    age:        Optional[int] = None
    role:       str = "user"
    tags:       List[str] = []
    createdAt:  datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"      # MongoDB collection name
        indexes = [
            [("role", 1), ("createdAt", -1)]  # compound index
        ]
```

## Initializing Beanie

Initialize Beanie with your Motor client and document list at startup:

```python
import asyncio
from pymongo import AsyncMongoClient
from beanie import init_beanie

async def init():
    client = AsyncMongoClient("mongodb://localhost:27017/")
    await init_beanie(database=client["mydb"], document_models=[User])
```

## Creating and Inserting

```python
async def create_user():
    user = User(name="Alice", email="alice@example.com", age=30, role="admin")
    await user.insert()
    print("Created:", user.id)  # Beanie sets id automatically

    # Or use create() shortcut
    bob = await User(name="Bob", email="bob@example.com").create()
```

## Querying Documents

```python
# Find one
user = await User.find_one(User.email == "alice@example.com")

# Find many with filters
admins = await User.find(User.role == "admin", User.age >= 25).to_list()

# Sort, limit, skip
recent = await User.find().sort(-User.createdAt).limit(10).to_list()

# Count
count = await User.find(User.role == "user").count()
```

## Updating Documents

```python
# Update via instance
user.age = 31
await user.save()

# Atomic update operators
from beanie.odm.operators.update.general import Set, Inc
await User.find_one(User.email == "alice@example.com").update(
    Set({User.role: "admin"})
)

# Increment a field
await User.find_one(User.email == "alice@example.com").update(
    Inc({User.age: 1})
)

# Bulk update
await User.find(User.role == "guest").update(Set({User.role: "user"}))
```

## Deleting Documents

```python
await user.delete()
await User.find(User.age < 18).delete()
```

## FastAPI Integration

```python
from fastapi import FastAPI
from pymongo import AsyncMongoClient
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncMongoClient("mongodb://localhost:27017/")
    await init_beanie(database=client["mydb"], document_models=[User])
    yield
    client.close()

app = FastAPI(lifespan=lifespan)

@app.get("/users")
async def list_users():
    return await User.find(User.role == "user").to_list()

@app.post("/users")
async def create(user: User):
    return await user.create()
```

## Summary

Beanie combines Pydantic's type safety with Async PyMongo's MongoDB access. Define documents by extending `beanie.Document`, initialize with `init_beanie()`, and use Pythonic class-based filter syntax for queries. Beanie integrates naturally with FastAPI's lifespan pattern and provides typed, async CRUD operations with automatic validation through Pydantic.
