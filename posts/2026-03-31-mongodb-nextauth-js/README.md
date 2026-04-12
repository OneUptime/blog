# How to Use NextAuth.js with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, NextAuth, Authentication, Next.js, Adapter

Description: Learn how to configure NextAuth.js with MongoDB using the official adapter to persist sessions, users, and accounts in your database.

---

## Overview

NextAuth.js is the most popular authentication library for Next.js. When you need to persist user accounts and sessions in MongoDB, the `@auth/mongodb-adapter` connects NextAuth.js to your database with minimal configuration.

## Installation

```bash
npm install next-auth @auth/mongodb-adapter mongodb
```

## Setting Up the MongoDB Client

Create a reusable MongoDB client module to avoid creating new connections on every request:

```javascript
// lib/mongodb.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
```

## Configuring NextAuth with the MongoDB Adapter

```javascript
// app/api/auth/[...nextauth]/route.js  (Next.js App Router)
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: 'database',
  },
});

export const { GET, POST } = handlers;
```

## Collections Created by the Adapter

The MongoDB adapter automatically creates and manages four collections:

```text
users          - Stores user profiles
accounts       - Stores OAuth account links per user
sessions       - Stores active database sessions
verificationTokens - Stores email verification tokens
```

## Adding Custom User Fields

To store extra data on users, use the `events` callbacks:

```javascript
import { ObjectId } from 'mongodb';

callbacks: {
  async session({ session, user }) {
    session.user.role = user.role;
    session.user.id   = user.id;
    return session;
  },
},
events: {
  async createUser({ user }) {
    const client = await clientPromise;
    await client.db().collection('users').updateOne(
      { _id: new ObjectId(user.id) },
      { $set: { role: 'member', createdAt: new Date() } }
    );
  },
},
```

## Environment Variables

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mydb
AUTH_SECRET=your-random-secret
AUTH_URL=https://yourapp.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Recommended Indexes

Create indexes on the adapter collections to improve session lookup performance:

```javascript
db.sessions.createIndex({ sessionToken: 1 }, { unique: true });
db.sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
db.users.createIndex({ email: 1 }, { unique: true });
db.accounts.createIndex({ providerAccountId: 1, provider: 1 });
```

The TTL index on `sessions.expires` automatically removes expired sessions.

## Summary

Integrating NextAuth.js with MongoDB requires three steps: install the adapter, create a shared MongoClient module, and pass the client promise to `MongoDBAdapter`. The adapter handles all session and user persistence automatically. Add recommended indexes and TTL configuration to ensure optimal performance and automatic cleanup of expired sessions.
