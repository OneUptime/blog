# How to Use MongoDB with Python (PyMongo)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, PyMongo, Database, NoSQL, Tutorial, Backend Development

Description: A complete guide to using MongoDB with Python through PyMongo, covering installation, CRUD operations, indexing, aggregation pipelines, and production best practices.

---

PyMongo is the official MongoDB driver for Python, providing a powerful and intuitive interface for working with MongoDB databases. This guide covers everything from basic setup to advanced patterns for production applications.

## Installation and Setup

```bash
# Install PyMongo
pip install pymongo

# For async support
pip install motor

# For connection string parsing with SRV records (MongoDB Atlas)
pip install "pymongo[srv]"
```

## Basic Connection

```python
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Simple connection
client = MongoClient('mongodb://localhost:27017/')

# Connection with authentication
client = MongoClient(
    'mongodb://username:password@localhost:27017/mydb?authSource=admin'
)

# MongoDB Atlas connection
client = MongoClient(
    'mongodb+srv://username:password@cluster.mongodb.net/mydb?retryWrites=true&w=majority'
)

# Verify connection
try:
    client.admin.command('ping')
    print("Connected successfully!")
except ConnectionFailure:
    print("Connection failed")
```

## Connection Configuration

```python
from pymongo import MongoClient

client = MongoClient(
    host='localhost',
    port=27017,
    username='myuser',
    password='mypassword',
    authSource='admin',
    maxPoolSize=50,
    minPoolSize=10,
    maxIdleTimeMS=30000,
    connectTimeoutMS=10000,
    socketTimeoutMS=30000,
    serverSelectionTimeoutMS=10000,
    retryWrites=True,
    retryReads=True,
    w='majority'
)
```

## Database and Collection Access

```python
# Access database
db = client['mydb']
# Or
db = client.mydb

# Access collection
collection = db['users']
# Or
collection = db.users

# List all databases
print(client.list_database_names())

# List collections in a database
print(db.list_collection_names())
```

## CRUD Operations

### Create Documents

```python
from datetime import datetime

# Insert one document
user = {
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "created_at": datetime.utcnow()
}

result = collection.insert_one(user)
print(f"Inserted ID: {result.inserted_id}")

# Insert multiple documents
users = [
    {"name": "Alice", "email": "alice@example.com", "age": 25},
    {"name": "Bob", "email": "bob@example.com", "age": 35},
    {"name": "Charlie", "email": "charlie@example.com", "age": 28}
]

result = collection.insert_many(users)
print(f"Inserted IDs: {result.inserted_ids}")
```

### Read Documents

```python
from bson.objectid import ObjectId

# Find one document
user = collection.find_one({"email": "john@example.com"})
print(user)

# Find by ObjectId
user = collection.find_one({"_id": ObjectId("507f1f77bcf86cd799439011")})

# Find multiple documents
cursor = collection.find({"age": {"$gte": 25}})
for user in cursor:
    print(user)

# Find with projection (select specific fields)
cursor = collection.find(
    {"age": {"$gte": 25}},
    {"name": 1, "email": 1, "_id": 0}
)

# Sorting and limiting
cursor = collection.find().sort("age", -1).limit(10)

# Skip and limit for pagination
page = 2
per_page = 10
cursor = collection.find().skip((page - 1) * per_page).limit(per_page)

# Count documents
count = collection.count_documents({"age": {"$gte": 25}})
```

### Update Documents

```python
from datetime import datetime

# Update one document
result = collection.update_one(
    {"email": "john@example.com"},
    {"$set": {"age": 31, "updated_at": datetime.utcnow()}}
)
print(f"Modified count: {result.modified_count}")

# Update multiple documents
result = collection.update_many(
    {"age": {"$lt": 30}},
    {"$inc": {"age": 1}}
)
print(f"Modified count: {result.modified_count}")

# Upsert - update or insert if not exists
result = collection.update_one(
    {"email": "new@example.com"},
    {"$set": {"name": "New User", "age": 22}},
    upsert=True
)

# Replace entire document
result = collection.replace_one(
    {"email": "john@example.com"},
    {"name": "John Doe", "email": "john@example.com", "age": 32, "status": "active"}
)
```

### Delete Documents

```python
# Delete one document
result = collection.delete_one({"email": "john@example.com"})
print(f"Deleted count: {result.deleted_count}")

# Delete multiple documents
result = collection.delete_many({"status": "inactive"})
print(f"Deleted count: {result.deleted_count}")
```

## Query Operators

```python
# Comparison operators
collection.find({"age": {"$eq": 30}})     # Equal
collection.find({"age": {"$ne": 30}})     # Not equal
collection.find({"age": {"$gt": 25}})     # Greater than
collection.find({"age": {"$gte": 25}})    # Greater than or equal
collection.find({"age": {"$lt": 30}})     # Less than
collection.find({"age": {"$lte": 30}})    # Less than or equal
collection.find({"age": {"$in": [25, 30, 35]}})    # In array
collection.find({"age": {"$nin": [25, 30, 35]}})   # Not in array

# Logical operators
collection.find({"$and": [{"age": {"$gte": 25}}, {"status": "active"}]})
collection.find({"$or": [{"age": {"$lt": 25}}, {"age": {"$gt": 35}}]})
collection.find({"age": {"$not": {"$gt": 30}}})

# Element operators
collection.find({"phone": {"$exists": True}})
collection.find({"age": {"$type": "int"}})

# Array operators
collection.find({"tags": {"$all": ["python", "mongodb"]}})
collection.find({"tags": {"$size": 3}})
collection.find({"scores": {"$elemMatch": {"$gt": 80, "$lt": 90}}})

# Text search
collection.create_index([("description", "text")])
collection.find({"$text": {"$search": "python mongodb"}})
```

## Indexing

