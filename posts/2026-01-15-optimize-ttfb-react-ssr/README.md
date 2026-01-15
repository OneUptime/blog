# How to Optimize Time to First Byte (TTFB) in React SSR Apps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, SSR, TTFB, Performance, Server-Side Rendering, Optimization, TypeScript

Description: Learn techniques to optimize Time to First Byte (TTFB) in React server-side rendered applications for faster initial page loads and improved Core Web Vitals.

---

## Introduction

Time to First Byte (TTFB) is a critical performance metric that measures the time from when a user requests a page to when the first byte of the response is received by the browser. In server-side rendered (SSR) React applications, TTFB directly impacts user experience and is a key component of Core Web Vitals.

A slow TTFB means users stare at a blank screen longer, leading to higher bounce rates and lower engagement. Google also considers page speed in its ranking algorithms, making TTFB optimization crucial for SEO. In this comprehensive guide, we will explore proven techniques to optimize TTFB in React SSR applications using TypeScript.

## Understanding TTFB and Its Importance

### What is TTFB?

TTFB encompasses three main phases:

1. **Connection time**: DNS lookup, TCP handshake, and TLS negotiation
2. **Request time**: Time for the request to reach the server
3. **Server processing time**: Time the server takes to generate and start sending the response

```typescript
// Conceptual breakdown of TTFB components
interface TTFBBreakdown {
  dnsLookup: number;      // Time to resolve domain name
  tcpConnection: number;   // Time to establish TCP connection
  tlsNegotiation: number;  // Time for SSL/TLS handshake
  requestSent: number;     // Time to send the request
  serverProcessing: number; // Time server takes to process
  responseStart: number;   // Time to receive first byte
}

// Total TTFB = sum of all these components
const calculateTTFB = (breakdown: TTFBBreakdown): number => {
  return Object.values(breakdown).reduce((sum, time) => sum + time, 0);
};
```

### Why TTFB Matters for SSR Apps

In SSR applications, the server must:
- Execute React components
- Fetch data from databases or APIs
- Render the complete HTML
- Send the response to the client

Each of these steps adds to server processing time. A well-optimized SSR app should target TTFB under 200ms for optimal user experience.

```typescript
// Example: Basic SSR request handler showing where time is spent
import express, { Request, Response } from 'express';
import { renderToString } from 'react-dom/server';
import App from './App';

const app = express();

app.get('*', async (req: Request, res: Response) => {
  const startTime = performance.now();

  // Phase 1: Data fetching (often the biggest bottleneck)
  const dataFetchStart = performance.now();
  const data = await fetchPageData(req.path);
  const dataFetchTime = performance.now() - dataFetchStart;

  // Phase 2: React rendering
  const renderStart = performance.now();
  const html = renderToString(<App data={data} />);
  const renderTime = performance.now() - renderStart;

  // Phase 3: Response construction
  const responseStart = performance.now();
  const fullHtml = constructFullHtml(html, data);
  const responseTime = performance.now() - responseStart;

  // Log timing breakdown
  console.log({
    totalTime: performance.now() - startTime,
    dataFetchTime,
    renderTime,
    responseTime,
  });

  res.send(fullHtml);
});
```

## Measuring TTFB in SSR Applications

Before optimizing, you need accurate measurements. Here are several approaches to measure TTFB effectively.

### Server-Side Timing with Custom Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

interface TimingMetrics {
  requestId: string;
  path: string;
  method: string;
  ttfb: number;
  totalTime: number;
  timestamp: Date;
}

const timingMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = generateRequestId();
    const startTime = process.hrtime.bigint();

    // Track when first byte is sent
    const originalWrite = res.write.bind(res);
    let firstByteTime: bigint | null = null;

    res.write = (chunk: any, ...args: any[]) => {
      if (!firstByteTime) {
        firstByteTime = process.hrtime.bigint();
        const ttfbNs = firstByteTime - startTime;
        const ttfbMs = Number(ttfbNs) / 1_000_000;

        // Add Server-Timing header for browser DevTools
        res.setHeader('Server-Timing', `ttfb;dur=${ttfbMs.toFixed(2)}`);
      }
      return originalWrite(chunk, ...args);
    };

    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const totalTimeNs = endTime - startTime;
      const totalTimeMs = Number(totalTimeNs) / 1_000_000;
      const ttfbMs = firstByteTime
        ? Number(firstByteTime - startTime) / 1_000_000
        : totalTimeMs;

      const metrics: TimingMetrics = {
        requestId,
        path: req.path,
        method: req.method,
        ttfb: ttfbMs,
        totalTime: totalTimeMs,
        timestamp: new Date(),
      };

      // Send to monitoring system
      recordMetrics(metrics);
    });

    next();
  };
};

const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const recordMetrics = (metrics: TimingMetrics): void => {
  // Implementation depends on your monitoring stack
  console.log('Request metrics:', metrics);
};
```

### Using the Performance Observer API

```typescript
// Client-side TTFB measurement
interface PerformanceMetrics {
  ttfb: number;
  fcp: number;
  lcp: number;
  domContentLoaded: number;
}

const measureTTFB = (): Promise<number> => {
  return new Promise((resolve) => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const navigationEntry = entries.find(
        (entry) => entry.entryType === 'navigation'
      ) as PerformanceNavigationTiming;

      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        resolve(ttfb);
        observer.disconnect();
      }
    });

    observer.observe({ type: 'navigation', buffered: true });
  });
};

// Comprehensive performance metrics collection
const collectPerformanceMetrics = async (): Promise<PerformanceMetrics> => {
  const navigation = performance.getEntriesByType(
    'navigation'
  )[0] as PerformanceNavigationTiming;

  return {
    ttfb: navigation.responseStart - navigation.requestStart,
    fcp: await getFCP(),
    lcp: await getLCP(),
    domContentLoaded:
      navigation.domContentLoadedEventEnd - navigation.startTime,
  };
};

const getFCP = (): Promise<number> => {
  return new Promise((resolve) => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
      if (fcpEntry) {
        resolve(fcpEntry.startTime);
        observer.disconnect();
      }
    });
    observer.observe({ type: 'paint', buffered: true });
  });
};

