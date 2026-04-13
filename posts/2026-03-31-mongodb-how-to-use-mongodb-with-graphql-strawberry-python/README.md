# How to Use MongoDB with GraphQL (Strawberry for Python)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GraphQL, Strawberry, Python, Database

Description: Build a type-safe GraphQL API backed by MongoDB in Python using Strawberry and Motor (async MongoDB driver), with queries and mutations.

---

## Why Strawberry and MongoDB

Strawberry generates a GraphQL schema directly from Python type annotations, making it clean and type-safe. Paired with Motor - the async MongoDB driver - you get a fully non-blocking GraphQL API that scales well under concurrent load.

## Installation

```bash
pip install strawberry-graphql[fastapi] motor python-dotenv
```

## MongoDB Connection

```python
# db.py
import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
db = client["graphql_demo"]
products_collection = db["products"]
```

## Defining Types

```python
# models.py
import strawberry
from typing import Optional, List

@strawberry.type
class Product:
    id: str
    name: str
    price: float
    in_stock: bool
    tags: List[str]

@strawberry.input
class ProductInput:
    name: str
    price: float
    in_stock: bool = True
    tags: List[str] = strawberry.field(default_factory=list)
```

## Resolvers

```python
# resolvers.py
from bson import ObjectId
from db import products_collection
from models import Product, ProductInput
from typing import Optional, List

def doc_to_product(doc: dict) -> Product:
    return Product(
        id=str(doc["_id"]),
        name=doc["name"],
        price=doc["price"],
        in_stock=doc.get("in_stock", True),
        tags=doc.get("tags", [])
    )

async def get_products(in_stock: Optional[bool] = None) -> List[Product]:
    query = {}
    if in_stock is not None:
        query["in_stock"] = in_stock
    cursor = products_collection.find(query).sort("name", 1)
    return [doc_to_product(doc) async for doc in cursor]

async def get_product(id: str) -> Optional[Product]:
    doc = await products_collection.find_one({"_id": ObjectId(id)})
    return doc_to_product(doc) if doc else None

async def create_product(input: ProductInput) -> Product:
    data = {
        "name": input.name,
        "price": input.price,
        "in_stock": input.in_stock,
        "tags": input.tags
    }
    result = await products_collection.insert_one(data)
    data["_id"] = result.inserted_id
    return doc_to_product(data)
```

## Schema and FastAPI App

```python
# main.py
import strawberry
from strawberry.fastapi import GraphQLRouter
from fastapi import FastAPI
from typing import Optional, List
from resolvers import get_products, get_product, create_product
from models import Product, ProductInput

@strawberry.type
class Query:
    @strawberry.field
    async def products(self, in_stock: Optional[bool] = None) -> List[Product]:
        return await get_products(in_stock)

    @strawberry.field
    async def product(self, id: str) -> Optional[Product]:
        return await get_product(id)

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_product(self, input: ProductInput) -> Product:
        return await create_product(input)

schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_app = GraphQLRouter(schema)

app = FastAPI()
app.include_router(graphql_app, prefix="/graphql")
```

## Running the Server

```bash
uvicorn main:app --reload --port 8000
```

Open `http://localhost:8000/graphql` and run:

```graphql
mutation {
  createProduct(input: { name: "Widget", price: 9.99, tags: ["gadget"] }) {
    id
    name
    price
  }
}
```

## Summary

Strawberry's code-first approach and Motor's async driver create a natural fit for building MongoDB-backed GraphQL APIs in Python. The combination is fully async end-to-end, integrates cleanly with FastAPI, and lets you define your GraphQL schema directly from Python dataclasses - no separate SDL files needed.
