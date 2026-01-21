# How to Use Redis with Next.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Next.js, React, Caching, ISR, API Routes, Edge Functions

Description: A comprehensive guide to integrating Redis with Next.js applications, covering API route caching, ISR revalidation, session management, and edge function patterns.

---

Next.js applications can significantly benefit from Redis for caching, session management, and real-time features. This guide covers practical patterns for using Redis with both API routes and Server Components in Next.js 14+.

## Installation

```bash
npm install ioredis @upstash/redis
```

## Redis Client Setup

### Using ioredis (For Node.js Runtime)

```typescript
// lib/redis.ts
import Redis from 'ioredis';

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  throw new Error('REDIS_URL is not defined');
};

// Singleton pattern for connection reuse
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 100, 3000);
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export default redis;
```

### Using Upstash Redis (For Edge Runtime)

```typescript
// lib/redis-edge.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default redis;
```

## Caching in API Routes

### Basic Cache Helper

```typescript
// lib/cache.ts
import redis from './redis';

interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function setCache<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = 300, tags = [] } = options;
  const data = JSON.stringify(value);

  if (ttl > 0) {
    await redis.setex(key, ttl, data);
  } else {
    await redis.set(key, data);
  }

  // Store tags for invalidation
  for (const tag of tags) {
    await redis.sadd(`tag:${tag}`, key);
  }
}

export async function invalidateTag(tag: string): Promise<void> {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await redis.del(...keys);
    await redis.del(`tag:${tag}`);
  }
}

export async function remember<T>(
  key: string,
  ttl: number,
  callback: () => Promise<T>
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await callback();
  await setCache(key, value, { ttl });
  return value;
}
```

### Cached API Route

```typescript
// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { remember } from '@/lib/cache';
import { db } from '@/lib/db';

export async function GET() {
  const products = await remember(
    'products:all',
    600, // 10 minutes
    async () => {
      return db.product.findMany({
        include: { category: true },
      });
    }
  );

  return NextResponse.json(products);
}
```

### Route Handler with Cache Control

```typescript
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/cache';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cacheKey = `post:${params.id}`;

  // Check cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }

  // Fetch from database
  const post = await db.post.findUnique({
    where: { id: params.id },
    include: { author: true, comments: true },
  });

  if (!post) {
    return NextResponse.json(
      { error: 'Post not found' },
      { status: 404 }
    );
  }

  // Store in cache
  await setCache(cacheKey, post, { ttl: 300, tags: ['posts'] });

  return NextResponse.json(post, {
    headers: {
      'X-Cache': 'MISS',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

## Server Component Caching

### Cached Data Fetching

```typescript
// lib/data.ts
import { cache } from 'react';
import redis from './redis';
import { db } from './db';

// React cache for request deduplication
export const getProduct = cache(async (id: string) => {
  const cacheKey = `product:${id}`;

  // Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const product = await db.product.findUnique({
    where: { id },
    include: { category: true, reviews: true },
  });

  if (product) {
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(product));
  }

  return product;
});

export const getProducts = cache(async (category?: string) => {
  const cacheKey = category ? `products:category:${category}` : 'products:all';

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const products = await db.product.findMany({
    where: category ? { categoryId: category } : undefined,
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  await redis.setex(cacheKey, 600, JSON.stringify(products));

  return products;
});
```

### Using in Server Components

```typescript
// app/products/page.tsx
import { getProducts } from '@/lib/data';
import { ProductGrid } from '@/components/ProductGrid';

export const revalidate = 60; // ISR revalidation

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main>
      <h1>Products</h1>
      <ProductGrid products={products} />
    </main>
  );
}
```

## On-Demand ISR Revalidation

### Revalidation API Route

```typescript
// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { invalidateTag } from '@/lib/cache';