const getLCP = (): Promise<number> => {
  return new Promise((resolve) => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      resolve(lastEntry.startTime);
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });

    // LCP can update, so we resolve after load
    window.addEventListener('load', () => {
      setTimeout(() => observer.disconnect(), 0);
    });
  });
};
```

## Server-Side Caching Strategies

Caching is one of the most effective ways to reduce TTFB. Let us explore different caching strategies for SSR applications.

### In-Memory Caching with LRU

```typescript
import LRUCache from 'lru-cache';
import { createHash } from 'crypto';

interface CachedPage {
  html: string;
  etag: string;
  createdAt: number;
  headers: Record<string, string>;
}

interface CacheOptions {
  maxSize: number;
  maxAge: number;
  staleWhileRevalidate: number;
}

class SSRCache {
  private cache: LRUCache<string, CachedPage>;
  private staleWhileRevalidate: number;

  constructor(options: CacheOptions) {
    this.cache = new LRUCache({
      max: options.maxSize,
      ttl: options.maxAge,
      updateAgeOnGet: false,
      allowStale: true,
    });
    this.staleWhileRevalidate = options.staleWhileRevalidate;
  }

  generateKey(req: Request): string {
    const components = [
      req.path,
      req.query ? JSON.stringify(req.query) : '',
      req.headers['accept-language'] || 'en',
      req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
    ];
    return createHash('sha256').update(components.join('|')).digest('hex');
  }

  generateETag(html: string): string {
    return createHash('md5').update(html).digest('hex');
  }

  async get(key: string): Promise<CachedPage | null> {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.createdAt;
    const isStale = age > this.cache.ttl!;

    if (isStale && age < this.staleWhileRevalidate) {
      // Return stale content but mark for revalidation
      return { ...cached, headers: { ...cached.headers, 'X-Cache': 'STALE' } };
    }

    return { ...cached, headers: { ...cached.headers, 'X-Cache': 'HIT' } };
  }

  set(key: string, html: string): void {
    const cached: CachedPage = {
      html,
      etag: this.generateETag(html),
      createdAt: Date.now(),
      headers: { 'X-Cache': 'MISS' },
    };
    this.cache.set(key, cached);
  }

  invalidate(pattern: RegExp): number {
    let invalidated = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    return invalidated;
  }
}

// Usage in Express middleware
const ssrCache = new SSRCache({
  maxSize: 500,
  maxAge: 5 * 60 * 1000, // 5 minutes
  staleWhileRevalidate: 60 * 60 * 1000, // 1 hour
});

const cacheMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip caching for authenticated users
  if (req.headers.authorization) {
    return next();
  }

  const cacheKey = ssrCache.generateKey(req);
  const cached = await ssrCache.get(cacheKey);

  if (cached) {
    // Check If-None-Match header for 304 response
    if (req.headers['if-none-match'] === cached.etag) {
      res.status(304).end();
      return;
    }

    Object.entries(cached.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.setHeader('ETag', cached.etag);
    res.send(cached.html);
    return;
  }

  // Store original send to intercept response
  const originalSend = res.send.bind(res);
  res.send = (body: string) => {
    ssrCache.set(cacheKey, body);
    res.setHeader('X-Cache', 'MISS');
    return originalSend(body);
  };

  next();
};
```

### Redis-Based Distributed Caching

```typescript
import Redis from 'ioredis';
import { promisify } from 'util';
import zlib from 'zlib';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

interface RedisSSRCacheConfig {
  host: string;
  port: number;
  password?: string;
  keyPrefix: string;
  defaultTTL: number;
  compressionThreshold: number;
}

interface CacheEntry {
  html: string;
  compressed: boolean;
  etag: string;
  timestamp: number;
  metadata: Record<string, any>;
}

class RedisSSRCache {
  private client: Redis;
  private keyPrefix: string;
  private defaultTTL: number;
  private compressionThreshold: number;

  constructor(config: RedisSSRCacheConfig) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    this.keyPrefix = config.keyPrefix;
    this.defaultTTL = config.defaultTTL;
    this.compressionThreshold = config.compressionThreshold;

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  private getKey(path: string, variant: string = 'default'): string {
    return `${this.keyPrefix}:${path}:${variant}`;
  }

