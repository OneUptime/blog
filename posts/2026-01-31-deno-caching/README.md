# How to Implement Caching in Deno Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, Caching, Performance, Backend

Description: A comprehensive guide to implementing various caching strategies in Deno applications, including in-memory caching, LRU cache, TTL cache, and popular caching patterns.

---

Caching is one of the most effective techniques for improving application performance. By storing frequently accessed data in a fast-access layer, you can dramatically reduce response times, lower database load, and improve overall user experience. In this guide, we will explore different caching strategies and implementations specifically tailored for Deno applications.

## Why Caching Matters

Before diving into implementation details, let us understand why caching is crucial for modern applications:

- **Reduced Latency**: Retrieving data from cache is significantly faster than fetching from a database or external API
- **Lower Resource Usage**: Caching reduces the load on databases and external services
- **Cost Savings**: Fewer API calls and database queries translate to lower infrastructure costs
- **Improved Scalability**: Applications can handle more concurrent users with effective caching

## Basic In-Memory Caching

The simplest form of caching is in-memory caching using JavaScript's built-in Map object. This approach works well for small datasets and single-instance applications.

This basic cache implementation uses a Map to store key-value pairs with optional expiration times:

```typescript
// basic-cache.ts
class BasicCache<T> {
  private cache: Map<string, { value: T; expiresAt: number | null }>;

  constructor() {
    this.cache = new Map();
  }

  // Set a value with optional TTL (time-to-live) in milliseconds
  set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.cache.set(key, { value, expiresAt });
  }

  // Get a value, returning undefined if expired or not found
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  // Check if a key exists and is not expired
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  // Remove a specific key from cache
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all entries from cache
  clear(): void {
    this.cache.clear();
  }

  // Get the current size of the cache
  get size(): number {
    return this.cache.size;
  }
}

// Usage example
const userCache = new BasicCache<{ name: string; email: string }>();

// Cache user data for 5 minutes
userCache.set("user:123", { name: "John Doe", email: "john@example.com" }, 300000);

// Retrieve cached data
const user = userCache.get("user:123");
console.log(user); // { name: "John Doe", email: "john@example.com" }
```

## LRU (Least Recently Used) Cache

An LRU cache automatically evicts the least recently used items when the cache reaches its maximum capacity. This is essential for memory-constrained environments where you cannot cache everything indefinitely.

This LRU implementation uses a Map combined with tracking of access order to efficiently evict old entries:

```typescript
// lru-cache.ts
class LRUCache<T> {
  private cache: Map<string, T>;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error("Cache size must be greater than 0");
    }
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  // Get a value and move it to the end (most recently used)
  get(key: string): T | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end by deleting and re-adding
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  // Set a value, evicting LRU item if at capacity
  set(key: string, value: T): void {
    // If key exists, delete it first to update its position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict the least recently used item (first item in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  // Check if key exists
  has(key: string): boolean {
    return this.cache.has(key);
  }

  // Delete a specific key
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Get current cache size
  get size(): number {
    return this.cache.size;
  }

  // Get all keys in order from LRU to MRU
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Usage example
const pageCache = new LRUCache<string>(3);

pageCache.set("page1", "Content 1");
pageCache.set("page2", "Content 2");
pageCache.set("page3", "Content 3");

// Access page1 to make it most recently used
pageCache.get("page1");

// Adding page4 will evict page2 (least recently used)
pageCache.set("page4", "Content 4");

console.log(pageCache.keys()); // ["page3", "page1", "page4"]
```

## TTL Cache with Automatic Cleanup

A TTL (Time-To-Live) cache automatically expires entries after a specified duration. This implementation includes periodic cleanup to prevent memory leaks from expired entries.

This TTL cache includes automatic cleanup intervals to remove expired entries proactively:

