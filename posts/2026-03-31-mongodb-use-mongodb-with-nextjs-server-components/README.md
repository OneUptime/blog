# How to Use MongoDB with Next.js Server Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Next.js, Server Component, Mongoose, App Router

Description: Learn how to fetch MongoDB data directly inside Next.js App Router Server Components for zero-client-bundle database access with built-in caching.

---

## Introduction

Next.js App Router Server Components run exclusively on the server, making them ideal for fetching data directly from MongoDB without exposing connection strings to the client. Because they are async React components, you can `await` database calls at the top level - no `useEffect` or `useState` required.

## Connection Helper

```typescript
// lib/mongodb.ts
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // Re-use connection in development
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  client        = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
```

## Server Component - Product List

```typescript
// app/products/page.tsx
import clientPromise from '@/lib/mongodb';

interface Product {
  _id:      string;
  name:     string;
  price:    number;
  category: string;
}

export default async function ProductsPage() {
  const client   = await clientPromise;
  const products = await client
    .db('shop')
    .collection<Product>('products')
    .find({})
    .sort({ price: 1 })
    .limit(20)
    .toArray();

  return (
    <main>
      <h1>Products</h1>
      <ul>
        {products.map((p) => (
          <li key={p._id.toString()}>
            {p.name} - ${p.price}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

## Server Component with Params

```typescript
// app/products/[id]/page.tsx
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { notFound } from 'next/navigation';

interface Product {
  _id:      ObjectId;
  name:     string;
  price:    number;
  category: string;
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client  = await clientPromise;
  const product = await client
    .db('shop')
    .collection<Product>('products')
    .findOne({ _id: new ObjectId(id) });

  if (!product) notFound();

  return (
    <article>
      <h1>{product.name}</h1>
      <p>Price: ${product.price}</p>
      <p>Category: {product.category}</p>
    </article>
  );
}
```

## Caching with React.cache

To deduplicate database calls within a single render pass, wrap your data fetch with `React.cache`:

```typescript
// lib/getProducts.ts
import clientPromise from '@/lib/mongodb';
import { cache } from 'react';
import type { WithId } from 'mongodb';

interface Product {
  name:     string;
  price:    number;
  category: string;
}

export const getProducts = cache(async (): Promise<WithId<Product>[]> => {
  const client = await clientPromise;
  return client
    .db('shop')
    .collection<Product>('products')
    .find({})
    .toArray();
});
```

## generateStaticParams for SSG

```typescript
// app/products/[id]/page.tsx
export async function generateStaticParams() {
  const client   = await clientPromise;
  const products = await client.db('shop').collection('products').find({}, { projection: { _id: 1 } }).toArray();
  return products.map((p) => ({ id: p._id.toString() }));
}
```

## Summary

Next.js Server Components allow direct MongoDB queries inside async component functions. Use a singleton `clientPromise` to reuse connections, `React.cache` to deduplicate requests within a render, `notFound()` for missing documents, and `generateStaticParams` to pre-render product pages at build time. No client-side code or API routes are needed for read-only data.