  async get(path: string, variant?: string): Promise<CacheEntry | null> {
    try {
      const key = this.getKey(path, variant);
      const data = await this.client.get(key);

      if (!data) {
        return null;
      }

      const entry: CacheEntry = JSON.parse(data);

      if (entry.compressed) {
        const buffer = Buffer.from(entry.html, 'base64');
        const decompressed = await gunzip(buffer);
        entry.html = decompressed.toString('utf-8');
      }

      return entry;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(
    path: string,
    html: string,
    options: {
      variant?: string;
      ttl?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      const key = this.getKey(path, options.variant);
      const ttl = options.ttl || this.defaultTTL;

      let storedHtml = html;
      let compressed = false;

      // Compress if above threshold
      if (html.length > this.compressionThreshold) {
        const compressedBuffer = await gzip(Buffer.from(html, 'utf-8'));
        storedHtml = compressedBuffer.toString('base64');
        compressed = true;
      }

      const entry: CacheEntry = {
        html: storedHtml,
        compressed,
        etag: this.generateETag(html),
        timestamp: Date.now(),
        metadata: options.metadata || {},
      };

      await this.client.setex(key, ttl, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(`${this.keyPrefix}:${pattern}`);
    if (keys.length === 0) return 0;

    const pipeline = this.client.pipeline();
    keys.forEach((key) => pipeline.del(key));
    await pipeline.exec();

    return keys.length;
  }

  async warmCache(
    paths: string[],
    renderer: (path: string) => Promise<string>
  ): Promise<void> {
    const batchSize = 10;

    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (path) => {
          try {
            const html = await renderer(path);
            await this.set(path, html);
          } catch (error) {
            console.error(`Failed to warm cache for ${path}:`, error);
          }
        })
      );
    }
  }

  private generateETag(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }
}
```

## Component-Level Caching

Not all components need to be re-rendered on every request. Caching at the component level can significantly reduce TTFB.

```typescript
import { ReactElement, ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import LRUCache from 'lru-cache';

interface ComponentCacheOptions {
  maxAge: number;
  maxSize: number;
  keyGenerator?: (props: any) => string;
}

interface CachedComponent {
  html: string;
  timestamp: number;
}

class ComponentCache {
  private cache: LRUCache<string, CachedComponent>;
  private keyGenerator: (componentName: string, props: any) => string;

  constructor(options: ComponentCacheOptions) {
    this.cache = new LRUCache({
      max: options.maxSize,
      ttl: options.maxAge,
    });

    this.keyGenerator =
      options.keyGenerator ||
      ((name, props) => `${name}:${JSON.stringify(props)}`);
  }

  getCachedComponent<P extends object>(
    Component: ComponentType<P>,
    props: P,
    componentName: string
  ): string {
    const key = this.keyGenerator(componentName, props);
    const cached = this.cache.get(key);

    if (cached) {
      return cached.html;
    }

    const html = renderToString(<Component {...props} />);

    this.cache.set(key, {
      html,
      timestamp: Date.now(),
    });

    return html;
  }
}

// Higher-order component for cacheable components
const componentCache = new ComponentCache({
  maxAge: 60 * 1000, // 1 minute
  maxSize: 1000,
});

interface CacheableOptions {
  name: string;
  ttl?: number;
  keyProps?: string[];
}

function withCache<P extends object>(
  Component: ComponentType<P>,
  options: CacheableOptions
): ComponentType<P> {
  const CachedComponent: ComponentType<P> = (props: P) => {
    // Generate cache key from specified props only
    const cacheProps = options.keyProps
      ? Object.fromEntries(
          options.keyProps
            .filter((key) => key in props)
            .map((key) => [key, (props as any)[key]])
        )
      : props;

    const html = componentCache.getCachedComponent(
      Component,
      cacheProps as P,
      options.name
    );

    // Return a placeholder that will be replaced
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  CachedComponent.displayName = `Cached(${options.name})`;
  return CachedComponent;
}

// Example usage
interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  imageUrl,
}) => (
  <div className="product-card">
    <img src={imageUrl} alt={name} />
    <h3>{name}</h3>
    <p>${price.toFixed(2)}</p>
  </div>
);

const CachedProductCard = withCache(ProductCard, {
  name: 'ProductCard',
  ttl: 5 * 60 * 1000, // 5 minutes
  keyProps: ['id'], // Only use id for cache key
});
```

## Database Query Optimization

Database queries are often the biggest contributor to TTFB in SSR applications. Here are strategies to optimize them.

### Query Result Caching

```typescript
import { Pool, QueryResult } from 'pg';
import LRUCache from 'lru-cache';
import crypto from 'crypto';

interface QueryCacheConfig {
  maxSize: number;
  defaultTTL: number;
  enableQueryPlan: boolean;
}

interface CachedQuery {
  rows: any[];
  rowCount: number;
  cachedAt: number;
  queryTime: number;
}

class OptimizedDatabaseClient {
  private pool: Pool;
  private queryCache: LRUCache<string, CachedQuery>;
  private enableQueryPlan: boolean;

  constructor(connectionString: string, cacheConfig: QueryCacheConfig) {
    this.pool = new Pool({
      connectionString,
      max: 20, // Maximum connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.queryCache = new LRUCache({
      max: cacheConfig.maxSize,
      ttl: cacheConfig.defaultTTL,
    });

    this.enableQueryPlan = cacheConfig.enableQueryPlan;
  }

  private generateCacheKey(query: string, params: any[]): string {
    const content = JSON.stringify({ query, params });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async query<T = any>(
    query: string,
    params: any[] = [],
    options: { cache?: boolean; ttl?: number } = {}
  ): Promise<{ rows: T[]; rowCount: number; fromCache: boolean }> {
    const shouldCache = options.cache !== false;
    const cacheKey = this.generateCacheKey(query, params);

    // Check cache first
    if (shouldCache) {
      const cached = this.queryCache.get(cacheKey);
      if (cached) {
        return {
          rows: cached.rows as T[],
          rowCount: cached.rowCount,
          fromCache: true,
        };
      }
    }

    // Execute query with timing
    const startTime = performance.now();
    const result = await this.pool.query(query, params);
    const queryTime = performance.now() - startTime;

    // Log slow queries
    if (queryTime > 100) {
      console.warn(`Slow query (${queryTime.toFixed(2)}ms):`, query);
      if (this.enableQueryPlan) {
        await this.analyzeQuery(query, params);
      }
    }

    // Cache the result
    if (shouldCache) {
      this.queryCache.set(cacheKey, {
        rows: result.rows,
        rowCount: result.rowCount,
        cachedAt: Date.now(),
        queryTime,
      });
    }

    return {
      rows: result.rows as T[],
      rowCount: result.rowCount,
      fromCache: false,
    };
  }

  private async analyzeQuery(query: string, params: any[]): Promise<void> {
    try {
      const explainQuery = `EXPLAIN ANALYZE ${query}`;
      const plan = await this.pool.query(explainQuery, params);
      console.log('Query execution plan:', plan.rows);
    } catch (error) {
      console.error('Failed to analyze query:', error);
    }
  }

  async batchQuery<T = any>(
    queries: Array<{ query: string; params: any[] }>
  ): Promise<Array<{ rows: T[]; rowCount: number }>> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const results = await Promise.all(
        queries.map(({ query, params }) => client.query(query, params))
      );

      await client.query('COMMIT');
      return results.map((r) => ({ rows: r.rows as T[], rowCount: r.rowCount }));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  invalidateCache(pattern?: RegExp): void {
    if (!pattern) {
      this.queryCache.clear();
      return;
    }

    for (const key of this.queryCache.keys()) {
      if (pattern.test(key)) {
        this.queryCache.delete(key);
      }
    }
  }
}

// Data loader for batching and caching
class DataLoader<K, V> {
  private batchFn: (keys: K[]) => Promise<Map<K, V>>;
  private cache: Map<K, Promise<V>>;
  private batch: K[];
  private batchScheduled: boolean;

  constructor(batchFn: (keys: K[]) => Promise<Map<K, V>>) {
    this.batchFn = batchFn;
    this.cache = new Map();
    this.batch = [];
    this.batchScheduled = false;
  }