```typescript
// ttl-cache.ts
class TTLCache<T> {
  private cache: Map<string, { value: T; expiresAt: number }>;
  private cleanupIntervalId: number | null = null;
  private readonly defaultTTL: number;

  constructor(defaultTTLMs: number, cleanupIntervalMs: number = 60000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTLMs;
    
    // Start periodic cleanup
    this.startCleanup(cleanupIntervalMs);
  }

  // Start the cleanup interval
  private startCleanup(intervalMs: number): void {
    this.cleanupIntervalId = setInterval(() => {
      this.removeExpired();
    }, intervalMs);
  }

  // Remove all expired entries
  private removeExpired(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`Cleaned up ${expiredCount} expired cache entries`);
    }
  }

  // Set a value with optional custom TTL
  set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  // Get a value, returning undefined if expired
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  // Get the remaining TTL for a key in milliseconds
  getTTL(key: string): number | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : undefined;
  }

  // Refresh the TTL for an existing key
  touch(key: string, ttlMs?: number): boolean {
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() > entry.expiresAt) {
      return false;
    }

    entry.expiresAt = Date.now() + (ttlMs ?? this.defaultTTL);
    return true;
  }

  // Stop the cleanup interval and clear all entries
  destroy(): void {
    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Usage example
const sessionCache = new TTLCache<{ userId: string; token: string }>(
  3600000,  // 1 hour default TTL
  300000    // Cleanup every 5 minutes
);

sessionCache.set("session:abc123", {
  userId: "user123",
  token: "jwt-token-here"
});

// Check remaining TTL
const ttl = sessionCache.getTTL("session:abc123");
console.log(`Session expires in ${ttl}ms`);

// Refresh session on activity
sessionCache.touch("session:abc123");
```

## Cache Invalidation Strategies

Cache invalidation is one of the most challenging aspects of caching. Here are several strategies you can implement in Deno applications.

### Tag-Based Invalidation

This approach allows you to associate cache entries with tags and invalidate all entries with a specific tag at once:

```typescript
// tag-cache.ts
class TaggedCache<T> {
  private cache: Map<string, { value: T; tags: Set<string> }>;
  private tagIndex: Map<string, Set<string>>;

  constructor() {
    this.cache = new Map();
    this.tagIndex = new Map();
  }

  // Set a value with associated tags
  set(key: string, value: T, tags: string[] = []): void {
    // Remove old tag associations if key exists
    this.delete(key);

    const tagSet = new Set(tags);
    this.cache.set(key, { value, tags: tagSet });

    // Update tag index
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  // Get a cached value
  get(key: string): T | undefined {
    return this.cache.get(key)?.value;
  }

  // Delete a specific key and clean up tag index
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Remove from tag index
    for (const tag of entry.tags) {
      const tagKeys = this.tagIndex.get(tag);
      if (tagKeys) {
        tagKeys.delete(key);
        if (tagKeys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    return this.cache.delete(key);
  }

  // Invalidate all entries with a specific tag
  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    
    if (!keys) {
      return 0;
    }

    let count = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        count++;
      }
    }

    return count;
  }

  // Get all tags
  getTags(): string[] {
    return Array.from(this.tagIndex.keys());
  }
}

// Usage example
const productCache = new TaggedCache<{ name: string; price: number }>();

productCache.set("product:1", { name: "Laptop", price: 999 }, ["electronics", "featured"]);
productCache.set("product:2", { name: "Phone", price: 599 }, ["electronics", "mobile"]);
productCache.set("product:3", { name: "Book", price: 29 }, ["books", "featured"]);

// Invalidate all electronics products
const invalidated = productCache.invalidateByTag("electronics");
console.log(`Invalidated ${invalidated} electronic products`);
```

## HTTP Response Caching

When building HTTP servers in Deno, you can implement response caching to avoid processing the same requests repeatedly.

This middleware-style cache stores HTTP responses keyed by request URL and method:

