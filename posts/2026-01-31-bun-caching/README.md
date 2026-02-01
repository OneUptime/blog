# How to Implement Caching in Bun Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, Caching, Performance, Backend

Description: A comprehensive guide to implementing various caching strategies in Bun applications including in-memory caching, LRU cache, TTL cache, and HTTP caching headers.

---

Caching is one of the most effective ways to improve application performance. By storing frequently accessed data in memory, you can dramatically reduce response times and decrease load on your databases and external services. Bun, with its exceptional speed and built-in features, provides an excellent foundation for implementing robust caching solutions.

In this guide, we will explore multiple caching strategies, from simple in-memory caches to sophisticated patterns like cache-aside and write-through. Each approach has its trade-offs, and understanding when to use each one will help you build faster, more scalable applications.

## In-Memory Caching with Map

The simplest form of caching in Bun uses JavaScript's built-in `Map` object. This approach works well for small datasets that fit comfortably in memory and do not require expiration.

Here is a basic in-memory cache implementation using Map:

```typescript
// cache.ts - Simple in-memory cache using Map
class SimpleCache<T> {
  private cache: Map<string, T>;

  constructor() {
    this.cache = new Map();
  }

  // Store a value in the cache
  set(key: string, value: T): void {
    this.cache.set(key, value);
  }

  // Retrieve a value from the cache
  get(key: string): T | undefined {
    return this.cache.get(key);
  }

  // Check if a key exists in the cache
  has(key: string): boolean {
    return this.cache.has(key);
  }

  // Remove a specific key from the cache
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all entries from the cache
  clear(): void {
    this.cache.clear();
  }

  // Get the current size of the cache
  get size(): number {
    return this.cache.size;
  }
}

// Usage example
const userCache = new SimpleCache<{ id: number; name: string }>();
userCache.set("user:1", { id: 1, name: "Alice" });
console.log(userCache.get("user:1")); // { id: 1, name: "Alice" }
```

This simple cache is fast and easy to use, but it has limitations. It does not automatically expire entries, and it can grow unbounded, potentially causing memory issues in long-running applications.

## LRU (Least Recently Used) Cache

An LRU cache automatically evicts the least recently accessed items when the cache reaches its maximum capacity. This ensures bounded memory usage while keeping the most frequently accessed data available.

The following implementation uses a combination of Map and doubly-linked list logic for O(1) operations:

```typescript
// lru-cache.ts - LRU Cache implementation
interface CacheNode<T> {
  key: string;
  value: T;
  prev: CacheNode<T> | null;
  next: CacheNode<T> | null;
}

class LRUCache<T> {
  private capacity: number;
  private cache: Map<string, CacheNode<T>>;
  private head: CacheNode<T> | null;
  private tail: CacheNode<T> | null;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
    this.head = null;
    this.tail = null;
  }

  // Move a node to the front (most recently used position)
  private moveToFront(node: CacheNode<T>): void {
    if (node === this.head) return;

    // Remove from current position
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.tail) this.tail = node.prev;

    // Move to front
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  // Remove the least recently used item (tail)
  private removeTail(): void {
    if (!this.tail) return;

    this.cache.delete(this.tail.key);
    if (this.tail.prev) {
      this.tail.prev.next = null;
      this.tail = this.tail.prev;
    } else {
      this.head = null;
      this.tail = null;
    }
  }

  // Get a value and mark it as recently used
  get(key: string): T | undefined {
    const node = this.cache.get(key);
    if (!node) return undefined;

    this.moveToFront(node);
    return node.value;
  }

  // Set a value, evicting LRU item if at capacity
  set(key: string, value: T): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      existingNode.value = value;
      this.moveToFront(existingNode);
      return;
    }

    // Evict if at capacity
    if (this.cache.size >= this.capacity) {
      this.removeTail();
    }

    // Create new node at front
    const newNode: CacheNode<T> = {
      key,
      value,
      prev: null,
      next: this.head,
    };

    if (this.head) this.head.prev = newNode;
    this.head = newNode;
    if (!this.tail) this.tail = newNode;

    this.cache.set(key, newNode);
  }

  get size(): number {
    return this.cache.size;
  }
}

// Usage example
const lruCache = new LRUCache<string>(3);
lruCache.set("a", "value-a");
lruCache.set("b", "value-b");
lruCache.set("c", "value-c");
lruCache.set("d", "value-d"); // "a" gets evicted

console.log(lruCache.get("a")); // undefined (evicted)
console.log(lruCache.get("b")); // "value-b"
```

