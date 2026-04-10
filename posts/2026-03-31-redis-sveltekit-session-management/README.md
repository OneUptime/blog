# How to Use Redis for SvelteKit Session Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, SvelteKit, Session

Description: Learn how to implement server-side session management in SvelteKit using Redis as the session store, with secure cookie handling and session lifecycle management.

---

SvelteKit runs on the server and supports hooks for request handling, making it straightforward to implement Redis-backed sessions. Unlike JWT tokens, server-side sessions allow instant revocation and can store large amounts of data without bloating cookies.

## Setup Redis Session Store

```typescript
// src/lib/server/redis.ts
import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (err) => console.error("Redis error:", err));
await redis.connect();

export default redis;
```

```typescript
// src/lib/server/session.ts
import redis from "./redis";
import { randomBytes } from "crypto";

const SESSION_PREFIX = "session:";
const SESSION_TTL = 86400; // 24 hours in seconds

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: number;
  lastSeenAt: number;
}

export async function createSession(data: Omit<SessionData, "createdAt" | "lastSeenAt">): Promise<string> {
  const sessionId = randomBytes(32).toString("hex");
  const sessionData: SessionData = {
    ...data,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  };

  await redis.set(
    `${SESSION_PREFIX}${sessionId}`,
    JSON.stringify(sessionData),
    { EX: SESSION_TTL }
  );

  return sessionId;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const raw = await redis.get(`${SESSION_PREFIX}${sessionId}`);
  if (!raw) return null;

  const session = JSON.parse(raw) as SessionData;

  // Refresh TTL on active sessions (sliding expiration)
  session.lastSeenAt = Date.now();
  await redis.set(
    `${SESSION_PREFIX}${sessionId}`,
    JSON.stringify(session),
    { EX: SESSION_TTL }
  );

  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`${SESSION_PREFIX}${sessionId}`);
}
```

## SvelteKit Hooks

```typescript
// src/hooks.server.ts
import type { Handle } from "@sveltejs/kit";
import { getSession } from "$lib/server/session";

export const handle: Handle = async ({ event, resolve }) => {
  const sessionCookie = event.cookies.get("session_id");

  if (sessionCookie) {
    const session = await getSession(sessionCookie);
    if (session) {
      event.locals.user = {
        id: session.userId,
        email: session.email,
        role: session.role,
      };
    }
  }

  return resolve(event);
};
```

## Login and Logout Actions

```typescript
// src/routes/login/+page.server.ts
import type { Actions } from "@sveltejs/kit";
import { createSession, deleteSession } from "$lib/server/session";
import { redirect, fail } from "@sveltejs/kit";

export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = String(data.get("email"));
    const password = String(data.get("password"));

    const user = await verifyCredentials(email, password);
    if (!user) return fail(401, { error: "Invalid credentials" });

    const sessionId = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });

    throw redirect(303, "/dashboard");
  },

  logout: async ({ cookies }) => {
    const sessionId = cookies.get("session_id");
    if (sessionId) {
      await deleteSession(sessionId);
      cookies.delete("session_id", { path: "/" });
    }
    throw redirect(303, "/login");
  },
};
```

## Protected Route

```typescript
// src/routes/dashboard/+page.server.ts
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  return { user: locals.user };
};
```

## Summary

Redis-backed SvelteKit sessions store state server-side so you can revoke sessions instantly, store arbitrary data without cookie size limits, and implement sliding expiration by refreshing TTLs on access. Use `httpOnly` and `secure` cookie flags, store only the session ID in the cookie, and always delete the Redis key on logout to immediately invalidate the session.
