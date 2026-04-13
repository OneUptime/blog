# How to Use MongoDB with tRPC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, tRPC, TypeScript, Node.js, Database

Description: Learn how to build a type-safe tRPC API backed by MongoDB using the native Node.js driver, with procedures for querying and mutating documents.

---

## Why tRPC with MongoDB

tRPC provides end-to-end type safety between your TypeScript server and client without any code generation. Combined with MongoDB's flexible document model, it makes a powerful stack for full-stack TypeScript apps where you want to avoid the overhead of GraphQL or REST while retaining full type safety.

## Project Setup

```bash
mkdir trpc-mongo && cd trpc-mongo
npm init -y
npm install @trpc/server @trpc/client mongodb zod
npm install -D typescript ts-node @types/node
```

Initialize TypeScript:

```bash
npx tsc --init
```

## Database Connection

```typescript
// src/db.ts
import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);
let db: Db;

export async function getDb(): Promise<Db> {
  if (!db) {
    await client.connect();
    db = client.db('trpc_demo');
  }
  return db;
}
```

## Defining the Router

```typescript
// src/router.ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { getDb } from './db';

const t = initTRPC.create();

const ProductInput = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  inStock: z.boolean().default(true),
  tags: z.array(z.string()).default([])
});

export const appRouter = t.router({
  products: {
    list: t.procedure
      .input(z.object({ inStock: z.boolean().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const filter = input.inStock !== undefined ? { inStock: input.inStock } : {};
        const docs = await db.collection('products').find(filter).sort({ name: 1 }).toArray();
        return docs.map(d => ({ ...d, id: d._id.toString(), _id: undefined }));
      }),

    byId: t.procedure
      .input(z.string())
      .query(async ({ input }) => {
        const db = await getDb();
        const doc = await db.collection('products').findOne({ _id: new ObjectId(input) });
        if (!doc) throw new Error('Product not found');
        return { ...doc, id: doc._id.toString(), _id: undefined };
      }),

    create: t.procedure
      .input(ProductInput)
      .mutation(async ({ input }) => {
        const db = await getDb();
        const result = await db.collection('products').insertOne(input);
        return { id: result.insertedId.toString(), ...input };
      }),

    delete: t.procedure
      .input(z.string())
      .mutation(async ({ input }) => {
        const db = await getDb();
        const result = await db.collection('products').deleteOne({ _id: new ObjectId(input) });
        return { deleted: result.deletedCount === 1 };
      })
  }
});

export type AppRouter = typeof appRouter;
```

## HTTP Server

```typescript
// src/index.ts
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from './router';

const server = createHTTPServer({ router: appRouter });
server.listen(3000);
console.log('tRPC server running on http://localhost:3000');
```

```bash
ts-node src/index.ts
```

## Type-Safe Client

On the client side, import `AppRouter` to get full type inference:

```typescript
// client.ts
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './router';

const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: 'http://localhost:3000' })]
});

const products = await trpc.products.list.query({ inStock: true });
const created = await trpc.products.create.mutate({ name: 'Widget', price: 9.99 });
```

## Summary

tRPC and MongoDB together provide a minimal, type-safe full-stack TypeScript experience. Zod schemas validate inputs at runtime while TypeScript inference propagates types from MongoDB documents to the client automatically. This eliminates REST boilerplate and GraphQL schema overhead for teams building monorepo TypeScript applications.
