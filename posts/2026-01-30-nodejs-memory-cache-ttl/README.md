# How to Create Memory Cache with TTL in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Caching, Performance, Memory

Description: Build an in-memory cache with time-to-live expiration in Node.js, covering LRU eviction, size limits, and practical use cases for API response caching.

---

Caching is one of the most effective ways to improve application performance. Instead of repeatedly fetching data from a database or external API, you store frequently accessed data in memory for quick retrieval. In this post, we will build a production-ready in-memory cache with TTL (Time-To-Live) expiration from scratch using Node.js.

## Why Build Your Own Cache?

While libraries like `node-cache` and `lru-cache` exist, building your own cache helps you:

- Understand the internals of caching mechanisms
- Customize behavior for specific use cases
- Reduce dependencies in lightweight applications
- Learn data structures like Maps and doubly linked lists

## Starting Simple: A Basic Map-Based Cache

Let's start with the simplest possible cache using JavaScript's built-in `Map` object.

```javascript
// basic-cache.js
// A minimal cache implementation using Map

class BasicCache {
  constructor() {
    this.cache = new Map();
  }

  // Store a value with a given key
  set(key, value) {
    this.cache.set(key, value);
  }

  // Retrieve a value by key, returns undefined if not found
  get(key) {
    return this.cache.get(key);
  }

  // Check if a key exists in the cache
  has(key) {
    return this.cache.has(key);
  }

  // Remove a specific key from the cache
  delete(key) {
    return this.cache.delete(key);
  }

  // Clear all entries from the cache
  clear() {
    this.cache.clear();
  }

  // Get the number of items in the cache
  get size() {
    return this.cache.size;
  }
}

// Usage example
const cache = new BasicCache();
cache.set('user:123', { name: 'John', email: 'john@example.com' });
console.log(cache.get('user:123')); // { name: 'John', email: 'john@example.com' }
```

This works, but cached items never expire. If you cache API responses, stale data will persist forever.

## Adding TTL (Time-To-Live) Expiration

TTL ensures cached items automatically expire after a specified duration. We will store the expiration timestamp alongside each value.

```javascript
// ttl-cache.js
// Cache with automatic expiration based on TTL

class TTLCache {
  constructor(defaultTTL = 60000) {
    // Default TTL is 60 seconds (in milliseconds)
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  // Store a value with optional custom TTL
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expiresAt
    });
  }

  // Retrieve a value, checking if it has expired
  get(key) {
    const item = this.cache.get(key);

    // Key does not exist
    if (!item) {
      return undefined;
    }

    // Check if the item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  // Check if a key exists and is not expired
  has(key) {
    return this.get(key) !== undefined;
  }

  // Remove a specific key
  delete(key) {
    return this.cache.delete(key);
  }

  // Clear all entries
  clear() {
    this.cache.clear();
  }

  // Get remaining TTL for a key in milliseconds
  getTTL(key) {
    const item = this.cache.get(key);
    if (!item) {
      return -1;
    }

    const remaining = item.expiresAt - Date.now();
    return remaining > 0 ? remaining : -1;
  }

  // Refresh the TTL for an existing key
  touch(key, ttl = this.defaultTTL) {
    const item = this.cache.get(key);
    if (item && Date.now() <= item.expiresAt) {
      item.expiresAt = Date.now() + ttl;
      return true;
    }
    return false;
  }
}

// Usage example
const cache = new TTLCache(5000); // 5 second default TTL

cache.set('session:abc', { userId: 123 });
console.log(cache.get('session:abc')); // { userId: 123 }

// After 5 seconds
setTimeout(() => {
  console.log(cache.get('session:abc')); // undefined (expired)
}, 6000);
```

## Automatic Cleanup of Expired Entries

The above implementation uses lazy deletion, meaning expired items are only removed when accessed. For long-running applications, you might want proactive cleanup to free memory.

```javascript
// auto-cleanup-cache.js
// TTL cache with automatic background cleanup

class AutoCleanupCache {
  constructor(defaultTTL = 60000, cleanupInterval = 30000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = cleanupInterval;
    this.cleanupTimer = null;

    // Start the cleanup interval
    this.startCleanup();
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  // Remove all expired entries from the cache
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Start the automatic cleanup interval
  startCleanup() {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    // Allow the Node.js process to exit even if the timer is running
    this.cleanupTimer.unref();
  }

  // Stop the automatic cleanup
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // Properly dispose of the cache
  destroy() {
    this.stopCleanup();
    this.cache.clear();
  }
}
```