## TTL (Time-To-Live) Cache

A TTL cache automatically expires entries after a specified duration. This is essential for caching data that changes over time, such as API responses or user sessions.

This implementation stores timestamps with each entry and checks expiration on access:

```typescript
// ttl-cache.ts - Cache with time-to-live expiration
interface TTLEntry<T> {
  value: T;
  expiresAt: number;
}

class TTLCache<T> {
  private cache: Map<string, TTLEntry<T>>;
  private defaultTTL: number;
  private cleanupInterval: Timer | null;

  constructor(defaultTTLMs: number = 60000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTLMs;
    this.cleanupInterval = null;
  }

  // Start periodic cleanup of expired entries
  startCleanup(intervalMs: number = 30000): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.removeExpired();
    }, intervalMs);
  }

  // Stop the cleanup interval
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Remove all expired entries
  private removeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
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
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  // Check if a non-expired entry exists
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  // Delete a specific entry
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Get remaining TTL for an entry in milliseconds
  getTTL(key: string): number | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : undefined;
  }

  // Refresh the TTL for an existing entry
  touch(key: string, ttlMs?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) return false;

    entry.expiresAt = Date.now() + (ttlMs ?? this.defaultTTL);
    return true;
  }
}

// Usage example
const sessionCache = new TTLCache<{ userId: string; role: string }>(300000); // 5 min default
sessionCache.startCleanup(60000); // Cleanup every minute

sessionCache.set("session:abc123", { userId: "user1", role: "admin" });
sessionCache.set("session:xyz789", { userId: "user2", role: "viewer" }, 60000); // 1 min TTL

console.log(sessionCache.get("session:abc123")); // { userId: "user1", role: "admin" }
console.log(sessionCache.getTTL("session:abc123")); // ~299999
```

## Combined LRU-TTL Cache

For production applications, combining LRU and TTL provides both bounded memory usage and automatic expiration. This is the most robust approach for most use cases.

Here is a cache that combines both strategies:

```typescript
// lru-ttl-cache.ts - Combined LRU and TTL cache
interface LRUTTLEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  prev: LRUTTLEntry<T> | null;
  next: LRUTTLEntry<T> | null;
}

class LRUTTLCache<T> {
  private capacity: number;
  private defaultTTL: number;
  private cache: Map<string, LRUTTLEntry<T>>;
  private head: LRUTTLEntry<T> | null;
  private tail: LRUTTLEntry<T> | null;

  constructor(capacity: number, defaultTTLMs: number = 60000) {
    this.capacity = capacity;
    this.defaultTTL = defaultTTLMs;
    this.cache = new Map();
    this.head = null;
    this.tail = null;
  }

  private moveToFront(entry: LRUTTLEntry<T>): void {
    if (entry === this.head) return;

    // Detach from current position
    if (entry.prev) entry.prev.next = entry.next;
    if (entry.next) entry.next.prev = entry.prev;
    if (entry === this.tail) this.tail = entry.prev;

    // Attach at front
    entry.prev = null;
    entry.next = this.head;
    if (this.head) this.head.prev = entry;
    this.head = entry;
    if (!this.tail) this.tail = entry;
  }

  private removeTail(): void {
    if (!this.tail) return;
    this.cache.delete(this.tail.key);
    if (this.tail.prev) {
      this.tail.prev.next = null;
      this.tail = this.tail.prev;
    } else {
      this.head = null;
      this.tail = null;
    }
  }

  private isExpired(entry: LRUTTLEntry<T>): boolean {
    return entry.expiresAt <= Date.now();
  }

  set(key: string, value: T, ttlMs?: number): void {
    const existing = this.cache.get(key);
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTTL);

    if (existing) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      this.moveToFront(existing);
      return;
    }

    if (this.cache.size >= this.capacity) {
      this.removeTail();
    }

    const entry: LRUTTLEntry<T> = {
      key,
      value,
      expiresAt,
      prev: null,
      next: this.head,
    };

    if (this.head) this.head.prev = entry;
    this.head = entry;
    if (!this.tail) this.tail = entry;

    this.cache.set(key, entry);
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.delete(key);
      return undefined;
    }

    this.moveToFront(entry);
    return entry.value;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.prev) entry.prev.next = entry.next;
    if (entry.next) entry.next.prev = entry.prev;
    if (entry === this.head) this.head = entry.next;
    if (entry === this.tail) this.tail = entry.prev;

    return this.cache.delete(key);
  }
}
```

