# How to Perform CRUD Operations with PyMongo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, PyMongo, CRUD, Database

Description: Learn how to perform create, read, update, and delete operations with PyMongo using practical Python code examples for MongoDB collections.

---

## Overview

PyMongo provides a straightforward API for CRUD operations on MongoDB collections. All operations are performed on `Collection` objects and return result objects with metadata about the operation.

## Setup

```python
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId

client = MongoClient("mongodb://localhost:27017/")
db     = client["shop"]
col    = db["products"]
```

## Create (Insert)

```python
# Insert one document
result = col.insert_one({
    "name":     "Laptop",
    "price":    999.99,
    "category": "electronics",
    "inStock":  True
})
print("Inserted ID:", result.inserted_id)

# Insert multiple documents
result = col.insert_many([
    {"name": "Mouse",    "price": 29.99, "category": "electronics"},
    {"name": "Keyboard", "price": 49.99, "category": "electronics"}
])
print("Inserted count:", len(result.inserted_ids))
```

## Read (Find)

```python
# Find one document
product = col.find_one({"name": "Laptop"})
print(product)

# Find multiple with filter and projection
products = list(col.find(
    {"price": {"$lt": 100}},
    {"name": 1, "price": 1, "_id": 0}
))
print(products)

# Sort and limit
top5 = list(col.find({"inStock": True}).sort("price", DESCENDING).limit(5))

# Find by ObjectId
doc = col.find_one({"_id": ObjectId("64abc123...")})
```

## Update

```python
# Update one document
result = col.update_one(
    {"name": "Laptop"},
    {"$set": {"price": 899.99}, "$inc": {"views": 1}}
)
print("Modified:", result.modified_count)

# Update multiple documents
result = col.update_many(
    {"category": "electronics"},
    {"$set": {"featured": True}}
)
print("Modified:", result.modified_count)

# Upsert - insert if not found
result = col.update_one(
    {"name": "Headphones"},
    {"$set": {"price": 79.99, "category": "electronics"}},
    upsert=True
)
print("Upserted ID:", result.upserted_id)
```

## Delete

```python
# Delete one document
result = col.delete_one({"name": "Mouse"})
print("Deleted:", result.deleted_count)

# Delete multiple documents
result = col.delete_many({"inStock": False})
print("Deleted:", result.deleted_count)
```

## Replace a Document

`replace_one` replaces the entire document except `_id`:

```python
result = col.replace_one(
    {"name": "Keyboard"},
    {"name": "Mechanical Keyboard", "price": 89.99, "category": "electronics"}
)
```

## Counting Documents

```python
# Count with filter
count = col.count_documents({"inStock": True})
print("In stock:", count)

# Estimated count (faster, uses metadata)
approx = col.estimated_document_count()
```

## Error Handling

```python
from pymongo.errors import DuplicateKeyError, PyMongoError

try:
    col.insert_one({"_id": "duplicate", "name": "Test"})
    col.insert_one({"_id": "duplicate", "name": "Test2"})
except DuplicateKeyError as e:
    print("Duplicate key error:", e.details)
except PyMongoError as e:
    print("MongoDB error:", e)
```

## Summary

PyMongo's CRUD API mirrors MongoDB shell commands: `insert_one`, `insert_many`, `find_one`, `find`, `update_one`, `update_many`, `delete_one`, and `delete_many`. Results include `inserted_id`, `modified_count`, and `deleted_count` metadata. Use `upsert=True` on updates to insert if no match is found, and wrap operations in try-except to handle `DuplicateKeyError` and other PyMongo exceptions.
