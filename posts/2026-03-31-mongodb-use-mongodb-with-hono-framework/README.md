# How to Use MongoDB with Hono Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Hono, TypeScript, REST, Middleware

Description: Learn how to integrate MongoDB into a Hono web application using middleware for database connection and typed route handlers with Mongoose.

---

## Introduction

Hono is an ultra-fast, lightweight web framework that runs on Node.js, Deno, Bun, and edge runtimes. Its middleware system and context-based approach make it easy to share a MongoDB connection across all route handlers. This guide uses Mongoose with TypeScript on Node.js.

## Installation

```bash
npm install hono @hono/node-server mongoose
npm install --save-dev typescript @types/node
```

## Database Connection

```typescript
// src/db.ts
import mongoose from 'mongoose';

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected) return;
  await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/shop');
  connected = true;
  console.log('MongoDB connected');
}
```

## Mongoose Model

```typescript
// src/models/product.ts
import mongoose, { Schema, model, models } from 'mongoose';

export interface IProduct {
  name:     string;
  price:    number;
  category: string;
  inStock:  boolean;
}

const schema = new Schema<IProduct>({
  name:     { type: String,  required: true },
  price:    { type: Number,  required: true },
  category: { type: String,  required: true },
  inStock:  { type: Boolean, default: true  },
}, { timestamps: true });

export const Product = models.Product ?? model<IProduct>('Product', schema);
```

## Hono Application

```typescript
// src/index.ts
import { serve }      from '@hono/node-server';
import { Hono }       from 'hono';
import { connectDB }  from './db';
import { Product, IProduct } from './models/product';

const app = new Hono();

// DB middleware
app.use('*', async (c, next) => {
  await connectDB();
  await next();
});

// GET all products
app.get('/products', async (c) => {
  const products = await Product.find({}).sort({ price: 1 }).lean();
  return c.json(products);
});

// POST create product
app.post('/products', async (c) => {
  const body    = await c.req.json<IProduct>();
  const product = await Product.create(body);
  return c.json(product, 201);
});

// GET product by id
app.get('/products/:id', async (c) => {
  const id      = c.req.param('id');
  const product = await Product.findById(id).lean();
  if (!product) return c.json({ error: 'Not found' }, 404);
  return c.json(product);
});

// DELETE product
app.delete('/products/:id', async (c) => {
  const id = c.req.param('id');
  await Product.findByIdAndDelete(id);
  return c.body(null, 204);
});

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log('Listening on port 3000');
});
```

## Error Handling

```typescript
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));
```

## Summary

Hono uses a simple middleware chain where `app.use('*', ...)` runs before every route handler. Calling `connectDB()` in this middleware ensures the database is available for all routes. Route handlers extract parameters via `c.req.param()`, parse bodies with `c.req.json()`, and return responses using `c.json()`. Hono's minimal API makes it easy to build fast MongoDB-backed services.
