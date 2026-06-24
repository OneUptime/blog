# How to Use MongoDB with Koa.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Koa.js, Middleware, TypeScript, REST

Description: Learn how to integrate MongoDB into a Koa.js application using middleware for connection management and koa-router for typed REST endpoints.

---

## Introduction

Koa.js is a lightweight Node.js web framework from the Express team, using async middleware for a cleaner control flow. MongoDB integrates through Mongoose, connecting once at startup so all route handlers can use Mongoose models directly without managing connections manually.

## Installation

```bash
npm install koa koa-router koa-bodyparser mongoose
npm install --save-dev @types/koa @types/koa-router @types/koa-bodyparser typescript
```

## Application Setup

```typescript
// src/app.ts
import Koa        from 'koa';
import Router     from 'koa-router';
import bodyParser from 'koa-bodyparser';
import mongoose   from 'mongoose';

const app    = new Koa();
const router = new Router();

// Connect to MongoDB once at startup
async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/shop');
  console.log('MongoDB connected');
}

app.use(bodyParser());
```

## Mongoose Model

```typescript
// src/models/product.ts
import { Schema, model, models } from 'mongoose';

export interface IProduct {
  name:     string;
  price:    number;
  category: string;
  inStock:  boolean;
}

const schema = new Schema<IProduct>(
  { name: String, price: Number, category: String, inStock: { type: Boolean, default: true } },
  { timestamps: true }
);

export const Product = models.Product ?? model<IProduct>('Product', schema);
```

## Error Handling Middleware

```typescript
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err: any) {
    ctx.status = err.status ?? 500;
    ctx.body   = { error: err.message };
    ctx.app.emit('error', err, ctx);
  }
});
```

## Route Handlers

```typescript
// GET /products
router.get('/products', async (ctx) => {
  const category = ctx.query.category as string | undefined;
  const filter   = category ? { category } : {};
  const products = await Product.find(filter).sort({ price: 1 }).lean();
  ctx.body   = products;
  ctx.status = 200;
});

// POST /products
router.post('/products', async (ctx) => {
  const body    = ctx.request.body as IProduct;
  const product = await Product.create(body);
  ctx.body   = product;
  ctx.status = 201;
});

// GET /products/:id
router.get('/products/:id', async (ctx) => {
  const product = await Product.findById(ctx.params.id).lean();
  if (!product) {
    ctx.status = 404;
    ctx.body   = { error: 'Product not found' };
    return;
  }
  ctx.body   = product;
  ctx.status = 200;
});

// DELETE /products/:id
router.delete('/products/:id', async (ctx) => {
  await Product.findByIdAndDelete(ctx.params.id);
  ctx.status = 204;
});

app.use(router.routes());
app.use(router.allowedMethods());
```

## Starting the Server

```typescript
async function main() {
  await connectDB();
  app.listen(3000, () => console.log('Listening on port 3000'));
}

main().catch(console.error);
```

## Summary

Koa.js integrates with MongoDB by calling `mongoose.connect` before starting the HTTP server. Routes use async middleware with `ctx.body` and `ctx.status` for responses. An error-handling middleware registered before the routes catches any thrown exceptions and returns structured error responses. Koa's promise-based middleware stack makes async MongoDB operations straightforward.