  async load(key: K): Promise<V> {
    const cached = this.cache.get(key);
    if (cached) return cached;

    const promise = new Promise<V>((resolve, reject) => {
      this.batch.push(key);

      if (!this.batchScheduled) {
        this.batchScheduled = true;
        process.nextTick(async () => {
          const batch = this.batch;
          this.batch = [];
          this.batchScheduled = false;

          try {
            const results = await this.batchFn(batch);
            batch.forEach((k) => {
              const result = results.get(k);
              if (result !== undefined) {
                resolve(result);
              } else {
                reject(new Error(`No result for key: ${k}`));
              }
            });
          } catch (error) {
            batch.forEach(() => reject(error));
          }
        });
      }
    });

    this.cache.set(key, promise);
    return promise;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

## Edge Caching with CDNs

Leveraging CDN edge caching can dramatically reduce TTFB for users across the globe.

```typescript
import { Request, Response, NextFunction } from 'express';

interface CacheControlOptions {
  public: boolean;
  maxAge: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  mustRevalidate?: boolean;
  noCache?: boolean;
  noStore?: boolean;
}

interface EdgeCacheConfig {
  enabled: boolean;
  defaultTTL: number;
  varyHeaders: string[];
  bypassCookie?: string;
  purgeToken?: string;
}

class EdgeCacheManager {
  private config: EdgeCacheConfig;

  constructor(config: EdgeCacheConfig) {
    this.config = config;
  }

  generateCacheControl(options: CacheControlOptions): string {
    const directives: string[] = [];

    if (options.noStore) {
      return 'no-store';
    }

    if (options.noCache) {
      directives.push('no-cache');
    }

    if (options.public) {
      directives.push('public');
    } else {
      directives.push('private');
    }

    if (options.maxAge !== undefined) {
      directives.push(`max-age=${options.maxAge}`);
    }

    if (options.staleWhileRevalidate) {
      directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    }

    if (options.staleIfError) {
      directives.push(`stale-if-error=${options.staleIfError}`);
    }

    if (options.mustRevalidate) {
      directives.push('must-revalidate');
    }

    return directives.join(', ');
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check for cache bypass
      if (this.shouldBypassCache(req)) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('CDN-Cache-Control', 'no-store');
        return next();
      }

      // Set Vary headers for proper cache segmentation
      res.setHeader('Vary', this.config.varyHeaders.join(', '));

      // Add Surrogate-Key for cache invalidation (Fastly/Varnish)
      const surrogateKey = this.generateSurrogateKey(req);
      res.setHeader('Surrogate-Key', surrogateKey);

      // Store original end to add headers before response
      const originalEnd = res.end.bind(res);
      res.end = (chunk?: any, encoding?: any, callback?: any) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (!res.getHeader('Cache-Control')) {
            res.setHeader(
              'Cache-Control',
              this.generateCacheControl({
                public: true,
                maxAge: this.config.defaultTTL,
                staleWhileRevalidate: 86400, // 1 day
                staleIfError: 86400,
              })
            );
          }
        }

        return originalEnd(chunk, encoding, callback);
      };

      next();
    };
  }

  private shouldBypassCache(req: Request): boolean {
    // Bypass for authenticated requests
    if (req.headers.authorization) {
      return true;
    }

    // Bypass if specific cookie is present
    if (this.config.bypassCookie) {
      const cookies = req.headers.cookie || '';
      if (cookies.includes(this.config.bypassCookie)) {
        return true;
      }
    }

    // Bypass for POST/PUT/DELETE requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return true;
    }

    return false;
  }

  private generateSurrogateKey(req: Request): string {
    const pathParts = req.path.split('/').filter(Boolean);
    const keys: string[] = ['all'];

    // Add hierarchical keys for granular invalidation
    let currentKey = '';
    for (const part of pathParts) {
      currentKey += `/${part}`;
      keys.push(currentKey.replace(/\//g, '_'));
    }

    return keys.join(' ');
  }

  async purgeByKey(key: string): Promise<void> {
    // Implementation depends on CDN provider
    // Example for Fastly:
    const response = await fetch(
      `https://api.fastly.com/service/${process.env.FASTLY_SERVICE_ID}/purge/${key}`,
      {
        method: 'POST',
        headers: {
          'Fastly-Key': process.env.FASTLY_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Purge failed: ${response.statusText}`);
    }
  }

  async purgeAll(): Promise<void> {
    await this.purgeByKey('all');
  }
}

// Route-specific cache configuration
interface RouteCacheConfig {
  pattern: RegExp;
  maxAge: number;
  staleWhileRevalidate?: number;
  public: boolean;
}

const routeCacheConfigs: RouteCacheConfig[] = [
  {
    pattern: /^\/$/,
    maxAge: 300, // 5 minutes for homepage
    staleWhileRevalidate: 3600,
    public: true,
  },
  {
    pattern: /^\/products\/.+$/,
    maxAge: 600, // 10 minutes for product pages
    staleWhileRevalidate: 86400,
    public: true,
  },
  {
    pattern: /^\/blog\/.+$/,
    maxAge: 3600, // 1 hour for blog posts
    staleWhileRevalidate: 86400,
    public: true,
  },
  {
    pattern: /^\/api\//,
    maxAge: 0, // No caching for API routes
    public: false,
  },
];

const getRouteCacheConfig = (path: string): RouteCacheConfig | undefined => {
  return routeCacheConfigs.find((config) => config.pattern.test(path));
};
```

## Streaming SSR for Faster TTFB

React 18 introduced streaming SSR, which allows you to send HTML to the browser incrementally, significantly improving TTFB.

```typescript
import { renderToPipeableStream } from 'react-dom/server';
import { Request, Response } from 'express';
import { Transform } from 'stream';

interface StreamingSSROptions {
  onShellReady?: () => void;
  onShellError?: (error: Error) => void;
  onAllReady?: () => void;
  onError?: (error: Error) => void;
  bootstrapScripts?: string[];
  bootstrapModules?: string[];
}

const createStreamingSSRHandler = (
  App: React.ComponentType<any>,
  options: StreamingSSROptions = {}
) => {
  return async (req: Request, res: Response) => {
    const startTime = performance.now();
    let shellTime: number | null = null;

    // Prepare initial data
    const initialData = await fetchInitialData(req);

    // HTML template parts
    const htmlStart = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My App</title>
        <link rel="stylesheet" href="/styles/main.css">
      </head>
      <body>
        <div id="root">
    `;

    const htmlEnd = `
        </div>
        <script>
          window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};
        </script>
        <script src="/js/client.js" async></script>
      </body>
      </html>
    `;

    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <App initialData={initialData} />,
      {
        bootstrapScripts: options.bootstrapScripts || ['/js/client.js'],
        onShellReady() {
          shellTime = performance.now() - startTime;

          // Set response headers
          res.statusCode = didError ? 500 : 200;
          res.setHeader('Content-Type', 'text/html');
          res.setHeader(
            'Server-Timing',
            `shell;dur=${shellTime.toFixed(2)}`
          );

          // Send the start of the document immediately
          res.write(htmlStart);

          // Pipe the React stream
          pipe(res);

          options.onShellReady?.();
        },
        onShellError(error: Error) {
          didError = true;
          console.error('Shell error:', error);

          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/html');
          res.send('<h1>Something went wrong</h1>');

          options.onShellError?.(error);
        },
        onAllReady() {
          const totalTime = performance.now() - startTime;
          console.log({
            shellTime,
            totalTime,
            path: req.path,
          });

          // Send the end of the document
          res.write(htmlEnd);
          res.end();

          options.onAllReady?.();
        },
        onError(error: Error) {
          didError = true;
          console.error('Streaming error:', error);
          options.onError?.(error);
        },
      }
    );

    // Handle client disconnect
    req.on('close', () => {
      abort();
    });

    // Set timeout for slow renders
    setTimeout(() => {
      abort();
    }, 10000);
  };
};

// Suspense boundary for data fetching
interface AsyncDataProps<T> {
  loader: () => Promise<T>;
  children: (data: T) => React.ReactNode;
  fallback: React.ReactNode;
}

function AsyncData<T>({ loader, children, fallback }: AsyncDataProps<T>) {
  // This works with React Suspense for streaming
  const data = use(loader());
  return <>{children(data)}</>;
}

// Resource creation for Suspense
function createResource<T>(loader: () => Promise<T>) {
  let status: 'pending' | 'success' | 'error' = 'pending';
  let result: T;
  let error: Error;

  const promise = loader().then(
    (data) => {
      status = 'success';
      result = data;
    },
    (err) => {
      status = 'error';
      error = err;
    }
  );

  return {
    read(): T {
      switch (status) {
        case 'pending':
          throw promise;
        case 'error':
          throw error;
        case 'success':
          return result;
      }
    },
  };
}

// Example usage with selective hydration
const ProductPage: React.FC<{ productId: string }> = ({ productId }) => {
  return (
    <div>
      {/* Critical content renders immediately */}
      <header>
        <h1>Product Details</h1>
      </header>

      {/* Product info streams when ready */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductInfo productId={productId} />
      </Suspense>

      {/* Reviews can stream later */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews productId={productId} />
      </Suspense>

      {/* Recommendations stream last */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <ProductRecommendations productId={productId} />
      </Suspense>
    </div>
  );
};
```

## Code Splitting on the Server

Server-side code splitting can reduce the amount of JavaScript that needs to be processed for each request.

```typescript
import { lazy, Suspense } from 'react';
import { matchPath } from 'react-router-dom';

interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  preload: () => Promise<any>;
  prefetchData?: (params: Record<string, string>) => Promise<any>;
}

// Define routes with lazy loading
const routes: RouteConfig[] = [
  {
    path: '/',
    component: lazy(() => import('./pages/Home')),
    preload: () => import('./pages/Home'),
    prefetchData: () => fetchHomeData(),
  },
  {
    path: '/products',
    component: lazy(() => import('./pages/ProductList')),
    preload: () => import('./pages/ProductList'),
    prefetchData: () => fetchProducts(),
  },
  {
    path: '/products/:id',
    component: lazy(() => import('./pages/ProductDetail')),
    preload: () => import('./pages/ProductDetail'),
    prefetchData: (params) => fetchProduct(params.id),
  },
  {
    path: '/blog',
    component: lazy(() => import('./pages/BlogList')),
    preload: () => import('./pages/BlogList'),
    prefetchData: () => fetchBlogPosts(),
  },
];

// Preload components and data before rendering
const preloadRouteAssets = async (
  path: string
): Promise<{
  Component: React.ComponentType<any>;
  data: any;
  params: Record<string, string>;
}> => {
  for (const route of routes) {
    const match = matchPath(route.path, path);
    if (match) {
      // Parallel loading of component and data
      const [module, data] = await Promise.all([
        route.preload(),
        route.prefetchData?.(match.params as Record<string, string>) ?? null,
      ]);

      return {
        Component: module.default,
        data,
        params: match.params as Record<string, string>,
      };
    }
  }

  throw new Error(`No route found for path: ${path}`);
};

// Server-side route handler with preloading
const ssrHandler = async (req: Request, res: Response) => {
  try {
    const { Component, data, params } = await preloadRouteAssets(req.path);

    const html = renderToString(
      <StaticRouter location={req.url}>
        <App>
          <Component data={data} params={params} />
        </App>
      </StaticRouter>
    );

    res.send(createHtmlTemplate(html, data));
  } catch (error) {
    if (error.message.includes('No route found')) {
      res.status(404).send('Not Found');
    } else {
      console.error('SSR Error:', error);
      res.status(500).send('Internal Server Error');
    }
  }
};

// Module preloading manifest for the client
interface ModuleManifest {
  [chunkName: string]: {
    js: string[];
    css: string[];
  };
}

const generatePreloadTags = (
  manifest: ModuleManifest,
  chunks: string[]
): string => {
  const tags: string[] = [];

  for (const chunk of chunks) {
    const assets = manifest[chunk];
    if (!assets) continue;

    // Preload JavaScript modules
    for (const js of assets.js) {
      tags.push(`<link rel="modulepreload" href="${js}">`);
    }

    // Preload CSS
    for (const css of assets.css) {
      tags.push(`<link rel="preload" href="${css}" as="style">`);
    }
  }

  return tags.join('\n');
};
```

## Optimizing Data Fetching

Efficient data fetching is crucial for fast TTFB. Here are patterns to minimize data fetching overhead.

```typescript
import { Request } from 'express';

interface DataRequirement {
  key: string;
  loader: (context: RequestContext) => Promise<any>;
  dependencies?: string[];
  cache?: {
    ttl: number;
    tags: string[];
  };
}

interface RequestContext {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  user?: User;
}

class DataFetcher {
  private requirements: Map<string, DataRequirement> = new Map();
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  register(requirement: DataRequirement): void {
    this.requirements.set(requirement.key, requirement);
  }

  async fetch(
    keys: string[],
    context: RequestContext
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const pending = new Map<string, Promise<any>>();

    // Build dependency graph and fetch order
    const fetchOrder = this.topologicalSort(keys);

    for (const key of fetchOrder) {
      const requirement = this.requirements.get(key);
      if (!requirement) {
        throw new Error(`Unknown data requirement: ${key}`);
      }

      // Check cache first
      const cacheKey = this.getCacheKey(key, context);
      const cached = this.getFromCache(cacheKey);
      if (cached !== undefined) {
        results[key] = cached;
        continue;
      }

      // Wait for dependencies
      if (requirement.dependencies) {
        await Promise.all(
          requirement.dependencies.map((dep) => pending.get(dep))
        );
      }

      // Fetch data
      const promise = requirement.loader(context).then((data) => {
        results[key] = data;

        // Cache if configured
        if (requirement.cache) {
          this.setCache(cacheKey, data, requirement.cache.ttl);
        }

        return data;
      });

      pending.set(key, promise);
    }

    // Wait for all pending fetches
    await Promise.all(pending.values());

    return results;
  }

  private topologicalSort(keys: string[]): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (key: string) => {
      if (visited.has(key)) return;
      if (visiting.has(key)) {
        throw new Error(`Circular dependency detected: ${key}`);
      }

      visiting.add(key);

      const requirement = this.requirements.get(key);
      if (requirement?.dependencies) {
        for (const dep of requirement.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(key);
      visited.add(key);
      sorted.push(key);
    };

    for (const key of keys) {
      visit(key);
    }

    return sorted;
  }

  private getCacheKey(key: string, context: RequestContext): string {
    return `${key}:${context.path}:${JSON.stringify(context.query)}`;
  }

  private getFromCache(key: string): any | undefined {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return undefined;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }

  invalidateByTag(tag: string): void {
    for (const [key, requirement] of this.requirements) {
      if (requirement.cache?.tags.includes(tag)) {
        // Clear all cached entries for this requirement
        for (const cacheKey of this.cache.keys()) {
          if (cacheKey.startsWith(key + ':')) {
            this.cache.delete(cacheKey);
          }
        }
      }
    }
  }
}

// Parallel data fetching with automatic batching
class ParallelDataLoader {
  private loaders: Map<string, (ids: string[]) => Promise<Map<string, any>>> =
    new Map();
  private batches: Map<string, { ids: Set<string>; promise: Promise<void> }> =
    new Map();
  private results: Map<string, Map<string, any>> = new Map();

  registerLoader(
    type: string,
    loader: (ids: string[]) => Promise<Map<string, any>>
  ): void {
    this.loaders.set(type, loader);
  }

  async load(type: string, id: string): Promise<any> {
    const loader = this.loaders.get(type);
    if (!loader) {
      throw new Error(`No loader registered for type: ${type}`);
    }

    // Check if already loaded
    const typeResults = this.results.get(type);
    if (typeResults?.has(id)) {
      return typeResults.get(id);
    }

    // Add to batch
    let batch = this.batches.get(type);
    if (!batch) {
      const ids = new Set<string>();
      const promise = this.scheduleBatch(type, ids, loader);
      batch = { ids, promise };
      this.batches.set(type, batch);
    }

    batch.ids.add(id);

    // Wait for batch to complete
    await batch.promise;

    return this.results.get(type)?.get(id);
  }

  private async scheduleBatch(
    type: string,
    ids: Set<string>,
    loader: (ids: string[]) => Promise<Map<string, any>>
  ): Promise<void> {
    // Wait for next tick to collect more IDs
    await new Promise((resolve) => process.nextTick(resolve));

    // Clear the batch
    this.batches.delete(type);

    // Load all IDs
    const results = await loader(Array.from(ids));

    // Store results
    let typeResults = this.results.get(type);
    if (!typeResults) {
      typeResults = new Map();
      this.results.set(type, typeResults);
    }

    for (const [id, value] of results) {
      typeResults.set(id, value);
    }
  }

  clear(): void {
    this.results.clear();
    this.batches.clear();
  }
}
```

## Connection Pooling and Keep-Alive

Proper connection management can significantly reduce TTFB by reusing connections.

```typescript
import http from 'http';
import https from 'https';
import { Pool } from 'pg';
import Redis from 'ioredis';

interface ConnectionPoolConfig {
  database: {
    connectionString: string;
    maxConnections: number;
    idleTimeout: number;
    connectionTimeout: number;
  };
  redis: {
    host: string;
    port: number;
    maxConnections: number;
  };
  http: {
    maxSockets: number;
    maxFreeSockets: number;
    timeout: number;
    keepAlive: boolean;
  };
}

class ConnectionManager {
  private dbPool: Pool;
  private redisPool: Redis[];
  private redisIndex: number = 0;
  private httpAgent: http.Agent;
  private httpsAgent: https.Agent;

  constructor(config: ConnectionPoolConfig) {
    // Database connection pool
    this.dbPool = new Pool({
      connectionString: config.database.connectionString,
      max: config.database.maxConnections,
      idleTimeoutMillis: config.database.idleTimeout,
      connectionTimeoutMillis: config.database.connectionTimeout,
    });

    // Warm up database connections
    this.warmDatabaseConnections();

    // Redis connection pool
    this.redisPool = Array.from(
      { length: config.redis.maxConnections },
      () =>
        new Redis({
          host: config.redis.host,
          port: config.redis.port,
          lazyConnect: true,
        })
    );

    // HTTP agents with keep-alive
    this.httpAgent = new http.Agent({
      keepAlive: config.http.keepAlive,
      maxSockets: config.http.maxSockets,
      maxFreeSockets: config.http.maxFreeSockets,
      timeout: config.http.timeout,
    });

    this.httpsAgent = new https.Agent({
      keepAlive: config.http.keepAlive,
      maxSockets: config.http.maxSockets,
      maxFreeSockets: config.http.maxFreeSockets,
      timeout: config.http.timeout,
    });
  }

  private async warmDatabaseConnections(): Promise<void> {
    const warmupQueries = 5;
    const promises: Promise<any>[] = [];

    for (let i = 0; i < warmupQueries; i++) {
      promises.push(this.dbPool.query('SELECT 1'));
    }

    await Promise.all(promises);
    console.log('Database connections warmed up');
  }

  getDbPool(): Pool {
    return this.dbPool;
  }

  getRedisClient(): Redis {
    // Round-robin selection
    const client = this.redisPool[this.redisIndex];
    this.redisIndex = (this.redisIndex + 1) % this.redisPool.length;
    return client;
  }

  getHttpAgent(url: string): http.Agent | https.Agent {
    return url.startsWith('https') ? this.httpsAgent : this.httpAgent;
  }

  async healthCheck(): Promise<{
    database: boolean;
    redis: boolean;
    connections: {
      dbTotal: number;
      dbIdle: number;
      dbWaiting: number;
      httpSockets: number;
      httpFreeSockets: number;
    };
  }> {
    let dbHealthy = false;
    let redisHealthy = false;

    try {
      await this.dbPool.query('SELECT 1');
      dbHealthy = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    try {
      await this.redisPool[0].ping();
      redisHealthy = true;
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    return {
      database: dbHealthy,
      redis: redisHealthy,
      connections: {
        dbTotal: this.dbPool.totalCount,
        dbIdle: this.dbPool.idleCount,
        dbWaiting: this.dbPool.waitingCount,
        httpSockets: Object.keys(this.httpAgent.sockets).length,
        httpFreeSockets: Object.keys(this.httpAgent.freeSockets).length,
      },
    };
  }

  async shutdown(): Promise<void> {
    await this.dbPool.end();
    await Promise.all(this.redisPool.map((client) => client.quit()));
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}

// Optimized fetch with connection reuse
const createOptimizedFetch = (connectionManager: ConnectionManager) => {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const agent = connectionManager.getHttpAgent(url);

    return fetch(url, {
      ...options,
      // @ts-ignore - agent is valid but not in types
      agent,
    });
  };
};
```

## Server Infrastructure Considerations

The server infrastructure plays a crucial role in TTFB optimization.

```typescript
import cluster from 'cluster';
import os from 'os';
import express from 'express';
import compression from 'compression';

interface ServerConfig {
  port: number;
  workers: number;
  compression: boolean;
  trustProxy: boolean;
}

const createOptimizedServer = (config: ServerConfig) => {
  if (cluster.isPrimary) {
    const numWorkers = config.workers || os.cpus().length;

    console.log(`Primary process starting ${numWorkers} workers`);

    // Fork workers
    for (let i = 0; i < numWorkers; i++) {
      cluster.fork();
    }

    // Handle worker crashes
    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died. Restarting...`);
      cluster.fork();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      for (const worker of Object.values(cluster.workers || {})) {
        worker?.kill('SIGTERM');
      }
    });
  } else {
    const app = express();

    // Trust proxy for correct client IP behind load balancer
    if (config.trustProxy) {
      app.set('trust proxy', true);
    }

    // Compression middleware
    if (config.compression) {
      app.use(
        compression({
          level: 6,
          threshold: 1024,
          filter: (req, res) => {
            if (req.headers['x-no-compression']) {
              return false;
            }
            return compression.filter(req, res);
          },
        })
      );
    }

    // Disable x-powered-by header
    app.disable('x-powered-by');

    // Add timing headers
    app.use((req, res, next) => {
      const start = process.hrtime.bigint();

      res.on('finish', () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000;
        console.log(`${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
      });

      next();
    });

    return app;
  }
};

// Kubernetes-ready health endpoints
const addHealthEndpoints = (app: express.Application) => {
  // Liveness probe - is the process running?
  app.get('/health/live', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Readiness probe - is the app ready to serve traffic?
  app.get('/health/ready', async (req, res) => {
    try {
      // Check all dependencies
      const checks = await Promise.all([
        checkDatabase(),
        checkCache(),
        checkExternalServices(),
      ]);

      const allHealthy = checks.every((check) => check.healthy);

      if (allHealthy) {
        res.status(200).json({ status: 'ready', checks });
      } else {
        res.status(503).json({ status: 'not ready', checks });
      }
    } catch (error) {
      res.status(503).json({ status: 'error', error: error.message });
    }
  });
};

// Memory-efficient request handling
const configureMemoryLimits = () => {
  // Set heap size limits
  const maxHeapSize = parseInt(process.env.MAX_HEAP_SIZE || '512', 10);

  // Monitor memory usage
  setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;

    if (heapUsedMB > maxHeapSize * 0.9) {
      console.warn(
        `High memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB`
      );

      // Trigger garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }, 30000);

  // Handle out of memory
  process.on('warning', (warning) => {
    if (warning.name === 'MaxListenersExceededWarning') {
      console.error('Memory warning:', warning);
    }
  });
};
```

## Monitoring and Alerting for TTFB

Comprehensive monitoring is essential for maintaining optimal TTFB.

```typescript
import { EventEmitter } from 'events';

interface TTFBMetric {
  timestamp: Date;
  path: string;
  ttfb: number;
  statusCode: number;
  cacheStatus: 'HIT' | 'MISS' | 'STALE' | 'BYPASS';
  userAgent: string;
  region?: string;
}

interface TTFBAlert {
  type: 'warning' | 'critical';
  message: string;
  metric: TTFBMetric;
  threshold: number;
}

interface TTFBThresholds {
  warning: number;
  critical: number;
  p95Warning: number;
  p99Critical: number;
}

class TTFBMonitor extends EventEmitter {
  private metrics: TTFBMetric[] = [];
  private thresholds: TTFBThresholds;
  private maxMetrics: number = 10000;
  private alertCooldown: Map<string, number> = new Map();

  constructor(thresholds: TTFBThresholds) {
    super();
    this.thresholds = thresholds;

    // Periodic cleanup
    setInterval(() => this.cleanup(), 60000);

    // Periodic analysis
    setInterval(() => this.analyzeMetrics(), 30000);
  }

  record(metric: TTFBMetric): void {
    this.metrics.push(metric);

    // Immediate alert check
    if (metric.ttfb > this.thresholds.critical) {
      this.emitAlert({
        type: 'critical',
        message: `Critical TTFB: ${metric.ttfb.toFixed(2)}ms for ${metric.path}`,
        metric,
        threshold: this.thresholds.critical,
      });
    } else if (metric.ttfb > this.thresholds.warning) {
      this.emitAlert({
        type: 'warning',
        message: `High TTFB: ${metric.ttfb.toFixed(2)}ms for ${metric.path}`,
        metric,
        threshold: this.thresholds.warning,
      });
    }

    // Trim if needed
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }
  }

  private analyzeMetrics(): void {
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes

    if (recentMetrics.length < 10) return;

    const sorted = [...recentMetrics].sort((a, b) => a.ttfb - b.ttfb);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    const p95 = sorted[p95Index].ttfb;
    const p99 = sorted[p99Index].ttfb;
    const avg = recentMetrics.reduce((sum, m) => sum + m.ttfb, 0) / recentMetrics.length;

    // Check percentile thresholds
    if (p99 > this.thresholds.p99Critical) {
      this.emitAlert({
        type: 'critical',
        message: `P99 TTFB critical: ${p99.toFixed(2)}ms`,
        metric: sorted[p99Index],
        threshold: this.thresholds.p99Critical,
      });
    }

    if (p95 > this.thresholds.p95Warning) {
      this.emitAlert({
        type: 'warning',
        message: `P95 TTFB elevated: ${p95.toFixed(2)}ms`,
        metric: sorted[p95Index],
        threshold: this.thresholds.p95Warning,
      });
    }

    // Emit statistics
    this.emit('stats', {
      avg,
      p50: sorted[Math.floor(sorted.length * 0.5)].ttfb,
      p95,
      p99,
      count: recentMetrics.length,
      cacheHitRate: this.calculateCacheHitRate(recentMetrics),
    });
  }

  private calculateCacheHitRate(metrics: TTFBMetric[]): number {
    const cacheableMetrics = metrics.filter(
      (m) => m.cacheStatus !== 'BYPASS'
    );
    if (cacheableMetrics.length === 0) return 0;

    const hits = cacheableMetrics.filter((m) => m.cacheStatus === 'HIT').length;
    return hits / cacheableMetrics.length;
  }

  private emitAlert(alert: TTFBAlert): void {
    const cooldownKey = `${alert.type}:${alert.metric.path}`;
    const lastAlert = this.alertCooldown.get(cooldownKey);

    // 5-minute cooldown per path/type combination
    if (lastAlert && Date.now() - lastAlert < 5 * 60 * 1000) {
      return;
    }

    this.alertCooldown.set(cooldownKey, Date.now());
    this.emit('alert', alert);
  }

  private getRecentMetrics(duration: number): TTFBMetric[] {
    const cutoff = Date.now() - duration;
    return this.metrics.filter((m) => m.timestamp.getTime() > cutoff);
  }

  private cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.metrics = this.metrics.filter(
      (m) => m.timestamp.getTime() > oneHourAgo
    );

    // Clean old cooldowns
    for (const [key, time] of this.alertCooldown) {
      if (Date.now() - time > 10 * 60 * 1000) {
        this.alertCooldown.delete(key);
      }
    }
  }

  getStatistics(): {
    total: number;
    avgTTFB: number;
    byPath: Map<string, { avg: number; count: number }>;
    byCacheStatus: Map<string, number>;
  } {
    const byPath = new Map<string, { total: number; count: number }>();
    const byCacheStatus = new Map<string, number>();

    let totalTTFB = 0;

    for (const metric of this.metrics) {
      totalTTFB += metric.ttfb;

      const pathStats = byPath.get(metric.path) || { total: 0, count: 0 };
      pathStats.total += metric.ttfb;
      pathStats.count++;
      byPath.set(metric.path, pathStats);

      byCacheStatus.set(
        metric.cacheStatus,
        (byCacheStatus.get(metric.cacheStatus) || 0) + 1
      );
    }

    const avgByPath = new Map<string, { avg: number; count: number }>();
    for (const [path, stats] of byPath) {
      avgByPath.set(path, {
        avg: stats.total / stats.count,
        count: stats.count,
      });
    }

    return {
      total: this.metrics.length,
      avgTTFB: this.metrics.length > 0 ? totalTTFB / this.metrics.length : 0,
      byPath: avgByPath,
      byCacheStatus,
    };
  }
}

// Integration with monitoring middleware
const createTTFBMiddleware = (monitor: TTFBMonitor) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime.bigint();

    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      const endTime = process.hrtime.bigint();
      const ttfb = Number(endTime - startTime) / 1_000_000;

      monitor.record({
        timestamp: new Date(),
        path: req.path,
        ttfb,
        statusCode: res.statusCode,
        cacheStatus:
          (res.getHeader('X-Cache') as TTFBMetric['cacheStatus']) || 'BYPASS',
        userAgent: req.headers['user-agent'] || 'unknown',
        region: req.headers['cf-ipcountry'] as string,
      });

      return originalSend(body);
    };

    next();
  };
};

// Alert handlers
const setupAlertHandlers = (monitor: TTFBMonitor) => {
  monitor.on('alert', async (alert: TTFBAlert) => {
    console.error(`[TTFB Alert] ${alert.type}: ${alert.message}`);

    // Send to alerting service
    if (alert.type === 'critical') {
      await sendPagerDutyAlert(alert);
    }

    await sendSlackNotification(alert);
  });

  monitor.on('stats', (stats) => {
    console.log('TTFB Statistics:', {
      avg: `${stats.avg.toFixed(2)}ms`,
      p50: `${stats.p50.toFixed(2)}ms`,
      p95: `${stats.p95.toFixed(2)}ms`,
      p99: `${stats.p99.toFixed(2)}ms`,
      cacheHitRate: `${(stats.cacheHitRate * 100).toFixed(1)}%`,
    });
  });
};
```

## Conclusion

Optimizing TTFB in React SSR applications requires a multi-faceted approach. Here is a summary of the key strategies covered:

1. **Measure First**: Implement comprehensive timing instrumentation to understand where time is spent
2. **Cache Aggressively**: Use in-memory, distributed, and edge caching at multiple levels
3. **Stream HTML**: Leverage React 18's streaming SSR to send content progressively
4. **Optimize Data Fetching**: Batch queries, cache results, and fetch in parallel where possible
5. **Manage Connections**: Use connection pooling for databases, caches, and HTTP clients
6. **Scale Infrastructure**: Use clustering, load balancing, and edge computing
7. **Monitor Continuously**: Set up alerting for TTFB regressions before users notice

By implementing these techniques, you can achieve sub-200ms TTFB for most requests, providing users with a fast, responsive experience while also improving your Core Web Vitals scores and SEO rankings.

Remember that optimization is an ongoing process. Continuously monitor your TTFB metrics, identify bottlenecks, and iterate on your solutions. The investment in TTFB optimization pays dividends in user satisfaction, conversion rates, and search engine visibility.

---

## Further Reading

- [React 18 Streaming SSR Documentation](https://react.dev/reference/react-dom/server)
- [Web Vitals by Google](https://web.dev/vitals/)
- [HTTP Caching Best Practices](https://web.dev/http-cache/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)
