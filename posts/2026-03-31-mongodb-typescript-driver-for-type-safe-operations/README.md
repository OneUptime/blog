# How to Use the MongoDB TypeScript Driver for Type-Safe Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, TypeScript, Driver, Type-Safe, Interface

Description: Learn how to leverage TypeScript generics in the official MongoDB Node.js driver for fully type-checked collection operations and query results.

---

## Introduction

The official MongoDB Node.js driver has first-class TypeScript support. By passing a document interface as a generic type parameter to `db.collection<T>()`, you get compile-time type checking on insert, find, and update operations - catching field name typos and type mismatches before they reach production.

## Installation

```bash
npm install mongodb
npm install --save-dev @types/node
```

## Defining a Document Interface

```typescript
import { ObjectId } from 'mongodb';

interface Product {
  _id?:      ObjectId;
  name:      string;
  price:     number;
  category:  string;
  inStock:   boolean;
  createdAt: Date;
}
```

## Creating a Typed Collection

```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://localhost:27017');
await client.connect();

const db         = client.db('shop');
const collection = db.collection<Product>('products');
```

## Type-Safe Insert

```typescript
// TypeScript will error if you omit required fields or use wrong types
const result = await collection.insertOne({
  name:      'Laptop',
  price:     999.99,
  category:  'electronics',
  inStock:   true,
  createdAt: new Date(),
});
console.log('Inserted:', result.insertedId);
```

## Type-Safe Find

```typescript
// Return type is inferred as WithId<Product> | null
const product = await collection.findOne({ name: 'Laptop' });
if (product) {
  console.log(product.price.toFixed(2)); // TypeScript knows price is a number
}

// Cursor is typed as FindCursor<WithId<Product>>
const cursor = collection.find({ category: 'electronics' });
for await (const p of cursor) {
  console.log(`${p.name}: $${p.price}`);
}
```

## Type-Safe Update with UpdateFilter

```typescript
import { UpdateFilter } from 'mongodb';

const update: UpdateFilter<Product> = {
  $set:  { price: 899.99 },
  $inc:  {}, // empty but type-checked
};

await collection.updateOne({ name: 'Laptop' }, update);
```

## Projection and Partial Types

```typescript
// Only return name and price
const names = await collection
  .find({}, { projection: { name: 1, price: 1, _id: 0 } })
  .toArray();
```

## Index Creation

```typescript
await collection.createIndex({ category: 1 });
await collection.createIndex({ name: 1 }, { unique: true });
await collection.createIndex({ createdAt: -1 });
```

## Summary

The MongoDB TypeScript driver provides generic typed collections via `db.collection<T>()`. Document interfaces define the shape of your data, and TypeScript's type checker validates every insert, query filter, and update against those interfaces. This eliminates a whole class of runtime errors and improves IDE autocompletion for MongoDB operations in TypeScript projects.
