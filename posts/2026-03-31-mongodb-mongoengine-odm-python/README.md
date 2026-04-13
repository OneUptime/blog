# How to Use MongoEngine ODM with MongoDB and Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, MongoEngine, ODM, Schema

Description: Learn how to define MongoEngine documents, perform CRUD operations, and use query sets to interact with MongoDB using a Django-like Python ODM.

---

## Overview

MongoEngine is a Python ODM (Object-Document Mapper) for MongoDB that provides a Django-inspired API. You define document classes with typed fields, and MongoEngine handles serialization, validation, and queries through a clean object-oriented interface.

## Installation

```bash
pip install mongoengine
```

## Connecting to MongoDB

```python
import mongoengine as me

me.connect(
    db="mydb",
    host="mongodb://localhost:27017/mydb",
    alias="default"
)
```

## Defining Documents

```python
from mongoengine import Document, EmbeddedDocument, fields

class Address(EmbeddedDocument):
    street = fields.StringField(required=True)
    city   = fields.StringField(required=True)
    zip    = fields.StringField(max_length=10)

class User(Document):
    name      = fields.StringField(required=True, max_length=100)
    email     = fields.EmailField(required=True, unique=True)
    age       = fields.IntField(min_value=0, max_value=120)
    role      = fields.StringField(choices=["admin", "user", "guest"], default="user")
    address   = fields.EmbeddedDocumentField(Address)
    tags      = fields.ListField(fields.StringField())
    createdAt = fields.DateTimeField()

    meta = {
        "collection": "users",
        "indexes":    ["email", "-createdAt"]
    }
```

## Creating Documents

```python
from datetime import datetime

user = User(
    name="Alice",
    email="alice@example.com",
    age=30,
    role="admin",
    address=Address(street="123 Main St", city="Springfield", zip="12345"),
    tags=["python", "mongodb"],
    createdAt=datetime.utcnow()
)
user.save()

# Or use create() shorthand
User.objects.create(name="Bob", email="bob@example.com")
```

## Querying with QuerySets

```python
# Find one
user = User.objects(email="alice@example.com").first()

# Find multiple with filter
admins = User.objects(role="admin", age__gte=25).order_by("-createdAt")
for admin in admins:
    print(admin.name)

# Count
count = User.objects(role="user").count()

# Exclude fields
users = User.objects.only("name", "email")

# Limit and skip
page2 = User.objects.skip(20).limit(10)
```

## Updating Documents

```python
# Update one document
user = User.objects(email="alice@example.com").first()
user.age = 31
user.save()

# Atomic update
User.objects(email="alice@example.com").update_one(set__age=31, push__tags="mentor")

# Bulk update
User.objects(role="guest").update(set__role="user")
```

## Deleting Documents

```python
user.delete()                               # instance delete
User.objects(role="guest").delete()         # bulk delete
```

## Reference Fields

```python
class Post(Document):
    title  = fields.StringField(required=True)
    author = fields.ReferenceField(User, reverse_delete_rule=me.CASCADE)
    body   = fields.StringField()

post = Post.objects(title="Hello").first()
print(post.author.name)  # auto-dereferenced
```

## Summary

MongoEngine provides a Django-like ODM with strongly-typed `Document` classes, embedded documents, and a fluent `QuerySet` API. Connect with `me.connect()`, define documents with typed fields, and query using `Model.objects()` with operator syntax (`age__gte`, `role__in`). Use `update_one` with atomic operators for thread-safe updates and `ReferenceField` with `reverse_delete_rule` for cascading deletes.