```typescript
// http-cache.ts

interface CachedResponse {
  body: string;
  headers: Record<string, string>;
  status: number;
  cachedAt: number;
}

class HTTPCache {
  private cache: Map<string, CachedResponse>;
  private readonly maxAge: number;

  constructor(maxAgeSeconds: number = 300) {
    this.cache = new Map();
    this.maxAge = maxAgeSeconds * 1000;
  }

  // Generate a cache key from request
  private getCacheKey(request: Request): string {
    const url = new URL(request.url);
    return `${request.method}:${url.pathname}${url.search}`;
  }

  // Check if response should be cached based on headers
  private shouldCache(response: Response): boolean {
    const cacheControl = response.headers.get("cache-control");
    
    if (cacheControl) {
      if (cacheControl.includes("no-store") || cacheControl.includes("no-cache")) {
        return false;
      }
    }

    // Only cache successful GET requests by default
    return response.ok;
  }

  // Get cached response if available and valid
  async get(request: Request): Promise<Response | null> {
    // Only cache GET requests
    if (request.method !== "GET") {
      return null;
    }

    const key = this.getCacheKey(request);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() - cached.cachedAt > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Return cached response with cache hit header
    const headers = new Headers(cached.headers);
    headers.set("x-cache", "HIT");
    headers.set("x-cache-age", String(Math.floor((Date.now() - cached.cachedAt) / 1000)));

    return new Response(cached.body, {
      status: cached.status,
      headers
    });
  }

  // Store response in cache
  async set(request: Request, response: Response): Promise<Response> {
    if (request.method !== "GET" || !this.shouldCache(response)) {
      return response;
    }

    const key = this.getCacheKey(request);
    const body = await response.text();

    // Store response data
    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });

    this.cache.set(key, {
      body,
      headers,
      status: response.status,
      cachedAt: Date.now()
    });

    // Return new response since we consumed the body
    const newHeaders = new Headers(headers);
    newHeaders.set("x-cache", "MISS");

    return new Response(body, {
      status: response.status,
      headers: newHeaders
    });
  }

  // Invalidate cached responses matching a pattern
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }
}

// Usage with Deno HTTP server
const httpCache = new HTTPCache(300); // 5 minute cache

async function handleRequest(request: Request): Promise<Response> {
  // Check cache first
  const cached = await httpCache.get(request);
  if (cached) {
    return cached;
  }

  // Process request (example: fetch from database)
  const data = { message: "Hello from server", timestamp: Date.now() };
  const response = new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" }
  });

  // Cache and return response
  return httpCache.set(request, response);
}

// Start server
Deno.serve({ port: 8000 }, handleRequest);
```

## Caching Patterns

### Cache-Aside Pattern

The cache-aside pattern (also known as lazy loading) loads data into cache only when needed. The application first checks the cache, and if the data is not present, it fetches from the data source and populates the cache.

This pattern gives you full control over when data is cached and is ideal for read-heavy workloads:

```typescript
// cache-aside.ts

interface User {
  id: string;
  name: string;
  email: string;
}

class UserRepository {
  private cache: Map<string, { user: User; timestamp: number }>;
  private readonly cacheTTL = 300000; // 5 minutes

  constructor() {
    this.cache = new Map();
  }

  // Simulate database fetch
  private async fetchFromDatabase(userId: string): Promise<User | null> {
    console.log(`Fetching user ${userId} from database...`);
    
    // Simulate database latency
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulated database response
    return {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`
    };
  }

  // Cache-aside pattern implementation
  async getUser(userId: string): Promise<User | null> {
    const cacheKey = `user:${userId}`;
    const cached = this.cache.get(cacheKey);

    // Check if we have valid cached data
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`Cache HIT for user ${userId}`);
      return cached.user;
    }

    console.log(`Cache MISS for user ${userId}`);
    
    // Fetch from database
    const user = await this.fetchFromDatabase(userId);
    
    if (user) {
      // Populate cache
      this.cache.set(cacheKey, { user, timestamp: Date.now() });
    }

    return user;
  }

  // Update user and invalidate cache
  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    // Update database first
    console.log(`Updating user ${userId} in database...`);
    await new Promise(resolve => setTimeout(resolve, 50));

    // Invalidate cache
    const cacheKey = `user:${userId}`;
    this.cache.delete(cacheKey);
    console.log(`Cache invalidated for user ${userId}`);

    // Return updated user (will be fetched fresh next time)
    return this.getUser(userId);
  }
}

