# How to Use MongoDB with Vercel Serverless Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Vercel, Serverless, Mongoose, Next.js

Description: Learn how to connect MongoDB from Vercel Serverless Functions and Next.js API routes using the global connection caching pattern to avoid connection exhaustion.

---

Vercel Serverless Functions run in Node.js containers that may be reused between requests (warm starts) but are not shared across concurrent instances. Caching the MongoDB connection in the Node.js global object prevents reconnecting on every warm invocation and avoids hitting Atlas connection limits.

## Installing Dependencies

```bash
npm install mongoose
```

## Global Connection Cache Utility

Create a shared utility that all API routes import:

```javascript
// lib/mongodb.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

// Use global to persist the connection across hot reloads in development
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectToDatabase;
```

## Next.js App Router Route Handler

```javascript
// app/api/users/route.js
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  await connectToDatabase();
  const users = await User.find().limit(50).lean();
  return NextResponse.json(users);
}

export async function POST(request) {
  await connectToDatabase();
  const body = await request.json();
  const user = await User.create(body);
  return NextResponse.json(user, { status: 201 });
}
```

## Next.js Pages Router API Route

```javascript
// pages/api/products/[id].js
import connectToDatabase from '../../../lib/mongodb';
import Product from '../../../models/Product';

export default async function handler(req, res) {
  await connectToDatabase();

  const { id } = req.query;

  if (req.method === 'GET') {
    const product = await Product.findById(id).lean();
    if (!product) return res.status(404).json({ error: 'Not found' });
    return res.json(product);
  }

  if (req.method === 'PATCH') {
    const product = await Product.findByIdAndUpdate(id, req.body, { new: true });
    return res.json(product);
  }

  if (req.method === 'DELETE') {
    await Product.findByIdAndDelete(id);
    return res.status(204).end();
  }

  res.status(405).json({ error: 'Method not allowed' });
}
```

## Mongoose Model Definition for Next.js

Prevent Mongoose from recompiling models during hot reloads:

```javascript
// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

// Prevent model re-registration on hot reload
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
```

## Setting Environment Variables in Vercel

```bash
# Local development
echo "MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mydb" >> .env.local

# Vercel CLI
vercel env add MONGODB_URI
```

Or set them in the Vercel dashboard under Project Settings > Environment Variables.

## Configuring MongoDB Atlas for Vercel

Vercel functions run from dynamic IP addresses, so allowlist `0.0.0.0/0` in Atlas Network Access for serverless deployments. For production, use Vercel Secure Compute for static egress IPs or configure MongoDB Atlas with VPC peering or AWS PrivateLink.

```text
Atlas Network Access > Add IP Access List Entry > Allow Access from Anywhere (0.0.0.0/0)
```

## Summary

The global connection cache pattern is essential for MongoDB on Vercel. Store the connection on `global.mongoose` so it survives hot reloads in development and warm reuse in production. Use the `mongoose.models.User || mongoose.model(...)` guard to prevent model re-registration errors, and keep `maxPoolSize` small to stay within Atlas connection limits.
