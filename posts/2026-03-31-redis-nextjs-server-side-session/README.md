# How to Use Redis for Next.js Server-Side Session Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Next.js, Session, Authentication, Node.js

Description: Store Next.js server-side sessions in Redis using iron-session or next-auth with a Redis adapter for persistent, scalable authentication state.

---

Next.js supports server-side sessions in API Routes and Server Components. Storing session data in Redis makes sessions persistent across deployments and shared across multiple Next.js instances.

## Option 1: iron-session with Redis Backend

### Install Dependencies

```bash
npm install iron-session redis
```

### Configure Session Options

`lib/session.js`:

```javascript
import { getIronSession } from "iron-session";
import { getRedis } from "./redis";

const sessionOptions = {
  password: process.env.SESSION_PASSWORD, // min 32 chars
  cookieName: "myapp_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 1 day
  },
};

export async function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}
```

### Session-Backed API Route

`pages/api/login.js`:

```javascript
import { getSession } from "../../lib/session";
import { getRedis } from "../../lib/redis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, password } = req.body;
  const user = await verifyCredentials(username, password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const session = await getSession(req, res);
  session.userId = user.id;
  session.username = user.username;

  // Store additional session data in Redis
  const redis = await getRedis();
  await redis.setEx(
    `session:${user.id}`,
    86400,
    JSON.stringify({ loginTime: Date.now(), ip: req.socket.remoteAddress })
  );

  await session.save();
  res.json({ ok: true });
}
```

## Option 2: next-auth with Redis Adapter

```bash
npm install next-auth @auth/redis-adapter redis
```

`pages/api/auth/[...nextauth].js`:

```javascript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { RedisAdapter } from "@auth/redis-adapter";
import { createClient } from "redis";

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect();

export default NextAuth({
  adapter: RedisAdapter(redisClient),
  providers: [
    Credentials({
      async authorize(credentials) {
        return await verifyUser(credentials);
      },
    }),
  ],
  session: { strategy: "database" },
});
```

## Access Session in Server Components (App Router)

```javascript
// app/dashboard/page.jsx
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <h1>Hello, {session.user.name}</h1>;
}
```

## Invalidate Sessions on Logout

```javascript
export default async function handler(req, res) {
  const session = await getSession(req, res);
  const redis = await getRedis();
  await redis.del(`session:${session.userId}`);
  session.destroy();
  res.json({ ok: true });
}
```

## Summary

Redis-backed sessions in Next.js combine the security of signed cookies (iron-session) or JWT (next-auth) with the flexibility of server-side state stored in Redis. This pattern supports multiple Next.js instances sharing the same session store, fast session reads on every authenticated request, and instant session revocation by deleting the Redis key.
