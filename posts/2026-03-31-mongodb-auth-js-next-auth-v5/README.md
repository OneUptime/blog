# How to Use Auth.js (next-auth v5) with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Auth.js, Authentication, Next.js, Session

Description: Learn how to configure Auth.js (next-auth v5) with MongoDB using the updated adapter API for secure session and user management.

---

## Overview

Auth.js (formerly NextAuth.js v5) introduces a new unified API that works with Next.js, SvelteKit, and other frameworks. The MongoDB adapter is provided via `@auth/mongodb-adapter` and supports the new `auth()` helper and route handlers.

## Installation

```bash
npm install next-auth @auth/mongodb-adapter mongodb
```

## Creating the Shared MongoDB Client

```javascript
// lib/mongodb.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default clientPromise;
```

## Configuring Auth.js

In Auth.js v5, configuration lives in a single `auth.js` (or `auth.ts`) file at the project root:

```javascript
// auth.js
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './lib/mongodb';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: 'jwt' },
  providers: [
    GitHub,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const client = await clientPromise;
        const user = await client.db().collection('users')
          .findOne({ email: credentials.email });
        if (!user) return null;
        // Validate password here (use bcrypt in production)
        return { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role ?? 'member';
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id   = token.sub;
      session.user.role = token.role ?? 'member';
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
```

## Exposing the Route Handler

```javascript
// app/api/auth/[...nextauth]/route.js
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

## Protecting Routes with Middleware

```javascript
// middleware.js
import { auth } from './auth';

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith('/dashboard')) {
    return Response.redirect(new URL('/login', req.url));
  }
});

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
};
```

## Accessing Session in Server Components

```javascript
// app/dashboard/page.jsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const session = await auth();
  if (!session) redirect('/login');

  return <h1>Welcome, {session.user.name}</h1>;
}
```

## Key Differences from NextAuth.js v4

- Configuration is in `auth.js`, not `pages/api/auth/[...nextauth].js`
- Use `auth()` instead of `getServerSession()` in server components
- The adapter API is unchanged but the package exports have changed
- JWT and database sessions are both supported; the Credentials provider requires `session: { strategy: 'jwt' }`

## Recommended MongoDB Indexes

```javascript
db.users.createIndex({ email: 1 }, { unique: true });
db.sessions.createIndex({ sessionToken: 1 }, { unique: true });
db.sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
db.verificationTokens.createIndex({ token: 1 }, { unique: true });
```

## Summary

Auth.js v5 simplifies authentication configuration by consolidating everything into a single `auth.js` file. With the MongoDB adapter, all user accounts, OAuth links, and sessions are stored in your database automatically. Use the `auth()` helper in server components and middleware to protect routes. Add TTL indexes on sessions to ensure expired records are automatically cleaned up.