// Usage
const userRepo = new UserRepository();

async function main() {
  // First call - cache miss, fetches from database
  const user1 = await userRepo.getUser("123");
  console.log(user1);

  // Second call - cache hit
  const user2 = await userRepo.getUser("123");
  console.log(user2);

  // Update invalidates cache
  await userRepo.updateUser("123", { name: "Updated Name" });
}

main();
```

### Write-Through Pattern

The write-through pattern ensures that data is written to both the cache and the data store simultaneously. This guarantees cache consistency but may introduce additional latency on writes.

This pattern ensures cache and database are always in sync, ideal for applications requiring strong consistency:

```typescript
// write-through.ts

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

class ProductStore {
  private cache: Map<string, Product>;
  private database: Map<string, Product>; // Simulated database

  constructor() {
    this.cache = new Map();
    this.database = new Map();
  }

  // Simulate database write
  private async writeToDatabase(product: Product): Promise<void> {
    console.log(`Writing product ${product.id} to database...`);
    await new Promise(resolve => setTimeout(resolve, 50));
    this.database.set(product.id, { ...product });
  }

  // Simulate database read
  private async readFromDatabase(productId: string): Promise<Product | null> {
    console.log(`Reading product ${productId} from database...`);
    await new Promise(resolve => setTimeout(resolve, 50));
    return this.database.get(productId) ?? null;
  }

  // Write-through: write to both cache and database
  async saveProduct(product: Product): Promise<void> {
    // Write to database first
    await this.writeToDatabase(product);
    
    // Then update cache
    this.cache.set(product.id, { ...product });
    console.log(`Product ${product.id} cached`);
  }

  // Read with cache-aside for reads
  async getProduct(productId: string): Promise<Product | null> {
    // Check cache first
    const cached = this.cache.get(productId);
    if (cached) {
      console.log(`Cache HIT for product ${productId}`);
      return cached;
    }

    // Fetch from database and cache
    const product = await this.readFromDatabase(productId);
    if (product) {
      this.cache.set(productId, product);
    }
    
    return product;
  }

  // Update stock with write-through
  async updateStock(productId: string, quantity: number): Promise<boolean> {
    const product = await this.getProduct(productId);
    
    if (!product) {
      return false;
    }

    product.stock += quantity;
    
    // Write-through update
    await this.saveProduct(product);
    
    return true;
  }
}

// Usage
const store = new ProductStore();

async function main() {
  // Create product with write-through
  await store.saveProduct({
    id: "prod-001",
    name: "Wireless Mouse",
    price: 29.99,
    stock: 100
  });

  // Read from cache
  const product = await store.getProduct("prod-001");
  console.log(product);

  // Update stock - write-through ensures consistency
  await store.updateStock("prod-001", -5);
  
  // Verify update
  const updated = await store.getProduct("prod-001");
  console.log(`New stock: ${updated?.stock}`);
}

main();
```

## Performance Measurement

To ensure your caching strategy is effective, you should measure cache performance including hit rates, latency, and memory usage.

This utility class tracks cache statistics and calculates important performance metrics:

```typescript
// cache-metrics.ts

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalGetTime: number;
  totalSetTime: number;
}

class MonitoredCache<T> {
  private cache: Map<string, { value: T; size: number }>;
  private metrics: CacheMetrics;
  private readonly maxSize: number;