```python
from pymongo import ASCENDING, DESCENDING, TEXT

# Create single field index
collection.create_index("email", unique=True)

# Create compound index
collection.create_index([("last_name", ASCENDING), ("first_name", ASCENDING)])

# Create text index
collection.create_index([("title", TEXT), ("content", TEXT)])

# Create TTL index for automatic document expiration
collection.create_index("created_at", expireAfterSeconds=3600)

# List all indexes
for index in collection.list_indexes():
    print(index)

# Drop an index
collection.drop_index("email_1")
```

## Aggregation Pipeline

```mermaid
graph LR
    A[Documents] --> B[$match]
    B --> C[$group]
    C --> D[$sort]
    D --> E[$project]
    E --> F[Results]
```

```python
# Basic aggregation
pipeline = [
    {"$match": {"status": "active"}},
    {"$group": {
        "_id": "$department",
        "total_salary": {"$sum": "$salary"},
        "avg_age": {"$avg": "$age"},
        "count": {"$sum": 1}
    }},
    {"$sort": {"total_salary": -1}},
    {"$limit": 10}
]

results = collection.aggregate(pipeline)
for doc in results:
    print(doc)

# Complex aggregation with lookup (join)
pipeline = [
    {"$match": {"status": "active"}},
    {"$lookup": {
        "from": "orders",
        "localField": "_id",
        "foreignField": "user_id",
        "as": "user_orders"
    }},
    {"$addFields": {
        "order_count": {"$size": "$user_orders"},
        "total_spent": {"$sum": "$user_orders.amount"}
    }},
    {"$project": {
        "name": 1,
        "email": 1,
        "order_count": 1,
        "total_spent": 1
    }}
]

results = collection.aggregate(pipeline)
```

## Working with GridFS for Large Files

```python
from gridfs import GridFS
import gridfs

# Initialize GridFS
fs = GridFS(db)

# Store a file
with open('/path/to/large_file.pdf', 'rb') as f:
    file_id = fs.put(f, filename='large_file.pdf', content_type='application/pdf')

# Retrieve a file
grid_file = fs.get(file_id)
print(f"Filename: {grid_file.filename}")
print(f"Size: {grid_file.length}")

with open('/path/to/output.pdf', 'wb') as f:
    f.write(grid_file.read())

# Delete a file
fs.delete(file_id)

# List all files
for grid_file in fs.find():
    print(f"{grid_file.filename} - {grid_file.length} bytes")
```

## Transactions

```python
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/?replicaSet=rs0')

def transfer_funds(from_account, to_account, amount):
    with client.start_session() as session:
        with session.start_transaction():
            accounts = client.bank.accounts

            # Debit from source account
            accounts.update_one(
                {"_id": from_account, "balance": {"$gte": amount}},
                {"$inc": {"balance": -amount}},
                session=session
            )

            # Credit to destination account
            accounts.update_one(
                {"_id": to_account},
                {"$inc": {"balance": amount}},
                session=session
            )

            # Transaction commits automatically when context manager exits
            # Rolls back on exception

transfer_funds("account_a", "account_b", 100)
```

## Context Manager Pattern

```python
from contextlib import contextmanager
from pymongo import MongoClient

@contextmanager
def get_mongo_client():
    client = MongoClient('mongodb://localhost:27017/')
    try:
        yield client
    finally:
        client.close()

# Usage
with get_mongo_client() as client:
    db = client.mydb
    result = db.users.find_one({"email": "john@example.com"})
```

## Async Operations with Motor

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.mydb
    collection = db.users

    # Insert
    result = await collection.insert_one({"name": "Async User"})
    print(f"Inserted: {result.inserted_id}")

    # Find
    async for doc in collection.find({"age": {"$gte": 25}}):
        print(doc)

    # Aggregation
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    async for doc in collection.aggregate(pipeline):
        print(doc)

asyncio.run(main())
```

## Data Validation with Pydantic

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    name: str
    email: EmailStr
    age: int = Field(ge=0, le=150)
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Usage
user_data = {"name": "John", "email": "john@example.com", "age": 30}
user = UserModel(**user_data)

# Insert validated data
collection.insert_one(user.model_dump(by_alias=True, exclude_none=True))
```

## Error Handling

```python
from pymongo.errors import (
    ConnectionFailure,
    DuplicateKeyError,
    WriteError,
    BulkWriteError,
    ServerSelectionTimeoutError
)

try:
    result = collection.insert_one({"_id": 1, "name": "Test"})
except DuplicateKeyError as e:
    print(f"Duplicate key error: {e}")
except WriteError as e:
    print(f"Write error: {e}")
except ConnectionFailure as e:
    print(f"Connection failed: {e}")
except ServerSelectionTimeoutError as e:
    print(f"Server selection timeout: {e}")
```

## Production Best Practices

1. **Always use connection pooling** - Configure appropriate pool sizes
2. **Create indexes** - Index fields used in queries
3. **Use projections** - Only fetch fields you need
4. **Batch operations** - Use `insert_many` and `bulk_write` for multiple operations
5. **Handle errors gracefully** - Implement retry logic for transient failures
6. **Close connections** - Use context managers or explicitly close clients

```python
# Bulk write operations
from pymongo import InsertOne, UpdateOne, DeleteOne

operations = [
    InsertOne({"name": "User 1"}),
    UpdateOne({"name": "User 2"}, {"$set": {"status": "active"}}),
    DeleteOne({"name": "User 3"})
]

result = collection.bulk_write(operations, ordered=False)
```

## Summary

PyMongo provides a comprehensive and Pythonic interface for MongoDB operations. From basic CRUD operations to complex aggregation pipelines and transactions, PyMongo handles it all. By following the patterns and best practices in this guide, you can build robust, scalable Python applications backed by MongoDB.