## Implementing LRU (Least Recently Used) Eviction

When your cache has a size limit, you need a strategy to decide which items to remove. LRU eviction removes the least recently accessed items first. We will implement this using a combination of a Map and a doubly linked list.

```javascript
// lru-cache.js
// LRU cache with TTL support and size limits

class LRUNode {
  constructor(key, value, expiresAt) {
    this.key = key;
    this.value = value;
    this.expiresAt = expiresAt;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 60000;

    // Map for O(1) key lookup
    this.cache = new Map();

    // Doubly linked list head and tail for LRU tracking
    // Head = most recently used, Tail = least recently used
    this.head = null;
    this.tail = null;
  }

  // Move a node to the head of the list (most recently used)
  _moveToHead(node) {
    if (node === this.head) return;

    // Remove node from current position
    this._removeNode(node);

    // Add to head
    this._addToHead(node);
  }

  // Add a node to the head of the list
  _addToHead(node) {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  // Remove a node from the list
  _removeNode(node) {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  // Remove the least recently used item (tail)
  _evictLRU() {
    if (!this.tail) return null;

    const evicted = this.tail;
    this.cache.delete(evicted.key);
    this._removeNode(evicted);

    return evicted;
  }

  // Store a value with optional custom TTL
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;

    // If key exists, update it
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      node.expiresAt = expiresAt;
      this._moveToHead(node);
      return;
    }

    // Create new node
    const node = new LRUNode(key, value, expiresAt);

    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this._evictLRU();
    }

    // Add to cache and list
    this.cache.set(key, node);
    this._addToHead(node);
  }

  // Retrieve a value and update its position (mark as recently used)
  get(key) {
    const node = this.cache.get(key);

    if (!node) return undefined;

    // Check expiration
    if (Date.now() > node.expiresAt) {
      this.delete(key);
      return undefined;
    }

    // Move to head (most recently used)
    this._moveToHead(node);

    return node.value;
  }

  // Peek at a value without updating its LRU position
  peek(key) {
    const node = this.cache.get(key);

    if (!node) return undefined;

    if (Date.now() > node.expiresAt) {
      this.delete(key);
      return undefined;
    }

    return node.value;
  }

  // Remove a specific key
  delete(key) {
    const node = this.cache.get(key);
    if (!node) return false;

    this.cache.delete(key);
    this._removeNode(node);
    return true;
  }

  // Clear all entries
  clear() {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  // Get current cache size
  get size() {
    return this.cache.size;
  }

  // Get all keys in LRU order (most recent first)
  keys() {
    const keys = [];
    let current = this.head;

    while (current) {
      keys.push(current.key);
      current = current.next;
    }

    return keys;
  }
}

// Usage example
const cache = new LRUCache({ maxSize: 3, defaultTTL: 60000 });

cache.set('a', 1);
cache.set('b', 2);
cache.set('c', 3);
console.log(cache.keys()); // ['c', 'b', 'a']

cache.get('a'); // Access 'a', moves it to head
console.log(cache.keys()); // ['a', 'c', 'b']

cache.set('d', 4); // Evicts 'b' (least recently used)
console.log(cache.keys()); // ['d', 'a', 'c']
```

## Adding Cache Statistics

For monitoring and debugging, tracking cache statistics is helpful.

```javascript
// cache-with-stats.js
// Extended cache with hit/miss tracking and statistics

class CacheWithStats {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 60000;
    this.cache = new Map();

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      expirations: 0
    };

    // LRU tracking
    this.head = null;
    this.tail = null;
  }

  _moveToHead(node) {
    if (node === this.head) return;
    this._removeNode(node);
    this._addToHead(node);
  }

  _addToHead(node) {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  _removeNode(node) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
  }

  _evictLRU() {
    if (!this.tail) return null;
    const evicted = this.tail;
    this.cache.delete(evicted.key);
    this._removeNode(evicted);
    this.stats.evictions++;
    return evicted;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.stats.sets++;

    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      node.expiresAt = expiresAt;
      this._moveToHead(node);
      return;
    }

    const node = { key, value, expiresAt, prev: null, next: null };

    if (this.cache.size >= this.maxSize) {
      this._evictLRU();
    }

    this.cache.set(key, node);
    this._addToHead(node);
  }

  get(key) {
    const node = this.cache.get(key);

    if (!node) {
      this.stats.misses++;
      return undefined;
    }

    if (Date.now() > node.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      this.stats.expirations++;
      return undefined;
    }

    this.stats.hits++;
    this._moveToHead(node);
    return node.value;
  }

  delete(key) {
    const node = this.cache.get(key);
    if (!node) return false;
    this.cache.delete(key);
    this._removeNode(node);
    return true;
  }

  clear() {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  // Get cache statistics
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`
    };
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      expirations: 0
    };
  }
}

