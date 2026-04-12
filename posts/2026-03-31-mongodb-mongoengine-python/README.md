# How to Use MongoEngine with Python for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MongoEngine, Python, ODM, Document

Description: Learn how to use MongoEngine, a Python ODM for MongoDB, to define document schemas, connect to databases, and perform CRUD operations with clean Pythonic code.

---

MongoEngine is an Object-Document Mapper (ODM) for Python that lets you interact with MongoDB using Python classes instead of raw dictionaries. It bridges the gap between Python's object model and MongoDB's document model, making your code more maintainable and type-safe.

## Installing MongoEngine

Install MongoEngine using pip:

```bash
pip install mongoengine
```

MongoEngine depends on PyMongo, which is installed automatically.

## Connecting to MongoDB

Use the `connect()` function to establish a connection:

```python
from mongoengine import connect

# Connect to local MongoDB
connect("mydb", host="localhost", port=27017)

# Connect with a URI
connect(host="mongodb://localhost:27017/mydb")

# Connect to MongoDB Atlas
connect(host="mongodb+srv://user:pass@cluster.mongodb.net/mydb")
```

## Defining Document Schemas

MongoEngine uses Python classes that inherit from `Document` to define schemas:

```python
from mongoengine import Document, StringField, IntField, DateTimeField, ListField
from datetime import datetime

class User(Document):
    username = StringField(required=True, unique=True, max_length=50)
    email = StringField(required=True)
    age = IntField(min_value=0, max_value=150)
    tags = ListField(StringField())
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        "collection": "users",
        "indexes": ["username", "email"]
    }
```

The `meta` dictionary controls collection naming and indexes.

## CRUD Operations

**Creating documents:**

```python
user = User(
    username="alice",
    email="alice@example.com",
    age=30,
    tags=["python", "mongodb"]
)
user.save()

# Or use create() shorthand
User.objects.create(username="bob", email="bob@example.com", age=25)
```

**Querying documents:**

```python
# Find all
all_users = User.objects.all()

# Filter
young_users = User.objects(age__lt=30)

# Get a single document
user = User.objects.get(username="alice")

# First match
user = User.objects(tags="python").first()
```

**Updating documents:**

```python
user = User.objects.get(username="alice")
user.age = 31
user.save()

# Atomic update
User.objects(username="alice").update(set__age=31)
```

**Deleting documents:**

```python
user = User.objects.get(username="alice")
user.delete()

# Delete multiple
User.objects(age__lt=18).delete()
```

## Validation and Field Types

MongoEngine provides rich field types with built-in validation:

```python
from mongoengine import Document, StringField, FloatField, BooleanField, ValidationError

class Product(Document):
    name = StringField(required=True)
    price = FloatField(min_value=0.0)
    in_stock = BooleanField(default=True)

    def clean(self):
        # Custom validation
        if self.price is not None and self.price > 10000:
            raise ValidationError("Price exceeds maximum allowed value")
```

## Query Operators

MongoEngine uses double-underscore syntax for MongoDB query operators:

```python
# Comparison
User.objects(age__gte=18, age__lte=65)

# String matching
User.objects(username__icontains="alice")
User.objects(email__endswith="@example.com")

# Array membership
User.objects(tags__in=["python", "mongodb"])

# Existence check
User.objects(age__exists=True)
```

## Summary

MongoEngine provides a clean, Pythonic interface for working with MongoDB. By defining document classes with typed fields, you gain schema validation, IDE autocompletion, and readable query syntax. The ODM handles connection management, serialization, and the translation between Python objects and BSON documents - letting you focus on your application logic rather than database plumbing.
