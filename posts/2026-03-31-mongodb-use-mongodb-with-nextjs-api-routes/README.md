# How to Use MongoDB with Next.js API Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Next.js, API, Mongoose, Route

Description: Learn how to connect MongoDB to a Next.js application via API routes, with a cached connection helper to prevent repeated connections during development.

---

## Introduction

Next.js API routes provide serverless function endpoints. Because serverless environments create new Node.js instances on each deployment (and hot-reload frequently in development), it's important to cache the MongoDB connection so you don't exhaust the connection pool. This guide shows the standard cached-connection pattern.

## Installation

```bash
npm install mongoose
```

## Cached Connection Helper

Create a reusable connection module that caches the connection across hot reloads:

```typescript
// lib/dbConnect.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in .env.local');
}

interface MongooseCache {
  conn:    typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

let cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };
global.mongoose = cached;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
```

## Mongoose Model

```typescript
// models/Product.ts
import { Schema, model, models } from 'mongoose';

interface IProduct {
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

## API Route Handler

```typescript
// app/api/products/route.ts  (Next.js 13+ App Router)
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Product }   from '@/models/Product';

export async function GET() {
  await dbConnect();
  const products = await Product.find({}).lean();
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const body    = await req.json();
  const product = await Product.create(body);
  return NextResponse.json(product, { status: 201 });
}
```

## Pages Router (Legacy)

```typescript
// pages/api/products/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { dbConnect } from '@/lib/dbConnect';
import { Product }   from '@/models/Product';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === 'GET') {
    const products = await Product.find({}).lean();
    return res.status(200).json(products);
  }
  if (req.method === 'POST') {
    const product = await Product.create(req.body);
    return res.status(201).json(product);
  }
  res.status(405).end();
}
```

## Summary

The key pattern for MongoDB in Next.js is the cached connection helper that stores the Mongoose connection in a global variable, preventing connection pool exhaustion during development hot-reloads and serverless cold starts. Always call `dbConnect()` at the top of each API handler, and use `models.Product ?? model(...)` to avoid re-registering models across hot reloads.