// Usage example
const cache = new CacheWithStats({ maxSize: 100 });

cache.set('key1', 'value1');
cache.set('key2', 'value2');
cache.get('key1'); // hit
cache.get('key3'); // miss

console.log(cache.getStats());
// {
//   hits: 1,
//   misses: 1,
//   sets: 2,
//   evictions: 0,
//   expirations: 0,
//   size: 2,
//   maxSize: 100,
//   hitRate: '50.00%'
// }
```

## Practical Use Case: API Response Caching

Here is a complete example showing how to use our cache for caching API responses.

```javascript
// api-cache-example.js
// Practical API response caching implementation

const https = require('https');

class APICache {
  constructor(options = {}) {
    this.cache = new CacheWithStats({
      maxSize: options.maxSize || 500,
      defaultTTL: options.defaultTTL || 300000 // 5 minutes default
    });
  }

  // Generate a cache key from request parameters
  _generateKey(url, options = {}) {
    const params = JSON.stringify(options);
    return `${url}:${params}`;
  }

  // Fetch data with caching
  async fetch(url, options = {}) {
    const {
      ttl,
      forceRefresh = false,
      ...fetchOptions
    } = options;

    const cacheKey = this._generateKey(url, fetchOptions);

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        return { data: cached, fromCache: true };
      }
    }

    // Fetch from API
    const data = await this._httpGet(url);

    // Store in cache
    this.cache.set(cacheKey, data, ttl);

    return { data, fromCache: false };
  }

  // Simple HTTP GET implementation
  _httpGet(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      }).on('error', reject);
    });
  }

  getStats() {
    return this.cache.getStats();
  }
}

// Usage example
async function main() {
  const apiCache = new APICache({ defaultTTL: 60000 });

  // First request - fetches from API
  const result1 = await apiCache.fetch('https://jsonplaceholder.typicode.com/posts/1');
  console.log('First request:', result1.fromCache); // false

  // Second request - returns cached data
  const result2 = await apiCache.fetch('https://jsonplaceholder.typicode.com/posts/1');
  console.log('Second request:', result2.fromCache); // true

  // Check stats
  console.log(apiCache.getStats());
}

main().catch(console.error);
```

## Memory Size Limits

For more control, you can limit the cache based on memory size rather than item count.

```javascript
// memory-limited-cache.js
// Cache with memory size limits

class MemoryLimitedCache {
  constructor(options = {}) {
    this.maxBytes = options.maxBytes || 50 * 1024 * 1024; // 50MB default
    this.defaultTTL = options.defaultTTL || 60000;
    this.cache = new Map();
    this.currentBytes = 0;

    // LRU tracking
    this.head = null;
    this.tail = null;
  }

  // Estimate the size of a value in bytes
  _estimateSize(value) {
    const str = JSON.stringify(value);
    // Approximate: 2 bytes per character in JavaScript strings
    return str.length * 2;
  }

  _moveToHead(node) {
    if (node === this.head) return;
    this._removeNode(node);
    this._addToHead(node);
  }

  _addToHead(node) {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  _removeNode(node) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
  }

  _evictLRU() {
    if (!this.tail) return null;
    const evicted = this.tail;
    this.currentBytes -= evicted.size;
    this.cache.delete(evicted.key);
    this._removeNode(evicted);
    return evicted;
  }

  set(key, value, ttl = this.defaultTTL) {
    const size = this._estimateSize(value);
    const expiresAt = Date.now() + ttl;

    // Remove existing entry if present
    if (this.cache.has(key)) {
      const existing = this.cache.get(key);
      this.currentBytes -= existing.size;
      this._removeNode(existing);
    }

    // Evict until we have space
    while (this.currentBytes + size > this.maxBytes && this.tail) {
      this._evictLRU();
    }

    // If single item is larger than max, don't cache it
    if (size > this.maxBytes) {
      console.warn(`Item too large to cache: ${size} bytes`);
      return false;
    }

    const node = { key, value, size, expiresAt, prev: null, next: null };
    this.cache.set(key, node);
    this._addToHead(node);
    this.currentBytes += size;

    return true;
  }

