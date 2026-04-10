# How to Use redis-om-python for Object Mapping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Object Mapping, RedisOM

Description: Learn how to use redis-om-python to map Python objects to Redis data structures, simplifying CRUD operations with models and search.

---

redis-om-python is an object-mapping library that lets you define Python models backed by Redis. It supports JSON and Hash storage, automatic indexing, and a fluent query API - making Redis feel like a document database.

## Installation

```bash
pip install redis-om
```

Make sure you have Redis Stack (or Redis with the RedisJSON and RediSearch modules) running:

```bash
docker run -d -p 6379:6379 redis/redis-stack-server:latest
```

## Defining a Model

```python
from redis_om import HashModel, Field

class Product(HashModel):
    name: str = Field(index=True, full_text_search=True)
    price: float
    category: str = Field(index=True)
    in_stock: bool = True

    class Meta:
        global_key_prefix = "shop"
```

`HashModel` stores each field as a Redis hash entry. Use `JsonModel` if you need nested objects.

## Creating and Saving Records

```python
from redis_om import Migrator

# Run index migration once at startup
Migrator().run()

product = Product(
    name="Wireless Keyboard",
    price=49.99,
    category="Electronics"
)
product.save()
print(product.pk)  # auto-generated primary key
```

## Reading and Updating

```python
# Fetch by primary key
found = Product.get(product.pk)
print(found.name)

# Update a field
found.price = 44.99
found.save()
```

## Querying with Expressions

```python
# Find all electronics
results = Product.find(Product.category == "Electronics").all()

# Find by name and in_stock
keyboards = Product.find(
    (Product.name % "Keyboard") & (Product.in_stock == True)
).all()

for p in keyboards:
    print(p.name, p.price)
```

The `%` operator performs a full-text search on fields that have `full_text_search=True` set.

## Using JsonModel for Nested Data

```python
from redis_om import JsonModel, EmbeddedJsonModel

class Address(EmbeddedJsonModel):
    street: str
    city: str

class Customer(JsonModel):
    name: str = Field(index=True)
    email: str
    address: Address

    class Meta:
        global_key_prefix = "crm"
```

```python
customer = Customer(
    name="Alice",
    email="alice@example.com",
    address=Address(street="123 Main St", city="Springfield")
)
customer.save()
```

## Deleting Records

```python
Product.delete(product.pk)
```

## Connecting to a Custom Redis Instance

```python
import os
from redis_om import get_redis_connection

redis = get_redis_connection(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=6379,
    decode_responses=True
)

class Product(HashModel):
    name: str

    class Meta:
        database = redis
```

## Summary

redis-om-python provides a Pydantic-based model layer over Redis, enabling you to define, save, query, and delete objects without writing raw Redis commands. It supports both Hash and JSON storage models, automatic field indexing, and expressive query syntax - making it ideal for Python applications that need Redis as a primary data store.