export async function POST(request: NextRequest) {
  const { secret, path, tag } = await request.json();

  // Verify secret
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    if (path) {
      // Revalidate specific path
      revalidatePath(path);

      // Also clear Redis cache for this path
      await invalidateTag(path.replace(/\//g, ':'));
    }

    if (tag) {
      // Revalidate by tag
      revalidateTag(tag);
      await invalidateTag(tag);
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (error) {
    return NextResponse.json(
      { error: 'Revalidation failed' },
      { status: 500 }
    );
  }
}
```

### Webhook Handler for CMS Updates

```typescript
// app/api/webhooks/cms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import redis from '@/lib/redis';

export async function POST(request: NextRequest) {
  const payload = await request.json();

  // Handle different content types
  switch (payload.type) {
    case 'post.updated':
    case 'post.created':
      await redis.del(`post:${payload.data.id}`);
      await redis.del('posts:all');
      revalidatePath('/blog');
      revalidatePath(`/blog/${payload.data.slug}`);
      break;

    case 'product.updated':
      await redis.del(`product:${payload.data.id}`);
      await redis.del('products:*'); // Pattern delete
      revalidatePath('/products');
      revalidatePath(`/products/${payload.data.id}`);
      break;
  }

  return NextResponse.json({ success: true });
}
```

## Session Management

### Session Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function middleware(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;

  if (!sessionId) {
    return NextResponse.next();
  }

  // Get session from Redis
  const session = await redis.get<{ userId: string }>(`session:${sessionId}`);

  if (session) {
    // Add user info to headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', session.userId);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
```

### Session API Routes

```typescript
// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import redis from '@/lib/redis';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  const { userId, email } = await request.json();

  const sessionId = nanoid(32);
  const session = {
    userId,
    email,
    createdAt: Date.now(),
  };

  // Store session in Redis (24 hours)
  await redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));

  // Set cookie
  cookies().set('session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400,
  });

  return NextResponse.json({ success: true });
}

export async function GET() {
  const sessionId = cookies().get('session_id')?.value;

  if (!sessionId) {
    return NextResponse.json({ user: null });
  }

  const session = await redis.get(`session:${sessionId}`);

  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: JSON.parse(session) });
}

export async function DELETE() {
  const sessionId = cookies().get('session_id')?.value;

  if (sessionId) {
    await redis.del(`session:${sessionId}`);
    cookies().delete('session_id');
  }

  return NextResponse.json({ success: true });
}
```

## Rate Limiting Edge Function

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
});

export async function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    });
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

## Real-Time Features with Server-Sent Events

```typescript
// app/api/events/route.ts
import { NextRequest } from 'next/server';
import redis from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get('channel') || 'default';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const subscriber = redis.duplicate();
      await subscriber.subscribe(channel);

      subscriber.on('message', (ch, message) => {
        controller.enqueue(
          encoder.encode(`data: ${message}\n\n`)
        );
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', async () => {
        await subscriber.unsubscribe(channel);
        await subscriber.quit();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Client-Side Event Consumer

```typescript
// hooks/useEvents.ts
'use client';

import { useEffect, useState } from 'react';

export function useEvents<T>(channel: string) {
  const [events, setEvents] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`/api/events?channel=${channel}`);

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as T;
      setEvents((prev) => [...prev, data]);
    };

    return () => {
      eventSource.close();
    };
  }, [channel]);

  return { events, connected };
}
```

## Best Practices

1. **Use connection reuse** with singleton pattern
2. **Handle edge runtime** with Upstash for middleware
3. **Implement cache invalidation** on data updates
4. **Use ISR with Redis** for dynamic caching
5. **Set appropriate TTLs** based on data freshness needs
6. **Monitor cache hit rates** for optimization

## Conclusion

Redis integration with Next.js provides powerful capabilities for:

- API route response caching
- Server Component data caching
- On-demand ISR revalidation
- Session management
- Rate limiting at the edge
- Real-time features with SSE

By following these patterns, you can build high-performance Next.js applications that leverage Redis for caching and real-time features while maintaining excellent developer experience.