  constructor(maxEntries: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxEntries;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalGetTime: 0,
      totalSetTime: 0
    };
  }

  // Estimate size of value in bytes
  private estimateSize(value: T): number {
    const str = JSON.stringify(value);
    return new TextEncoder().encode(str).length;
  }

  // Get value with timing
  get(key: string): T | undefined {
    const start = performance.now();
    
    const entry = this.cache.get(key);
    
    if (entry) {
      // Move to end for LRU behavior
      this.cache.delete(key);
      this.cache.set(key, entry);
      
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }

    this.metrics.totalGetTime += performance.now() - start;
    return entry?.value;
  }

  // Set value with timing and eviction
  set(key: string, value: T): void {
    const start = performance.now();

    // Check if we need to evict
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.metrics.evictions++;
      }
    }

    const size = this.estimateSize(value);
    this.cache.set(key, { value, size });
    this.metrics.sets++;

    this.metrics.totalSetTime += performance.now() - start;
  }

  // Delete a key
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.metrics.deletes++;
    }
    return result;
  }

  // Get current statistics
  getStats(): {
    hitRate: number;
    missRate: number;
    averageGetTime: number;
    averageSetTime: number;
    totalEntries: number;
    totalSizeBytes: number;
    evictionRate: number;
  } {
    const totalGets = this.metrics.hits + this.metrics.misses;
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    return {
      hitRate: totalGets > 0 ? this.metrics.hits / totalGets : 0,
      missRate: totalGets > 0 ? this.metrics.misses / totalGets : 0,
      averageGetTime: totalGets > 0 ? this.metrics.totalGetTime / totalGets : 0,
      averageSetTime: this.metrics.sets > 0 ? this.metrics.totalSetTime / this.metrics.sets : 0,
      totalEntries: this.cache.size,
      totalSizeBytes: totalSize,
      evictionRate: this.metrics.sets > 0 ? this.metrics.evictions / this.metrics.sets : 0
    };
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalGetTime: 0,
      totalSetTime: 0
    };
  }

  // Print formatted stats
  printStats(): void {
    const stats = this.getStats();
    console.log("\n=== Cache Statistics ===");
    console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`Miss Rate: ${(stats.missRate * 100).toFixed(2)}%`);
    console.log(`Average Get Time: ${stats.averageGetTime.toFixed(3)}ms`);
    console.log(`Average Set Time: ${stats.averageSetTime.toFixed(3)}ms`);
    console.log(`Total Entries: ${stats.totalEntries}`);
    console.log(`Total Size: ${(stats.totalSizeBytes / 1024).toFixed(2)} KB`);
    console.log(`Eviction Rate: ${(stats.evictionRate * 100).toFixed(2)}%`);
    console.log("========================\n");
  }
}

// Benchmark example
async function runBenchmark() {
  const cache = new MonitoredCache<{ data: string }>(100);

  console.log("Running cache benchmark...\n");

  // Populate cache
  for (let i = 0; i < 150; i++) {
    cache.set(`key-${i}`, { data: `Value for key ${i}`.repeat(10) });
  }

  // Simulate realistic access pattern (some keys more popular)
  for (let i = 0; i < 1000; i++) {
    // 80% of requests go to 20% of keys (Pareto distribution)
    const keyIndex = Math.random() < 0.8 
      ? Math.floor(Math.random() * 30) + 50  // Hot keys (50-79)
      : Math.floor(Math.random() * 150);      // All keys
    
    cache.get(`key-${keyIndex}`);
  }

  cache.printStats();
}

runBenchmark();
```

## Using Redis with Deno

For production applications that need distributed caching across multiple instances, Redis is an excellent choice. Here is how to integrate Redis caching in Deno.

This example demonstrates connecting to Redis and implementing basic caching operations:

```typescript
// redis-cache.ts
import { connect } from "https://deno.land/x/redis@v0.32.0/mod.ts";

class RedisCache {
  private client: Awaited<ReturnType<typeof connect>> | null = null;
  private readonly defaultTTL: number;

  constructor(defaultTTLSeconds: number = 300) {
    this.defaultTTL = defaultTTLSeconds;
  }

  // Connect to Redis
  async connect(options: { hostname: string; port: number; password?: string }): Promise<void> {
    this.client = await connect(options);
    console.log("Connected to Redis");
  }

