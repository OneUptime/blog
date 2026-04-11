# How to Use Redis for Angular Universal Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Angular, Server-Side Rendering

Description: Learn how to use Redis with Angular Universal to cache server-rendered HTML pages and HTTP responses, improving performance and reducing server load.

---

Angular Universal renders Angular applications on the server. Without caching, each request re-renders the full component tree. Redis caching stores the output so repeated requests are served instantly.

## Angular Universal with Express: Route Cache

```typescript
// server.ts
import express from "express";
import { createClient } from "redis";
import { ngExpressEngine } from "@nguniversal/express-engine";
import { AppServerModule } from "./src/main.server";

const app = express();

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
await redisClient.connect();

app.engine(
  "html",
  ngExpressEngine({
    bootstrap: AppServerModule,
  })
);

app.set("view engine", "html");
app.set("views", "dist/browser");

// Cache middleware for GET requests
const ssrCache = async (req: any, res: any, next: any) => {
  if (req.method !== "GET") return next();

  const cacheKey = `ssr:angular:${req.url}`;
  const cached = await redisClient.get(cacheKey);

  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.send(cached);
  }

  // Intercept the response to cache it
  const originalSend = res.send.bind(res);
  res.send = async (body: string) => {
    if (res.statusCode === 200 && body) {
      await redisClient.set(cacheKey, body, { EX: 300 });
    }
    res.setHeader("X-Cache", "MISS");
    return originalSend(body);
  };

  next();
};

app.get("*", ssrCache, (req, res) => {
  res.render("index", { req });
});
```

## Cache Angular HTTP Responses Server-Side

Cache HTTP response data in Redis on the server so repeated SSR renders skip redundant API calls:

```typescript
// app.server.module.ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { createClient } from "redis";
import { firstValueFrom } from "rxjs";

@Injectable({ providedIn: "root" })
export class CachedHttpService {
  private redis = createClient({ url: process.env.REDIS_URL });
  private redisReady = this.redis.connect();

  async get<T>(url: string, stateKey: string, ttl = 300): Promise<T> {
    await this.redisReady;
    const key = `angular:data:${stateKey}`;
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached) as T;
    }

    const data = await firstValueFrom(this.http.get<T>(url));
    await this.redis.set(key, JSON.stringify(data), { EX: ttl });
    return data;
  }

  constructor(private http: HttpClient) {}
}
```

## Cache Invalidation

```typescript
// Clear cached pages when content changes
async function invalidateAngularCache(pattern: string) {
  const keys = await redisClient.keys(`ssr:angular:${pattern}*`);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
}

// Example: invalidate product pages on update
async function onProductUpdated(productId: string) {
  await invalidateAngularCache(`/products/${productId}`);
  await redisClient.del(`angular:data:product:${productId}`);
}
```

## Vary Cache by User Locale

```typescript
const ssrCacheWithLocale = async (req: any, res: any, next: any) => {
  const locale = req.headers["accept-language"]?.split(",")[0] || "en";
  const cacheKey = `ssr:angular:${locale}:${req.url}`;

  const cached = await redisClient.get(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.send(cached);
  }
  next();
};
```

## Summary

Angular Universal with Redis caching intercepts rendered HTML at the Express layer and stores it keyed by URL. This turns expensive 200-500ms rendering operations into sub-millisecond cache lookups for repeat visitors. Use TransferState with Redis-backed data caching to eliminate redundant API calls during SSR, and invalidate cache entries whenever underlying data changes to maintain content accuracy.