  get(key) {
    const node = this.cache.get(key);
    if (!node) return undefined;

    if (Date.now() > node.expiresAt) {
      this.delete(key);
      return undefined;
    }

    this._moveToHead(node);
    return node.value;
  }

  delete(key) {
    const node = this.cache.get(key);
    if (!node) return false;
    this.currentBytes -= node.size;
    this.cache.delete(key);
    this._removeNode(node);
    return true;
  }

  getMemoryUsage() {
    return {
      used: this.currentBytes,
      max: this.maxBytes,
      percentage: ((this.currentBytes / this.maxBytes) * 100).toFixed(2) + '%'
    };
  }
}
```

## Comparison with Popular Libraries

Here is how our implementation compares to popular caching libraries:

| Feature | Our Implementation | node-cache | lru-cache |
|---------|-------------------|------------|-----------|
| TTL Support | Yes | Yes | Yes |
| LRU Eviction | Yes | No | Yes |
| Size Limits | Yes (count and bytes) | Yes (count) | Yes (count and bytes) |
| Statistics | Yes | Yes | No (built-in) |
| Automatic Cleanup | Yes | Yes | No |
| TypeScript Support | No | Yes | Yes |
| Dependencies | None | None | None |
| Async Support | Manual | Events | Yes |

### When to Use Each

**Use our custom implementation when:**
- You need full control over caching behavior
- You want to minimize dependencies
- You are learning about cache internals
- Your use case has specific requirements not covered by libraries

**Use node-cache when:**
- You need a simple, well-tested solution
- Event-based notifications are important
- You do not need LRU eviction

**Use lru-cache when:**
- You need a battle-tested LRU implementation
- Memory management is critical
- You need advanced features like stale-while-revalidate

## Installing and Using lru-cache

For production applications, consider using the `lru-cache` library:

```bash
npm install lru-cache
```

```javascript
// using-lru-cache.js
// Example using the lru-cache library

const { LRUCache } = require('lru-cache');

const cache = new LRUCache({
  max: 500,                    // Maximum number of items
  maxSize: 5000,               // Maximum total size
  sizeCalculation: (value) => {
    return JSON.stringify(value).length;
  },
  ttl: 1000 * 60 * 5,          // 5 minutes TTL
  allowStale: false,           // Return undefined for stale items
  updateAgeOnGet: false,       // Do not reset TTL on get
  updateAgeOnHas: false,       // Do not reset TTL on has
});

// Basic usage
cache.set('user:1', { name: 'Alice', role: 'admin' });
console.log(cache.get('user:1'));

// Check remaining TTL
console.log(cache.getRemainingTTL('user:1'));

// Get cache info
console.log('Size:', cache.size);
console.log('Calculated size:', cache.calculatedSize);
```

## Best Practices

1. **Choose appropriate TTL values**: Balance freshness against performance. Frequently changing data needs shorter TTLs.

2. **Monitor cache statistics**: Track hit rates to ensure your cache is effective. A low hit rate might indicate poor key design or TTL settings.

3. **Handle cache failures gracefully**: Always have a fallback to fetch fresh data if the cache fails.

4. **Use consistent key naming**: Adopt a naming convention like `entity:id:field` for predictable cache keys.

5. **Consider cache warming**: Pre-populate the cache with frequently accessed data on application startup.

6. **Implement proper cleanup**: For long-running applications, ensure expired items are eventually removed to prevent memory leaks.

```javascript
// cache-wrapper.js
// Production-ready cache wrapper with error handling

class ProductionCache {
  constructor(cache, fallback) {
    this.cache = cache;
    this.fallback = fallback;
  }

  async get(key, fetchFn, options = {}) {
    try {
      // Try cache first
      const cached = this.cache.get(key);
      if (cached !== undefined) {
        return cached;
      }

      // Fetch fresh data
      const data = await fetchFn();

      // Store in cache
      this.cache.set(key, data, options.ttl);

      return data;
    } catch (error) {
      console.error(`Cache error for key ${key}:`, error);

      // Fallback: try to fetch fresh data
      return fetchFn();
    }
  }
}
```

## Conclusion

Building a memory cache with TTL in Node.js is straightforward once you understand the core concepts. We started with a simple Map-based cache, added TTL expiration, implemented LRU eviction for memory management, and added statistics tracking for monitoring.

For production applications, consider using battle-tested libraries like `lru-cache`. However, understanding how caches work internally helps you make better decisions about caching strategies and troubleshoot issues when they arise.

The complete code examples from this post are available and ready to use. Feel free to adapt them to your specific needs or use them as a foundation for more advanced caching solutions.