## Cache Invalidation Strategies

Cache invalidation is often described as one of the hardest problems in computer science. Here are several strategies you can implement in Bun applications.

### Pattern-Based Invalidation

This approach allows you to invalidate multiple cache entries matching a pattern:

```typescript
// cache-invalidation.ts - Pattern-based cache invalidation
class InvalidatableCache<T> {
  private cache: Map<string, T>;
  private tags: Map<string, Set<string>>; // tag -> keys mapping

  constructor() {
    this.cache = new Map();
    this.tags = new Map();
  }

  // Set a value with associated tags for grouped invalidation
  set(key: string, value: T, tags: string[] = []): void {
    this.cache.set(key, value);

    // Associate key with each tag
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    }
  }

  get(key: string): T | undefined {
    return this.cache.get(key);
  }

  // Invalidate all entries with a specific tag
  invalidateByTag(tag: string): number {
    const keys = this.tags.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) count++;
    }

    this.tags.delete(tag);
    return count;
  }

  // Invalidate entries matching a key pattern (glob-like)
  invalidateByPattern(pattern: string): number {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );

    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }
}

// Usage example
const productCache = new InvalidatableCache<{ name: string; price: number }>();

productCache.set("product:1", { name: "Widget", price: 9.99 }, ["products", "category:electronics"]);
productCache.set("product:2", { name: "Gadget", price: 19.99 }, ["products", "category:electronics"]);
productCache.set("product:3", { name: "Book", price: 14.99 }, ["products", "category:books"]);

// Invalidate all electronics
productCache.invalidateByTag("category:electronics"); // Removes product:1 and product:2

// Invalidate by pattern
productCache.invalidateByPattern("product:*"); // Removes all products
```

## HTTP Caching Headers in Bun

When building HTTP servers with Bun, proper caching headers are essential for client-side and CDN caching.

This example shows how to set appropriate cache headers for different types of responses:

```typescript
// http-caching.ts - HTTP caching headers in Bun server
const CACHE_DURATIONS = {
  static: 31536000, // 1 year for static assets
  api: 60, // 1 minute for API responses
  html: 0, // No cache for HTML pages
};

function getCacheHeaders(
  type: keyof typeof CACHE_DURATIONS,
  options?: { private?: boolean; mustRevalidate?: boolean }
): Record<string, string> {
  const maxAge = CACHE_DURATIONS[type];
  const directives: string[] = [];

  if (options?.private) {
    directives.push("private");
  } else {
    directives.push("public");
  }

  directives.push(`max-age=${maxAge}`);

  if (options?.mustRevalidate) {
    directives.push("must-revalidate");
  }

  if (maxAge === 0) {
    directives.push("no-store");
  }

  return {
    "Cache-Control": directives.join(", "),
  };
}

// Generate ETag for content-based caching
async function generateETag(content: string | ArrayBuffer): Promise<string> {
  const data = typeof content === "string" ? new TextEncoder().encode(content) : content;
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `"${hashHex.substring(0, 16)}"`;
}

// Bun server with caching headers
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Static asset with long-term caching
    if (url.pathname.startsWith("/static/")) {
      const content = await Bun.file(`./public${url.pathname}`).text();
      const etag = await generateETag(content);

      // Check if client has valid cached version
      if (req.headers.get("If-None-Match") === etag) {
        return new Response(null, { status: 304 });
      }

      return new Response(content, {
        headers: {
          ...getCacheHeaders("static"),
          ETag: etag,
        },
      });
    }

    // API response with short caching
    if (url.pathname.startsWith("/api/")) {
      const data = { timestamp: Date.now(), message: "Hello" };
      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          ...getCacheHeaders("api", { mustRevalidate: true }),
        },
      });
    }

    // HTML with no caching
    return new Response("<html><body>Hello World</body></html>", {
      headers: {
        "Content-Type": "text/html",
        ...getCacheHeaders("html"),
      },
    });
  },
});
```

