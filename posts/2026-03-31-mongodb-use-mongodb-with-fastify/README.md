# How to Use MongoDB with Fastify

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Fastify, Plugin, TypeScript, REST

Description: Learn how to integrate MongoDB into a Fastify application using the fastify-plugin pattern to share a Mongoose connection across all routes.

---

## Introduction

Fastify is a high-performance Node.js web framework with a rich plugin system. The recommended pattern for sharing MongoDB across routes is to wrap the connection in a Fastify plugin using `fastify-plugin`. This ensures the connection is established during Fastify's boot sequence and the disconnect hook is registered at the application root level. Route handlers then access Mongoose models directly through the shared module scope.

## Installation

```bash
npm install fastify fastify-plugin mongoose
npm install --save-dev @types/node typescript
```

## MongoDB Plugin

```typescript
// src/plugins/mongodb.ts
import fp       from 'fastify-plugin';
import mongoose from 'mongoose';
import { FastifyInstance } from 'fastify';

async function mongoPlugin(fastify: FastifyInstance) {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/shop';

  await mongoose.connect(uri);
  fastify.log.info('MongoDB connected');

  fastify.addHook('onClose', async () => {
    await mongoose.disconnect();
    fastify.log.info('MongoDB disconnected');
  });
}

export default fp(mongoPlugin, { name: 'mongodb' });
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

## Route Handler

```typescript
// src/routes/products.ts
import { FastifyInstance } from 'fastify';
import { Product, IProduct } from '../models/product';

export async function productRoutes(fastify: FastifyInstance) {
  fastify.get('/products', async () => {
    return Product.find({}).sort({ price: 1 }).lean();
  });

  fastify.post<{ Body: IProduct }>('/products', async (request, reply) => {
    const product = await Product.create(request.body);
    reply.code(201).send(product);
  });

  fastify.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const product = await Product.findById(request.params.id).lean();
    if (!product) return reply.code(404).send({ error: 'Not found' });
    return product;
  });

  fastify.delete<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    await Product.findByIdAndDelete(request.params.id);
    reply.code(204).send();
  });
}
```

## Application Entry Point

```typescript
// src/app.ts
import Fastify    from 'fastify';
import mongoPlugin from './plugins/mongodb';
import { productRoutes } from './routes/products';

const app = Fastify({ logger: true });

app.register(mongoPlugin);
app.register(productRoutes);

app.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
});
```

## JSON Schema Validation

```typescript
const createSchema = {
  body: {
    type: 'object',
    required: ['name', 'price', 'category'],
    properties: {
      name:     { type: 'string' },
      price:    { type: 'number' },
      category: { type: 'string' },
    },
  },
};

fastify.post('/products', { schema: createSchema }, async (request, reply) => {
  // ...
});
```

## Summary

The Fastify plugin pattern for MongoDB uses `fastify-plugin` to wrap `mongoose.connect` and register a disconnect hook on `onClose`. Route handlers access Mongoose models directly since they share the same Node.js module scope. Fastify's built-in JSON schema validation adds an extra layer of safety before documents reach MongoDB.
