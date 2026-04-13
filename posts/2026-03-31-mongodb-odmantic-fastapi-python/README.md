# How to Use Odmantic with MongoDB and FastAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, Odmantic, FastAPI, ODM

Description: Learn how to use Odmantic, a Pydantic-based async ODM for MongoDB, to build type-safe CRUD APIs with FastAPI and Motor in Python.

---

## Overview

Odmantic is a modern async ODM for MongoDB that uses Pydantic models as the schema definition layer and Motor as the async driver. It provides a clean, type-safe API that integrates seamlessly with FastAPI's dependency injection and OpenAPI documentation.

## Installation

```bash
pip install odmantic
```

## Defining a Model

Odmantic models extend `odmantic.Model`:

```python
from typing import List
from odmantic import Model, Field
from datetime import datetime

class Product(Model):
    name:       str
    price:      float
    category:   str
    tags:       List[str] = []
    inStock:    bool = True
    createdAt:  datetime = Field(default_factory=datetime.utcnow)

    model_config = {"collection": "products"}
```

## Creating the AIOEngine

`AIOEngine` is the async engine that wraps Motor:

```python
from motor.motor_asyncio import AsyncIOMotorClient
from odmantic import AIOEngine

client = AsyncIOMotorClient("mongodb://localhost:27017/")
engine = AIOEngine(client=client, database="shop")
```

## CRUD Operations

```python
import asyncio
from odmantic import AIOEngine
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    engine = AIOEngine(client=client, database="shop")

    # Create
    product = Product(name="Laptop", price=999.99, category="electronics")
    await engine.save(product)
    print("Saved:", product.id)

    # Find one
    found = await engine.find_one(Product, Product.name == "Laptop")

    # Find many
    items = await engine.find(Product, Product.price < 100, sort=Product.price)

    # Update
    found.price = 899.99
    await engine.save(found)

    # Delete
    await engine.delete(found)

asyncio.run(main())
```

## FastAPI Integration

```python
from typing import List
from fastapi import FastAPI, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from odmantic import AIOEngine, ObjectId
from contextlib import asynccontextmanager

engine: AIOEngine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    engine = AIOEngine(client=client, database="shop")
    yield
    client.close()

app = FastAPI(lifespan=lifespan)

def get_engine() -> AIOEngine:
    return engine

@app.get("/products", response_model=List[Product])
async def list_products(eng: AIOEngine = Depends(get_engine)):
    return await eng.find(Product, sort=Product.price)

@app.post("/products", response_model=Product)
async def create_product(product: Product, eng: AIOEngine = Depends(get_engine)):
    return await eng.save(product)

@app.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: ObjectId, eng: AIOEngine = Depends(get_engine)):
    product = await eng.find_one(Product, Product.id == product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.delete("/products/{product_id}")
async def delete_product(product_id: ObjectId, eng: AIOEngine = Depends(get_engine)):
    product = await eng.find_one(Product, Product.id == product_id)
    if product:
        await eng.delete(product)
    return {"deleted": True}
```

## Filtering and Sorting

```python
# Multiple filters
results = await engine.find(
    Product,
    Product.category == "electronics",
    Product.inStock == True,
    sort=Product.price
)

# Limit and skip
page = await engine.find(Product, skip=20, limit=10)
```

## Summary

Odmantic combines Pydantic models with Motor's async MongoDB driver via `AIOEngine`. Define models by extending `odmantic.Model`, create an engine with a Motor client, and use `engine.save()`, `engine.find()`, `engine.find_one()`, and `engine.delete()` for CRUD. Odmantic's Pydantic-based models integrate directly with FastAPI's type system, enabling automatic request validation and OpenAPI schema generation.