## Caching Patterns

### Cache-Aside Pattern

The cache-aside pattern is the most common caching strategy. The application checks the cache first, and if the data is not found, it fetches from the source and populates the cache.

Here is a practical implementation with a database-like data source:

```typescript
// cache-aside.ts - Cache-aside pattern implementation
interface User {
  id: string;
  name: string;
  email: string;
}

// Simulated database
const database = {
  async getUser(id: string): Promise<User | null> {
    // Simulate database latency
    await Bun.sleep(100);
    return { id, name: `User ${id}`, email: `user${id}@example.com` };
  },
};

class UserService {
  private cache: LRUTTLCache<User>;

  constructor() {
    this.cache = new LRUTTLCache<User>(1000, 300000); // 1000 items, 5 min TTL
  }

  // Cache-aside: check cache first, then fetch from source
  async getUser(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`;

    // Try cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT for ${cacheKey}`);
      return cached;
    }

    console.log(`Cache MISS for ${cacheKey}`);

    // Fetch from database
    const user = await database.getUser(id);
    if (user) {
      // Populate cache for future requests
      this.cache.set(cacheKey, user);
    }

    return user;
  }

  // Invalidate when user is updated
  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    // Update database first
    // await database.updateUser(id, updates);

    // Invalidate cache entry
    this.cache.delete(`user:${id}`);
  }
}
```

### Write-Through Pattern

The write-through pattern ensures cache consistency by updating both the cache and the data source in a single operation.

This implementation guarantees that the cache always has the latest data:

```typescript
// write-through.ts - Write-through caching pattern
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

// Simulated database operations
const productDB = {
  async save(product: Product): Promise<void> {
    await Bun.sleep(50); // Simulate write latency
    console.log(`Saved to database: ${product.id}`);
  },
  async get(id: string): Promise<Product | null> {
    await Bun.sleep(100);
    return null; // Simulate not found for demo
  },
};

class ProductService {
  private cache: Map<string, Product>;

  constructor() {
    this.cache = new Map();
  }

  // Write-through: update cache and database together
  async saveProduct(product: Product): Promise<void> {
    const cacheKey = `product:${product.id}`;

    // Write to database first (ensures durability)
    await productDB.save(product);

    // Update cache immediately after successful write
    this.cache.set(cacheKey, product);

    console.log(`Cache updated for ${cacheKey}`);
  }

  // Read with cache-aside for consistency
  async getProduct(id: string): Promise<Product | null> {
    const cacheKey = `product:${id}`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const product = await productDB.get(id);
    if (product) {
      this.cache.set(cacheKey, product);
    }

    return product;
  }

  // Batch write-through for multiple products
  async saveProducts(products: Product[]): Promise<void> {
    // Use Promise.all for parallel database writes
    await Promise.all(products.map((p) => productDB.save(p)));

    // Update cache after all writes succeed
    for (const product of products) {
      this.cache.set(`product:${product.id}`, product);
    }
  }
}
```

## Performance Benchmarks

Understanding the performance characteristics of different caching approaches helps you make informed decisions.

This benchmark script compares various cache operations:

```typescript
// benchmark.ts - Cache performance benchmarks
async function benchmark(name: string, iterations: number, fn: () => void): Promise<void> {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const duration = performance.now() - start;
  const opsPerSecond = Math.round(iterations / (duration / 1000));

  console.log(`${name}: ${duration.toFixed(2)}ms for ${iterations} ops (${opsPerSecond.toLocaleString()} ops/sec)`);
}