  // Set a value with optional TTL
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client) {
      throw new Error("Not connected to Redis");
    }

    const serialized = JSON.stringify(value);
    const ttl = ttlSeconds ?? this.defaultTTL;
    
    await this.client.setex(key, ttl, serialized);
  }

  // Get a value
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) {
      throw new Error("Not connected to Redis");
    }

    const value = await this.client.get(key);
    
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  // Delete a key
  async delete(key: string): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to Redis");
    }

    const result = await this.client.del(key);
    return result > 0;
  }

  // Delete keys matching a pattern
  async deletePattern(pattern: string): Promise<number> {
    if (!this.client) {
      throw new Error("Not connected to Redis");
    }

    const keys = await this.client.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }

    return await this.client.del(...keys);
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      throw new Error("Not connected to Redis");
    }

    const result = await this.client.exists(key);
    return result > 0;
  }

  // Get remaining TTL
  async getTTL(key: string): Promise<number> {
    if (!this.client) {
      throw new Error("Not connected to Redis");
    }

    return await this.client.ttl(key);
  }

  // Close connection
  async close(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }
}

// Usage example
async function main() {
  const cache = new RedisCache(600); // 10 minute default TTL
  
  await cache.connect({
    hostname: "localhost",
    port: 6379
  });

  // Cache user session
  await cache.set("session:user123", {
    userId: "user123",
    permissions: ["read", "write"],
    loginTime: Date.now()
  });

  // Retrieve session
  const session = await cache.get<{ userId: string; permissions: string[] }>("session:user123");
  console.log("Session:", session);

  // Check TTL
  const ttl = await cache.getTTL("session:user123");
  console.log(`Session expires in ${ttl} seconds`);

  await cache.close();
}

main();
```

## Best Practices Summary

When implementing caching in your Deno applications, keep these best practices in mind:

1. **Choose the Right Cache Type**: Use in-memory caching for single-instance applications and Redis or similar distributed caches for multi-instance deployments.

2. **Set Appropriate TTLs**: Balance between data freshness and cache hit rates. Shorter TTLs ensure fresher data but lower hit rates.

3. **Implement Cache Warming**: For predictable access patterns, pre-populate the cache during application startup to avoid cold-start latency.

4. **Monitor Cache Performance**: Track hit rates, memory usage, and latency to ensure your caching strategy is effective.

5. **Use Cache Keys Wisely**: Create consistent, predictable cache keys that include all relevant parameters. Avoid keys that are too long or contain sensitive information.

6. **Handle Cache Failures Gracefully**: Always have a fallback to fetch data from the source when cache operations fail.

7. **Implement Proper Invalidation**: Choose an invalidation strategy that matches your data consistency requirements, whether it is TTL-based, event-based, or tag-based.

8. **Avoid Cache Stampedes**: Use techniques like cache locking or stale-while-revalidate to prevent multiple simultaneous cache misses from overwhelming your backend.

9. **Consider Memory Limits**: Implement size-based eviction policies (like LRU) to prevent unbounded memory growth.

10. **Test Cache Behavior**: Include cache behavior in your test suite, including testing cache misses, invalidation, and expiration scenarios.

## Conclusion

Caching is a powerful technique for improving application performance, but it requires careful consideration of your specific use case and requirements. In this guide, we explored various caching implementations for Deno applications, from simple in-memory caches to more sophisticated patterns like LRU, TTL, and tag-based caching.

The key to successful caching is understanding your data access patterns, consistency requirements, and infrastructure constraints. Start with simple caching solutions and add complexity only when needed. Always measure the impact of your caching strategy to ensure it is providing the expected benefits.

Whether you are building a small API or a large-scale distributed system, the caching patterns and implementations covered in this guide will help you build faster, more efficient Deno applications. Remember that caching is not a silver bullet. It works best when combined with other performance optimization techniques and proper application architecture.

By applying these caching strategies thoughtfully, you can significantly reduce latency, improve throughput, and deliver a better experience to your users while keeping your infrastructure costs under control.
