# How to Use MongoDB with Nuxt.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Nuxt.js, Server, API, Mongoose

Description: Learn how to connect MongoDB to a Nuxt 3 application using server-side API routes and a singleton Mongoose connection for efficient document access.

---

## Introduction

Nuxt 3's `server/api/` directory provides full-stack API endpoints that run on Node.js. Combined with Mongoose, you can query MongoDB directly from these handlers without a separate backend service. A singleton connection module ensures the database pool is reused across requests.

## Installation

```bash
npm install mongoose
```

## Server Plugin for Connection

```typescript
// server/plugins/mongodb.ts
import mongoose from 'mongoose';

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig();
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
});
```

`nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/myapp',
  },
});
```

## Mongoose Model

```typescript
// server/models/product.ts
import mongoose, { Schema, model, models } from 'mongoose';

export interface IProduct {
  name:     string;
  price:    number;
  category: string;
  inStock:  boolean;
}

const ProductSchema = new Schema<IProduct>({
  name:     { type: String,  required: true },
  price:    { type: Number,  required: true },
  category: { type: String,  required: true },
  inStock:  { type: Boolean, default: true  },
});

export const Product = models.Product ?? model<IProduct>('Product', ProductSchema);
```

## API Route - GET All Products

```typescript
// server/api/products/index.get.ts
import { Product } from '~/server/models/product';

export default defineEventHandler(async () => {
  const products = await Product.find({}).sort({ price: 1 }).lean();
  return products;
});
```

## API Route - POST New Product

```typescript
// server/api/products/index.post.ts
import { Product } from '~/server/models/product';
import { readBody } from 'h3';

export default defineEventHandler(async (event) => {
  const body    = await readBody(event);
  const product = await Product.create(body);
  setResponseStatus(event, 201);
  return product;
});
```

## API Route - GET Product by ID

```typescript
// server/api/products/[id].get.ts
import { Product }   from '~/server/models/product';
import { getRouterParam } from 'h3';

export default defineEventHandler(async (event) => {
  const id      = getRouterParam(event, 'id');
  const product = await Product.findById(id).lean();
  if (!product) {
    throw createError({ statusCode: 404, message: 'Product not found' });
  }
  return product;
});
```

## Using useFetch in Pages

```vue
<!-- pages/products.vue -->
<script setup lang="ts">
const { data: products } = await useFetch('/api/products');
</script>

<template>
  <ul>
    <li v-for="p in products" :key="p._id">{{ p.name }} - ${{ p.price }}</li>
  </ul>
</template>
```

## Summary

Nuxt 3 connects MongoDB through a server plugin that calls `mongoose.connect` on startup via Nitro's plugin system. API routes in `server/api/` use `defineEventHandler` with Mongoose models defined once using the `models.X ?? model(...)` guard. Pages consume these endpoints with `useFetch` for seamless server-side and client-side data fetching.