async function runBenchmarks(): Promise<void> {
  const iterations = 1000000;

  // Simple Map cache
  const mapCache = new Map<string, string>();
  await benchmark("Map SET", iterations, () => {
    mapCache.set(`key:${Math.random()}`, "value");
  });

  mapCache.clear();
  for (let i = 0; i < 10000; i++) {
    mapCache.set(`key:${i}`, `value:${i}`);
  }

  await benchmark("Map GET (hit)", iterations, () => {
    mapCache.get("key:5000");
  });

  await benchmark("Map GET (miss)", iterations, () => {
    mapCache.get("nonexistent");
  });

  // LRU Cache
  const lruCache = new LRUCache<string>(10000);
  await benchmark("LRU SET", iterations, () => {
    lruCache.set(`key:${Math.random()}`, "value");
  });

  for (let i = 0; i < 10000; i++) {
    lruCache.set(`key:${i}`, `value:${i}`);
  }

  await benchmark("LRU GET (hit)", iterations, () => {
    lruCache.get("key:5000");
  });

  // TTL Cache
  const ttlCache = new TTLCache<string>(60000);
  await benchmark("TTL SET", iterations, () => {
    ttlCache.set(`key:${Math.random()}`, "value");
  });

  for (let i = 0; i < 10000; i++) {
    ttlCache.set(`key:${i}`, `value:${i}`);
  }

  await benchmark("TTL GET (hit)", iterations, () => {
    ttlCache.get("key:5000");
  });

  console.log("\nBenchmark complete!");
}

runBenchmarks();
```

Typical results on modern hardware show:
- Map operations: 10-20 million ops/sec
- LRU operations: 2-5 million ops/sec
- TTL operations: 5-10 million ops/sec

The overhead of LRU and TTL management is minimal for most applications, and the benefits of bounded memory and automatic expiration far outweigh the performance cost.

## Best Practices Summary

1. **Choose the right cache type**: Use simple Map for static data, LRU for bounded memory, TTL for time-sensitive data, or combine them for production workloads.

2. **Set appropriate TTL values**: Shorter TTLs for frequently changing data, longer TTLs for stable data. Consider your data freshness requirements carefully.

3. **Implement cache warming**: Pre-populate caches during application startup for frequently accessed data to avoid cold-start latency.

4. **Use cache tags for invalidation**: Group related cache entries with tags to simplify bulk invalidation when underlying data changes.

5. **Monitor cache metrics**: Track hit rates, miss rates, and eviction counts to optimize cache size and TTL values.

6. **Handle cache failures gracefully**: Always have a fallback to the original data source when cache operations fail.

7. **Use appropriate HTTP headers**: Set Cache-Control, ETag, and Last-Modified headers for browser and CDN caching.

8. **Avoid thundering herd**: Implement request coalescing or cache locks when multiple requests try to populate the same cache entry simultaneously.

9. **Consider memory limits**: Set maximum cache sizes based on available memory and monitor usage in production.

10. **Test cache behavior**: Write tests that verify cache hits, misses, expiration, and invalidation work correctly.

## Conclusion

Implementing effective caching in Bun applications requires understanding both the available patterns and your specific use case requirements. Start with simple in-memory caching using Map for straightforward scenarios. As your application grows, add LRU eviction to bound memory usage and TTL expiration to ensure data freshness.

The cache-aside pattern works well for read-heavy workloads where eventual consistency is acceptable. For applications requiring strong consistency, the write-through pattern ensures cache and database remain synchronized at the cost of slightly higher write latency.

Remember that caching introduces complexity. Each cache layer adds potential for stale data, increased memory usage, and debugging challenges. Always measure the performance impact of your caching strategy and adjust based on real-world metrics.

Bun's exceptional JavaScript performance makes it an ideal runtime for building high-throughput cached applications. Combined with the patterns and techniques covered in this guide, you can build applications that handle millions of requests efficiently while maintaining reasonable resource usage.
